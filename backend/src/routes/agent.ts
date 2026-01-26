import express from 'express';
import multer from 'multer';
import { searchWithRAG } from '../services/langchainService';
import { callAllLLMs, callGemini } from '../services/llmService';
import { generateSpeech } from '../services/ttsService';
import { transcribe } from '../services/sttService';
import { prisma } from '../index';

const router = express.Router();
const upload = multer();

router.post('/transcribe', upload.single('audio'), async (req: any, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }
        const transcript = await transcribe(req.file.buffer);
        res.json({ transcript });
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: 'Transcription failed' });
    }
});

router.post('/query/:model', async (req, res) => {
    try {
        const { query } = req.body;
        const { model } = req.params;

        // 1. RAG Search using LangChain (shared context)
        const { context } = await searchWithRAG(query);

        let textResponse = '';

        // 2. Call specific LLM
        if (model === 'gemini') {
            textResponse = await callGemini(context, query);
        } else if (model === 'kimi') {
            const { callKimi } = await import('../services/llmService');
            textResponse = await callKimi(context, query);
        } else if (model === 'deepseek') {
            const { callDeepseek } = await import('../services/llmService');
            textResponse = await callDeepseek(context, query);
        } else {
            return res.status(400).json({ error: 'Invalid model' });
        }

        // 3. Generate speech
        const audioBuffer = await generateSpeech(textResponse);

        res.json({
            text: textResponse,
            audio: audioBuffer.toString('base64')
        });
    } catch (error) {
        console.error(`Query failed for model ${req.params.model}:`, error);
        res.status(500).json({ error: 'Query failed' });
    }
});

router.post('/query', async (req, res) => {
    try {
        const { query } = req.body;

        // 1. RAG Search using LangChain
        const { context } = await searchWithRAG(query);

        // 2. Call 3 LLMs in parallel
        const [geminiRes, kimiRes, deepseekRes] = await callAllLLMs(context, query);

        // 3. Generate speech for all responses
        const [geminiAudio, kimiAudio, deepseekAudio] = await Promise.all([
            generateSpeech(geminiRes),
            generateSpeech(kimiRes),
            generateSpeech(deepseekRes)
        ]);

        // 4. Store in database (optional, non-blocking)
        try {
            await prisma.userQuery.create({
                data: {
                    userInput: query,
                    geminResponse: geminiRes,
                    kimiResponse: kimiRes,
                    deepseekResp: deepseekRes
                }
            });
        } catch (dbError) {
            console.warn('Database logging failed (non-critical):', dbError);
        }

        res.json({
            responses: {
                gemini: { text: geminiRes, audio: geminiAudio.toString('base64') },
                kimi: { text: kimiRes, audio: kimiAudio.toString('base64') },
                deepseek: { text: deepseekRes, audio: deepseekAudio.toString('base64') }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Query failed' });
    }
});

export default router;
