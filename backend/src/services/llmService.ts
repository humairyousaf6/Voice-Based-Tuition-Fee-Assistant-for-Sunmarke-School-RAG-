import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are a helpful assistant for Sunmarke School. 
Use the provided CONTEXT to answer the QUESTION. 
If the answer is NOT in the context, say: "I don't have that information."
Stay strictly within the context provided. Do not use outside knowledge.
Do not guess or combine unrelated fees.
If the context mentions application, acceptance, or re-enrolment fees but does not include the exact tuition amount asked for, clearly say that the exact tuition fee is not available in the provided context.`;

type ModelResult = {
    model: string;
    text: string;
};

const openai1 = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY1,
    defaultHeaders: {
        'HTTP-Referer': 'https://sunmarke.com',
        'X-Title': 'Sunmarke Voice Agent',
    },
});

const openai2 = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY2,
    defaultHeaders: {
        'HTTP-Referer': 'https://sunmarke.com',
        'X-Title': 'Sunmarke Voice Agent',
    },
});

const openai3 = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY3,
    defaultHeaders: {
        'HTTP-Referer': 'https://sunmarke.com',
        'X-Title': 'Sunmarke Voice Agent',
    },
});

function isRetryableModelError(error: any) {
    const status = Number(error?.status || 0);
    return status === 404 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function callOpenRouterWithFallback(
    client: OpenAI,
    label: string,
    models: string[],
    context: string,
    query: string
): Promise<ModelResult> {
    let lastError: any = null;

    for (const model of models) {
        try {
            const completion = await client.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `CONTEXT:\n${context}\n\nQUESTION: ${query}` },
                ],
                max_tokens: 1024,
            });

            return {
                model,
                text: completion.choices?.[0]?.message?.content || `No response from ${label}.`,
            };
        } catch (error: any) {
            lastError = error;
            console.error(`${label} model failed`, model, error);

            if (!isRetryableModelError(error)) {
                break;
            }
        }
    }

    return {
        model: models[0],
        text: `[${label} Error] ${lastError?.message || 'Model request failed'}`,
    };
}

export async function callGemini(context: string, query: string) {
    return callOpenRouterWithFallback(
        openai1,
        'Gemma',
        [
            'google/gemma-4-31b-it:free',
            'google/gemma-4-26b-a4b-it:free',
            'liquid/lfm-2.5-1.2b-instruct:free',
            'openai/gpt-oss-20b:free',
            'poolside/laguna-xs.2:free',
        ],
        context,
        query
    );
}

export async function callKimi(context: string, query: string) {
    return callOpenRouterWithFallback(
        openai2,
        'Laguna',
        [
            'poolside/laguna-m.1:free',
            'poolside/laguna-xs.2:free',
            'openai/gpt-oss-20b:free',
            'liquid/lfm-2.5-1.2b-instruct:free',
            'google/gemma-4-26b-a4b-it:free',
        ],
        context,
        query
    );
}

export async function callDeepseek(context: string, query: string) {
    return callOpenRouterWithFallback(
        openai3,
        'GPT OSS',
        [
            'openai/gpt-oss-20b:free',
            'liquid/lfm-2.5-1.2b-instruct:free',
            'google/gemma-4-31b-it:free',
            'poolside/laguna-xs.2:free',
            'google/gemma-4-26b-a4b-it:free',
        ],
        context,
        query
    );
}

export async function callAllLLMs(context: string, query: string) {
    return Promise.all([
        callGemini(context, query),
        callKimi(context, query),
        callDeepseek(context, query),
    ]);
}
