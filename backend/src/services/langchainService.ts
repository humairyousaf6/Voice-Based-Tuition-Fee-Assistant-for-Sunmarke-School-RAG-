import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { QdrantVectorStore } from '@langchain/qdrant';
import { prisma } from '../index';

// Initialize embeddings (OpenRouter - free tier)
export const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENROUTER_API_KEY1,
    modelName: "openai/text-embedding-3-small",
    configuration: {
        baseURL: "https://openrouter.ai/api/v1"
    }
});

// Load and process website content
export async function loadWebsiteContent() {
    try {
        const urls = [
            'https://www.sunmarke.com/admissions/tuition-fees/',
        ];

        let allChunks: any[] = [];

        for (const url of urls) {
            console.log(`Loading ${url}...`);
            const loader = new CheerioWebBaseLoader(url);
            const docs = await loader.load();

            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });
            const chunks = await splitter.splitDocuments(docs);
            allChunks = [...allChunks, ...chunks];
        }

        // 3. Create embeddings using LangChain and store in Qdrant
        const vectorStore = await QdrantVectorStore.fromDocuments(
            allChunks,
            embeddings,
            {
                url: process.env.QDRANT_URL,
                apiKey: process.env.QDRANT_API_KEY,
                collectionName: process.env.QDRANT_COLLECTION || "sunmarke-content",
            }
        );

        // 4. Store metadata in PostgreSQL (optional, non-blocking)
        try {
            for (const chunk of allChunks) {
                await prisma.contentChunk.create({
                    data: {
                        content: chunk.pageContent,
                        source: chunk.metadata.source || 'Sunmarke Website',
                        embedding: [],
                        metadata: chunk.metadata
                    }
                });
            }
        } catch (dbError) {
            console.warn('PostgreSQL storage failed (non-critical):', dbError);
        }

        return `Loaded ${allChunks.length} chunks from ${urls.length} pages`;
    } catch (error) {
        console.error('Failed to load website:', error);
        throw error;
    }
}

// Search similar content using RAG
export async function searchWithRAG(query: string) {
    try {
        const vectorStore = await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
                url: process.env.QDRANT_URL,
                apiKey: process.env.QDRANT_API_KEY,
                collectionName: process.env.QDRANT_COLLECTION || "sunmarke-content",
            }
        );

        // Similarity search
        const results = await vectorStore.similaritySearch(query, 5);

        // Build context from results
        const context = results
            .map(doc => `Source: ${doc.metadata.source}\n${doc.pageContent}`)
            .join('\n\n---\n\n');

        return { context, documents: results };
    } catch (error) {
        console.error('RAG search failed:', error);
        throw error;
    }
}
