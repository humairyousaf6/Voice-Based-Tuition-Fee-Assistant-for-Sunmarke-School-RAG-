import axios from 'axios';

// ElevenLabs voice ID for "Aria" (a stable default voice)
const VOICE_ID = '9BWtsMINqrJLrRacOk9x'; // Aria voice ID

export async function generateSpeech(text: string): Promise<Buffer> {
    try {
        const res = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            },
            {
                headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
                responseType: 'arraybuffer'
            }
        );
        return Buffer.from(res.data);
    } catch (e: any) {
        console.error('TTS Error:', e.message);
        // Return empty buffer on error so the response still works
        return Buffer.alloc(0);
    }
}
