import { Embeddings } from '@langchain/core/embeddings';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { JinaEmbeddings } from '@langchain/community/embeddings/jina';

type EmbeddingBackendConfig = {
    collectionSuffix: string;
    createEmbeddings: () => Embeddings;
    label: string;
};

export type ResolvedEmbeddingBackend = {
    collectionName: string;
    collectionSuffix: string;
    embeddings: Embeddings;
    label: string;
};

const BASE_COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'sunmarke-content';

let availableEmbeddingBackendsPromise: Promise<ResolvedEmbeddingBackend[]> | null = null;

class LocalTransformersEmbeddings extends Embeddings {
    private static extractorPromise: Promise<any> | null = null;

    constructor() {
        super({});
    }

    private async getExtractor() {
        if (!LocalTransformersEmbeddings.extractorPromise) {
            LocalTransformersEmbeddings.extractorPromise = (async () => {
                const { pipeline } = await import('@xenova/transformers');
                return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            })();
        }

        return LocalTransformersEmbeddings.extractorPromise;
    }

    private sanitizeText(text: string) {
        return text.replace(/\n/g, ' ');
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        const extractor = await this.getExtractor();
        const embeddings: number[][] = [];

        for (const document of documents) {
            const output = await extractor(this.sanitizeText(document), {
                pooling: 'mean',
                normalize: true,
            });
            embeddings.push(Array.from(output.data));
        }

        return embeddings;
    }

    async embedQuery(document: string): Promise<number[]> {
        const extractor = await this.getExtractor();
        const output = await extractor(this.sanitizeText(document), {
            pooling: 'mean',
            normalize: true,
        });

        return Array.from(output.data);
    }
}

function getFirstConfiguredEnvValue(names: string[]) {
    for (const name of names) {
        const value = process.env[name]?.trim();
        if (value) {
            return value;
        }
    }

    return undefined;
}

function buildFreeEmbeddingConfigs(): EmbeddingBackendConfig[] {
    const configs: EmbeddingBackendConfig[] = [];
    const googleApiKey = getFirstConfiguredEnvValue([
        'GOOGLE_API_KEY',
        'GEMINI_API_KEY',
        'GOOGLE_GENERATIVE_AI_API_KEY',
    ]);
    const jinaApiKey = getFirstConfiguredEnvValue([
        'JINA_API_KEY',
        'JINA_EMBEDDING_API_KEY',
        'JINA_EMBEDDINGS_API_KEY',
        'JINA_API_TOKEN',
    ]);

    if (googleApiKey) {
        configs.push({
            collectionSuffix: 'gemini-free',
            label: 'gemini-embedding-001',
            createEmbeddings: () =>
                new GoogleGenerativeAIEmbeddings({
                    apiKey: googleApiKey,
                    modelName: 'gemini-embedding-001',
                }),
        });
    }

    if (jinaApiKey) {
        configs.push({
            collectionSuffix: 'jina-free',
            label: 'jina-embeddings-v4',
            createEmbeddings: () =>
                new JinaEmbeddings({
                    apiKey: jinaApiKey,
                    model: 'jina-embeddings-v4',
                    dimensions: 1024,
                }),
        });
    }

    configs.push({
        collectionSuffix: 'local-free',
        label: 'xenova-all-minilm-l6-v2',
        createEmbeddings: () => new LocalTransformersEmbeddings(),
    });

    return configs;
}

export function resetEmbeddingBackendCache() {
    availableEmbeddingBackendsPromise = null;
}

export async function getAvailableFreeEmbeddingBackends(forceRefresh = false): Promise<ResolvedEmbeddingBackend[]> {
    if (forceRefresh) {
        resetEmbeddingBackendCache();
    }

    if (!availableEmbeddingBackendsPromise) {
        availableEmbeddingBackendsPromise = (async () => {
            const configs = buildFreeEmbeddingConfigs();

            if (!configs.length) {
                throw new Error(
                    'No free embedding provider configured. Set GOOGLE_API_KEY or GEMINI_API_KEY, and optionally JINA_API_KEY.'
                );
            }

            const availableBackends: ResolvedEmbeddingBackend[] = [];

            for (const config of configs) {
                const embeddings = config.createEmbeddings();

                try {
                    const probeVector = await embeddings.embedQuery('Sunmarke School tuition fees');

                    if (!probeVector.length) {
                        throw new Error('returned an empty embedding vector');
                    }

                    availableBackends.push({
                        collectionName: `${BASE_COLLECTION_NAME}-${config.collectionSuffix}`,
                        collectionSuffix: config.collectionSuffix,
                        embeddings,
                        label: config.label,
                    });
                } catch (error) {
                    console.warn(`Free embedding backend unavailable: ${config.label}`, error);
                }
            }

            if (!availableBackends.length) {
                throw new Error('No free embedding provider is currently reachable.');
            }

            return availableBackends;
        })().catch((error) => {
            availableEmbeddingBackendsPromise = null;
            throw error;
        });
    }

    return availableEmbeddingBackendsPromise;
}
