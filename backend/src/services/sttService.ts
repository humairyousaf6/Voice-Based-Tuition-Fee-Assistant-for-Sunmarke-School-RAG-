import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export async function transcribe(audioBuffer: Buffer, mimetype?: string): Promise<string> {
    const normalizedMimeType =
        mimetype && mimetype !== 'application/octet-stream'
            ? mimetype
            : 'audio/webm';

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
            model: 'nova-2',
            language: "en",
            smart_format: true,
            mimetype: normalizedMimeType,
        }
    );

    if (error) {
        console.error("Deepgram Error:", error);
        throw error;
    }

    // result.results.channels[0].alternatives[0].transcript
    return result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
}
