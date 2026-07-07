import express from 'express';
import multer from 'multer';
import { searchWithRAG } from '../services/langchainService';
import { callAllLLMs, callGemini } from '../services/llmService';
import { generateSpeech } from '../services/ttsService';
import { transcribe } from '../services/sttService';
import { prisma } from '../index';

const router = express.Router();
const upload = multer();
const VALID_MODELS = new Set(['gemini', 'kimi', 'deepseek']);

function getServiceErrorMessage(error: unknown, fallback: string) {
    const message = String((error as any)?.message || error || '');

    if (message.includes('certificate') || message.includes('UNABLE_TO_VERIFY')) {
        return 'Secure connection to an AI service failed';
    }

    if (message.includes('401') || message.includes('403')) {
        return 'One of the AI service keys was rejected';
    }

    return fallback;
}

const handleAudioUpload = (req: any, res: any, next: any) => {
    upload.single('audio')(req, res, (error: any) => {
        if (error) {
            return res.status(400).json({ error: 'Invalid audio upload' });
        }

        next();
    });
};

router.post('/transcribe', handleAudioUpload, async (req: any, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }
        const transcript = await transcribe(req.file.buffer, req.file.mimetype);

        if (!transcript.trim()) {
            return res.status(422).json({ error: 'No speech detected in the recording' });
        }

        res.json({ transcript });
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: getServiceErrorMessage(error, 'Transcription failed') });
    }
});

router.post('/query/:model', async (req, res) => {
    try {
        const { query } = req.body;
        const { model } = req.params;

        if (!VALID_MODELS.has(model)) {
            return res.status(400).json({ error: 'Invalid model' });
        }

        if (typeof query !== 'string' || !query.trim()) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // 1. RAG Search using LangChain (shared context)
        const { context } = await searchWithRAG(query);

        let modelResult = { text: '', model: '' };

        // 2. Call specific LLM
        if (model === 'gemini') {
            modelResult = await callGemini(context, query);
        } else if (model === 'kimi') {
            const { callKimi } = await import('../services/llmService');
            modelResult = await callKimi(context, query);
        } else if (model === 'deepseek') {
            const { callDeepseek } = await import('../services/llmService');
            modelResult = await callDeepseek(context, query);
        }

        // 3. Generate speech
        const speech = await generateSpeech(modelResult.text);

        res.json({
            text: modelResult.text,
            modelUsed: modelResult.model,
            audio: speech.audio.toString('base64'),
            audioMimeType: speech.mimeType,
        });
    } catch (error) {
        console.error(`Query failed for model ${req.params.model}:`, error);
        res.status(500).json({ error: getServiceErrorMessage(error, 'Query failed') });
    }
});

router.post('/query', async (req, res) => {
    try {
        const { query } = req.body;

        if (typeof query !== 'string' || !query.trim()) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // 1. RAG Search using LangChain
        const { context } = await searchWithRAG(query);

        // 2. Call 3 LLMs in parallel
        const [geminiRes, kimiRes, deepseekRes] = await callAllLLMs(context, query);

        // 3. Generate speech for all responses
        const [geminiSpeech, kimiSpeech, deepseekSpeech] = await Promise.all([
            generateSpeech(geminiRes.text),
            generateSpeech(kimiRes.text),
            generateSpeech(deepseekRes.text)
        ]);

        // 4. Store in database (optional, non-blocking)
        try {
            await prisma.userQuery.create({
                data: {
                    userInput: query,
                    geminResponse: geminiRes.text,
                    kimiResponse: kimiRes.text,
                    deepseekResp: deepseekRes.text
                }
            });
        } catch (dbError) {
            console.warn('Database logging failed (non-critical):', dbError);
        }

        res.json({
            responses: {
                gemini: { text: geminiRes.text, modelUsed: geminiRes.model, audio: geminiSpeech.audio.toString('base64'), audioMimeType: geminiSpeech.mimeType },
                kimi: { text: kimiRes.text, modelUsed: kimiRes.model, audio: kimiSpeech.audio.toString('base64'), audioMimeType: kimiSpeech.mimeType },
                deepseek: { text: deepseekRes.text, modelUsed: deepseekRes.model, audio: deepseekSpeech.audio.toString('base64'), audioMimeType: deepseekSpeech.mimeType }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: getServiceErrorMessage(error, 'Query failed') });
    }
});

export default router;
