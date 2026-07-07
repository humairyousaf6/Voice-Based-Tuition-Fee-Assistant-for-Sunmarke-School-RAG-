import axios from 'axios';
import * as cheerio from 'cheerio';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { QdrantVectorStore } from '@langchain/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { AnyNode } from 'domhandler';
import { prisma } from '../index';
import { httpsAgent } from '../config/network';
import {
    getAvailableFreeEmbeddingBackends,
    resetEmbeddingBackendCache,
    type ResolvedEmbeddingBackend,
} from './embeddingService';

const SOURCE_URLS = [
    'https://www.sunmarke.com/admissions/tuition-fees/',
];

const qdrantUrl = new URL(process.env.QDRANT_URL!);
const qdrantPrefix = qdrantUrl.pathname !== '/' ? qdrantUrl.pathname : undefined;

let knowledgeBaseReadyPromise: Promise<{ chunkCount: number; embeddingBackends: string[] }> | null = null;
let cachedChunks: Document[] = [];
let activeKnowledgeStore: 'qdrant' | 'local' = 'local';
let activeEmbeddingBackends: ResolvedEmbeddingBackend[] = [];

type TuitionFeeRow = {
    yearGroup: string;
    ageRange: string;
    annualFee: string;
    term1Fee: string;
    term2Fee: string;
    term3Fee: string;
};

type StructuredSectionConfig = {
    heading: string;
    label: string;
    summaryPrefix: string;
};

const qdrantClient = new QdrantClient({
    host: qdrantUrl.hostname,
    port: qdrantUrl.port ? Number(qdrantUrl.port) : qdrantUrl.protocol === 'https:' ? 443 : 80,
    apiKey: process.env.QDRANT_API_KEY,
    https: qdrantUrl.protocol === 'https:',
    prefix: qdrantPrefix,
    checkCompatibility: false,
});

function normalizeText(text: string) {
    return text
        .replace(/\u00a0/g, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

function buildDocument(pageContent: string, metadata: Record<string, unknown>) {
    return new Document({
        pageContent: normalizeText(pageContent),
        metadata,
    });
}

function extractTableCells($: cheerio.CheerioAPI, row: AnyNode) {
    return $(row)
        .find('th,td')
        .map((_, cell) => normalizeText($(cell).text()))
        .get()
        .filter(Boolean);
}

function extractTuitionFeeRows($: cheerio.CheerioAPI) {
    const tuitionTable = $('table')
        .filter((_, table) => {
            const headers = extractTableCells($, table).join(' ');
            return headers.includes('Sunmarke School Tuition Fees for 2026');
        })
        .first();

    if (!tuitionTable.length) {
        return [] as TuitionFeeRow[];
    }

    return tuitionTable
        .find('tr')
        .slice(1)
        .map((_, row) => {
            const cells = extractTableCells($, row);

            if (cells.length < 6) {
                return null;
            }

            return {
                yearGroup: cells[0],
                ageRange: cells[1],
                annualFee: cells[2],
                term1Fee: cells[3],
                term2Fee: cells[4],
                term3Fee: cells[5],
            } satisfies TuitionFeeRow;
        })
        .get()
        .filter((row): row is TuitionFeeRow => Boolean(row));
}

function extractSectionText($: cheerio.CheerioAPI, headingText: string) {
    const heading = $('h1,h2,h3,h4,strong')
        .filter((_, element) => normalizeText($(element).text()) === headingText)
        .first();

    if (!heading.length) {
        return '';
    }

    const parts: string[] = [];
    let current = (heading.parent().length ? heading.parent() : heading).next();

    while (current.length) {
        const tagName = String(current.get(0)?.tagName || '').toLowerCase();
        if (/^h[1-6]$/.test(tagName)) {
            break;
        }

        const text = normalizeText(current.text());
        if (text) {
            parts.push(text);
        }

        if (parts.length >= 6) {
            break;
        }

        current = current.next();
    }

    return normalizeText(parts.join(' '));
}

function extractPaymentDetailsText($: cheerio.CheerioAPI) {
    const paymentTable = $('table')
        .filter((_, table) => {
            const firstRow = $(table).find('tr').first().text();
            return normalizeText(firstRow).includes('School Account Details');
        })
        .first();

    if (!paymentTable.length) {
        return '';
    }

    const details = paymentTable
        .find('tr')
        .map((_, row) => {
            const cells = extractTableCells($, row);
            if (!cells.length) {
                return null;
            }

            if (cells.length === 1) {
                return cells[0];
            }

            return `${cells[0]}: ${cells.slice(1).join(' | ')}`;
        })
        .get()
        .filter(Boolean);

    return normalizeText(details.join('\n'));
}

function extractStructuredWebsiteDocuments($: cheerio.CheerioAPI, url: string, pageTitle: string) {
    const documents: Document[] = [];
    const tuitionRows = extractTuitionFeeRows($);

    if (tuitionRows.length) {
        const scheduleLines = tuitionRows.map((row) =>
            `${row.yearGroup} (ages ${row.ageRange}): annual tuition fee AED ${row.annualFee}; Term 1 AED ${row.term1Fee}; Term 2 AED ${row.term2Fee}; Term 3 AED ${row.term3Fee}.`
        );

        documents.push(
            buildDocument(
                `Sunmarke School tuition fees for 2026-2027 vary by year group. ${scheduleLines.join('\n')}`,
                {
                    source: url,
                    title: 'Sunmarke tuition fee overview 2026-2027',
                    contentType: 'tuition-fee-overview',
                }
            )
        );

        for (const row of tuitionRows) {
            documents.push(
                buildDocument(
                    `For Sunmarke School in 2026-2027, the annual tuition fee for ${row.yearGroup} (ages ${row.ageRange}) is AED ${row.annualFee}. Term 1 fee is AED ${row.term1Fee}. Term 2 fee is AED ${row.term2Fee}. Term 3 fee is AED ${row.term3Fee}. Source: official tuition fees page.`,
                    {
                        source: url,
                        title: `Sunmarke tuition fee ${row.yearGroup}`,
                        contentType: 'tuition-fee-row',
                        yearGroup: row.yearGroup,
                        ageRange: row.ageRange,
                    }
                )
            );
        }
    }

    const sectionConfigs: StructuredSectionConfig[] = [
        {
            heading: 'Application & Assessment Fee:',
            label: 'application-assessment-fee',
            summaryPrefix: 'Sunmarke School application and assessment fee for new students',
        },
        {
            heading: 'Acceptance Fee (New Students):',
            label: 'acceptance-fee',
            summaryPrefix: 'Sunmarke School acceptance fee for new students',
        },
        {
            heading: 'Re-enrolment Fees (Existing Students):',
            label: 're-enrolment-fee',
            summaryPrefix: 'Sunmarke School re-enrolment fee for existing students',
        },
    ];

    for (const config of sectionConfigs) {
        const sectionText = extractSectionText($, config.heading);

        if (!sectionText) {
            continue;
        }

        documents.push(
            buildDocument(
                `${config.summaryPrefix}: ${sectionText}`,
                {
                    source: url,
                    title: `Sunmarke ${config.label}`,
                    contentType: config.label,
                }
            )
        );
    }

    const paymentDetails = extractPaymentDetailsText($);
    if (paymentDetails) {
        documents.push(
            buildDocument(
                `Sunmarke School bank details and fee payment information: ${paymentDetails}`,
                {
                    source: url,
                    title: 'Sunmarke fee payment details',
                    contentType: 'payment-details',
                }
            )
        );
    }

    if (!documents.length) {
        return [];
    }

    documents.push(
        buildDocument(
            `This page is the official Sunmarke School tuition-fees source for admissions pricing, enrolment fees, and payment information.`,
            {
                source: url,
                title: pageTitle,
                contentType: 'source-summary',
            }
        )
    );

    return documents;
}

async function fetchWebsiteDocuments(url: string) {
    const response = await axios.get<string>(url, {
        httpsAgent,
        timeout: 45000,
        responseType: 'text',
        headers: {
            Accept: 'text/html,application/xhtml+xml',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
    });

    const $ = cheerio.load(response.data);
    $('script, style, noscript, svg').remove();

    const root = $('main').first().length ? $('main').first() : $('body');
    const pageTitle = $('title').text().trim() || 'Sunmarke Website';
    const text = normalizeText(root.text());

    if (!text) {
        throw new Error(`No readable content extracted from ${url}`);
    }

    return [
        buildDocument(`${pageTitle}\n\n${text}`, {
            source: url,
            title: pageTitle,
            contentType: 'page-text',
        }),
        ...extractStructuredWebsiteDocuments($, url, pageTitle),
    ];
}

async function splitWebsiteDocuments() {
    const nestedDocs = await Promise.all(SOURCE_URLS.map(fetchWebsiteDocuments));
    const docs = nestedDocs.flat();
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    return splitter.splitDocuments(docs);
}

async function hasIndexedContent(collectionName: string) {
    try {
        const collection = await qdrantClient.getCollection(collectionName);
        const count = Number(collection.points_count ?? 0);
        return count > 0;
    } catch (error: any) {
        const message = String(error?.message || error || '').toLowerCase();
        const status = Number(error?.status || 0);

        if (status === 404 || message.includes('404') || message.includes('not found')) {
            return false;
        }

        throw error;
    }
}

async function persistChunkMetadata(chunks: Document[]) {
    try {
        await prisma.contentChunk.createMany({
            data: chunks.map((chunk) => ({
                content: chunk.pageContent,
                source: String(chunk.metadata.source || 'Sunmarke Website'),
                embedding: [],
                metadata: chunk.metadata,
            })),
        });
    } catch (dbError) {
        console.warn('PostgreSQL storage failed (non-critical):', dbError);
    }
}

function scoreChunk(queryTerms: string[], chunk: Document) {
    const haystack = `${chunk.metadata.title || ''} ${chunk.pageContent}`.toLowerCase();

    return queryTerms.reduce((score, term) => {
        if (!haystack.includes(term)) {
            return score;
        }

        const exactMatches = haystack.split(term).length - 1;
        return score + 2 + exactMatches;
    }, 0);
}

function searchLocalChunks(query: string, limit = 5) {
    const queryTerms = query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 2);

    const ranked = cachedChunks
        .map((chunk) => ({
            chunk,
            score: scoreChunk(queryTerms, chunk),
        }))
        .sort((left, right) => right.score - left.score);

    const filtered = ranked.filter((entry) => entry.score > 0);
    const selected = (filtered.length ? filtered : ranked).slice(0, limit);

    return selected.map((entry) => entry.chunk);
}

async function indexChunksWithBackends(chunks: Document[], forceRefresh: boolean) {
    const availableBackends = await getAvailableFreeEmbeddingBackends(forceRefresh);
    const successfulBackends: ResolvedEmbeddingBackend[] = [];

    for (const backend of availableBackends) {
        try {
            if (forceRefresh) {
                try {
                    await qdrantClient.deleteCollection(backend.collectionName);
                } catch (error: any) {
                    const message = String(error?.message || error || '').toLowerCase();
                    const status = Number(error?.status || 0);
                    if (status !== 404 && !message.includes('404') && !message.includes('not found')) {
                        throw error;
                    }
                }
            } else if (await hasIndexedContent(backend.collectionName)) {
                successfulBackends.push(backend);
                continue;
            }

            await QdrantVectorStore.fromDocuments(
                chunks,
                backend.embeddings,
                {
                    client: qdrantClient,
                    collectionName: backend.collectionName,
                }
            );
            successfulBackends.push(backend);
        } catch (error) {
            console.warn(`Embedding backend failed during Qdrant indexing: ${backend.label}`, error);
        }
    }

    return successfulBackends;
}

async function indexWebsiteContent(forceRefresh = false) {
    if (!forceRefresh && cachedChunks.length > 0 && activeEmbeddingBackends.length > 0) {
        return {
            chunkCount: cachedChunks.length,
            embeddingBackends: activeEmbeddingBackends.map((backend) => backend.label),
        };
    }

    console.log('Loading Sunmarke website content...');
    const chunks = await splitWebsiteDocuments();
    cachedChunks = chunks;

    try {
        activeEmbeddingBackends = await indexChunksWithBackends(chunks, forceRefresh);
        activeKnowledgeStore = activeEmbeddingBackends.length ? 'qdrant' : 'local';
    } catch (error) {
        activeEmbeddingBackends = [];
        activeKnowledgeStore = 'local';
        console.warn('Free embedding providers unavailable, using local chunk search instead:', error);
    }

    await persistChunkMetadata(chunks);

    return {
        chunkCount: chunks.length,
        embeddingBackends: activeEmbeddingBackends.map((backend) => backend.label),
    };
}

async function ensureKnowledgeBaseReady(forceRefresh = false) {
    if (forceRefresh) {
        resetEmbeddingBackendCache();
    }

    if (forceRefresh || !knowledgeBaseReadyPromise) {
        knowledgeBaseReadyPromise = indexWebsiteContent(forceRefresh)
            .catch((error) => {
                knowledgeBaseReadyPromise = null;
                throw error;
            });
    }

    return knowledgeBaseReadyPromise;
}

export async function loadWebsiteContent() {
    try {
        const { chunkCount, embeddingBackends } = await ensureKnowledgeBaseReady(true);
        const backendSummary = embeddingBackends.length
            ? ` via ${embeddingBackends.join(', ')}`
            : '';

        return `Loaded ${chunkCount} chunks from ${SOURCE_URLS.length} pages using ${activeKnowledgeStore} search${backendSummary}`;
    } catch (error) {
        console.error('Failed to load website:', error);
        throw error;
    }
}

export async function searchWithRAG(query: string) {
    try {
        await ensureKnowledgeBaseReady();

        let results: Document[] = [];

        if (activeKnowledgeStore === 'qdrant') {
            for (const backend of activeEmbeddingBackends) {
                try {
                    const vectorStore = await QdrantVectorStore.fromExistingCollection(
                        backend.embeddings,
                        {
                            client: qdrantClient,
                            collectionName: backend.collectionName,
                        }
                    );

                    results = await vectorStore.similaritySearch(query, 5);

                    if (results.length) {
                        break;
                    }
                } catch (error) {
                    console.warn(`Qdrant search unavailable for ${backend.label}, trying next free embedding backend.`, error);
                }
            }
        }

        if (!results.length) {
            results = searchLocalChunks(query, 5);
        }

        const context = results
            .map((doc) => `Source: ${doc.metadata.source}\n${doc.pageContent}`)
            .join('\n\n---\n\n');

        return { context, documents: results };
    } catch (error) {
        console.error('RAG search failed:', error);
        throw error;
    }
}
