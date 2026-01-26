import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export async function transcribe(audioBuffer: Buffer): Promise<string> {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
            model: 'nova-2',
            language: "en",
            smart_format: true,
            mimetype: 'audio/wav',
        }
    );

    if (error) {
        console.error("Deepgram Error:", error);
        throw error;
    }

    // result.results.channels[0].alternatives[0].transcript
    return result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
}
