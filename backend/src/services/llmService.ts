import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are a helpful assistant for Sunmarke School. 
Use the provided CONTEXT to answer the QUESTION. 
If the answer is NOT in the context, say: "I don't have that information."
Stay strictly within the context provided. Do not use outside knowledge.`;

// Create separate OpenAI clients for each model with different API keys
const openai1 = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY1,
    defaultHeaders: {
        "HTTP-Referer": "https://sunmarke.com",
        "X-Title": "Sunmarke Voice Agent",
    },
});

const openai2 = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY2,
    defaultHeaders: {
        "HTTP-Referer": "https://sunmarke.com",
        "X-Title": "Sunmarke Voice Agent",
    },
});

const openai3 = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY3,
    defaultHeaders: {
        "HTTP-Referer": "https://sunmarke.com",
        "X-Title": "Sunmarke Voice Agent",
    },
});

// Model 1: Google Gemini 2.0 Flash Experimental (Free) - Uses API KEY 1
export async function callGemini(context: string, query: string) {
    try {
        const completion = await openai1.chat.completions.create({
            model: "google/gemini-2.0-flash-exp:free",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `CONTEXT:\n${context}\n\nQUESTION: ${query}` }
            ],
            max_tokens: 1024
        });
        return completion.choices?.[0]?.message?.content || "No response from Gemini.";
    } catch (e: any) {
        console.error("Gemini Error", e);
        return `[Gemini Error] ${e.message}`;
    }
}

// Model 2: Meta Llama 3.3 70B Instruct (Free) - Uses API KEY 2
export async function callKimi(context: string, query: string) {
    try {
        const completion = await openai2.chat.completions.create({
            model: "meta-llama/llama-3.3-70b-instruct:free",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `CONTEXT:\n${context}\n\nQUESTION: ${query}` }
            ],
            max_tokens: 1024
        });
        return completion.choices?.[0]?.message?.content || "No response from Llama.";
    } catch (e: any) {
        console.error("Llama Error", e);
        return `[Llama Error] ${e.message}`;
    }
}

// Model 3: Mistral Small 3.1 24B Instruct (Free) - Uses API KEY 3
export async function callDeepseek(context: string, query: string) {
    try {
        const completion = await openai3.chat.completions.create({
            model: "mistralai/mistral-small-3.1-24b-instruct:free",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `CONTEXT:\n${context}\n\nQUESTION: ${query}` }
            ],
            max_tokens: 1024
        });
        return completion.choices?.[0]?.message?.content || "No response from Mistral Small.";
    } catch (e: any) {
        console.error("Mistral Small Error", e);
        return `[Mistral Small Error] ${e.message}`;
    }
}

// Call all 3 models in parallel (now safe since each uses a different API key)
export async function callAllLLMs(context: string, query: string) {
    return Promise.all([
        callGemini(context, query),
        callKimi(context, query),
        callDeepseek(context, query)
    ]);
}

