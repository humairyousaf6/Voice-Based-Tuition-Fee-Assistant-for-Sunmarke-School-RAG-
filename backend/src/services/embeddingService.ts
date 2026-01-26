import { embeddings } from './langchainService';

export async function getEmbedding(text: string): Promise<number[]> {
    try {
        return await embeddings.embedQuery(text);
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
}
