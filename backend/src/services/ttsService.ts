import axios from 'axios';
import { httpsAgent } from '../config/network';

// ElevenLabs voice ID for "Aria" (a stable default voice)
const VOICE_ID = '9BWtsMINqrJLrRacOk9x'; // Aria voice ID
const AUDIO_MIME_TYPE = 'audio/mpeg';

export async function generateSpeech(text: string): Promise<{ audio: Buffer; mimeType: string }> {
    try {
        const res = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                text,
                model_id: 'eleven_multilingual_v2',
                output_format: 'mp3_44100_128',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            },
            {
                headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
                responseType: 'arraybuffer',
                httpsAgent,
            }
        );
        return {
            audio: Buffer.from(res.data),
            mimeType: AUDIO_MIME_TYPE,
        };
    } catch (e: any) {
        console.error('TTS Error:', e.message);
        // Return empty buffer on error so the response still works
        return {
            audio: Buffer.alloc(0),
            mimeType: AUDIO_MIME_TYPE,
        };
    }
}
