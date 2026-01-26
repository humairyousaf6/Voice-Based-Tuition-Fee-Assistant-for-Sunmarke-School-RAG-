import { RunnableSequence } from '@langchain/core/runnables';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';
import { searchWithRAG } from './langchainService';

export async function createRAGChain(query: string) {
    try {
        // 1. Search for relevant documents
        const { context } = await searchWithRAG(query);

        // 2. Create prompt template
        const promptTemplate = ChatPromptTemplate.fromTemplate(`
      You are a helpful assistant about Sunmarke School.
      Use the provided context to answer questions accurately.
      If the information is not in the context, say "I don't have that information."
      
      Context:
      {context}
      
      Question: {question}
      
      Answer:
    `);

        // 3. Create LLM instance (OpenRouter - Gemini 2.0 Flash)
        const llm = new ChatOpenAI({
            openAIApiKey: process.env.OPENROUTER_API_KEY,
            modelName: 'google/gemini-2.0-flash-exp:free',
            configuration: {
                baseURL: "https://openrouter.ai/api/v1",
            }
        });

        // 4. Create RAG chain
        const chain = RunnableSequence.from([
            {
                context: () => context,
                question: (input) => input.question
            },
            promptTemplate,
            llm,
            new StringOutputParser()
        ]);

        // 5. Execute chain
        const response = await chain.invoke({ question: query });
        return response;
    } catch (error) {
        console.error('RAG chain failed:', error);
        throw error;
    }
}
