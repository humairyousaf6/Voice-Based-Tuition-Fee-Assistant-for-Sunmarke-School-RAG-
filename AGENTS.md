# AI Voice Agent - Technical Assessment Plan & Code

**Project**: Sunmarke School Voice Agent  
**Flow**: User speaks → Transcribe → Search content → Query 3 LLMs → Speak answers → Compare  

---

## PROJECT PLAN

### Objectives
✓ Build voice-enabled chatbot for Sunmarke website  
✓ Accept audio input, transcribe to text  
✓ Scrape/ingest Sunmarke website content  
✓ Create embeddings using OpenAI via LangChain  
✓ Store vectors in Pinecone (serverless)  
✓ Search similar content with RAG  
✓ Query 3 LLMs in parallel (Gemini, Kimi, DeepSeek)  
✓ Generate audio responses (TTS)  
✓ Display side-by-side comparison  

### Technology Approach
- **LangChain**: Orchestrate embeddings, document loading, RAG chains, LLM calls
- **Pinecone**: Vector database (1536-dim embeddings)
- **Deepgram**: Speech-to-Text transcription
- **ElevenLabs**: Text-to-Speech generation
- **OpenAI**: Generate embeddings (text-embedding-3-small)
- **Gemini, Kimi, DeepSeek**: Parallel LLM responses
- **PostgreSQL**: Store queries and metadata
- **Next.js**: Frontend UI
- **Express**: Backend API

### Data Flow
```
1. Website Content → LangChain Document Loader → Split text chunks
2. Chunks → LangChain OpenAI Embeddings → 1536-dim vectors
3. Vectors → Pinecone index → Store in database
4. User Question → Deepgram STT → Get transcript
5. Transcript → LangChain Embeddings → Query vector
6. Vector Search → Pinecone retrieval → Get top 5 chunks
7. Chunks → LangChain RAG Chain → Build context
8. Context + Query → 3 LLMs (parallel calls) → Get responses
9. Responses → ElevenLabs TTS → Audio files
10. Display all 3 responses side-by-side
```

---

## QUICK START (5 min)

```bash
# Backend
mkdir backend && cd backend
npm init -y && npm install express cors dotenv axios prisma @prisma/client deepgram-sdk elevenlabs-node @pinecone-database/pinecone langchain @langchain/openai @langchain/community @langchain/core pdf-parse cheerio

# Frontend
cd ..
npx create-next-app@latest frontend --typescript --tailwind
cd frontend && npm install zustand axios
```

---

## ARCHITECTURE

**Voice Flow:**  
Audio → STT (Deepgram) → Embedding (OpenAI) → Vector Search (Pinecone) → 3 LLMs Parallel → TTS (ElevenLabs) → Display

**Tech Stack:**
- Frontend: Next.js 14 + React 18 + Zustand + TailwindCSS
- Backend: Express + TypeScript + Prisma + PostgreSQL
- LLMs: Gemini, Kimi, DeepSeek (parallel calls)
- Voice: Deepgram STT + ElevenLabs TTS
- Vector DB: Pinecone (1536-dim)

---

## API KEYS (Get These)

```
1. Google Gemini: https://aistudio.google.com/app/apikeys
2. Kimi: https://platform.moonshot.cn/
3. DeepSeek: https://platform.deepseek.com/
4. Deepgram: https://console.deepgram.com/
5. ElevenLabs: https://elevenlabs.io/
6. OpenAI: https://platform.openai.com/api-keys
7. Pinecone: https://www.pinecone.io/
```

**.env**
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/voice_agent"
GEMINI_API_KEY=your_key
KIMI_API_KEY=your_key
DEEPSEEK_API_KEY=your_key
DEEPGRAM_API_KEY=your_key
ELEVENLABS_API_KEY=your_key
OPENAI_API_KEY=your_key
PINECONE_API_KEY=your_key
PINECONE_INDEX=sunmarke-content
```

---

## BACKEND CODE

### Main Server (src/index.ts)

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import agentRoutes from './routes/agent';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use('/api/agent', agentRoutes);

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
```

### RAG Service (src/services/ragService.ts) - DEPRECATED (Use LangChain instead)

```typescript
// This is kept for reference. Use langchainService.ts instead.
import { Pinecone } from '@pinecone-database/pinecone';
import { getEmbedding } from './embeddingService';
import { prisma } from '../index';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function searchContent(query: string) {
  const embedding = await getEmbedding(query);
  const index = pinecone.Index(process.env.PINECONE_INDEX!);
  const results = await index.query({ vector: embedding, topK: 5 });
  
  const chunks = await Promise.all(
    results.matches.map(m => prisma.contentChunk.findUnique({ where: { id: m.id } }))
  );
  return chunks.filter(Boolean);
}

export async function buildContext(chunks: any[]): Promise<string> {
  return chunks.map(c => `Source: ${c.source}\n${c.content}`).join('\n\n---\n\n');
}
```

### LLM Service (src/services/llmService.ts)

```typescript
import axios from 'axios';

export async function callGemini(context: string, query: string) {
  const res = await axios.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
    {
      contents: [{ parts: [{ text: `Context:\n${context}\n\nQuestion: ${query}` }] }],
      generationConfig: { maxOutputTokens: 1024 }
    },
    { headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY } }
  );
  return res.data.candidates[0].content.parts[0].text;
}

export async function callKimi(context: string, query: string) {
  const res = await axios.post(
    'https://api.moonshot.cn/v1/chat/completions',
    {
      model: 'moonshot-v1-32k',
      messages: [{ role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` }],
      max_tokens: 1024
    },
    { headers: { 'Authorization': `Bearer ${process.env.KIMI_API_KEY}` } }
  );
  return res.data.choices[0].message.content;
}

export async function callDeepseek(context: string, query: string) {
  const res = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` }],
      max_tokens: 1024
    },
    { headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` } }
  );
  return res.data.choices[0].message.content;
}

export async function callAllLLMs(context: string, query: string) {
  return Promise.all([
    callGemini(context, query),
    callKimi(context, query),
    callDeepseek(context, query)
  ]);
}
```

### STT Service (src/services/sttService.ts)

```typescript
import { Deepgram } from '@deepgram/sdk';

const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY!);

export async function transcribe(audioBuffer: Buffer): Promise<string> {
  const res = await deepgram.transcription.preRecorded(
    { buffer: audioBuffer, mimetype: 'audio/wav' },
    { model: 'nova-2', language: 'en' }
  );
  return res.results.channels[0].alternatives[0].transcript;
}
```

### TTS Service (src/services/ttsService.ts)

```typescript
import axios from 'axios';

export async function generateSpeech(text: string): Promise<Buffer> {
  const res = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/Rachel`,
    {
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    },
    {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      responseType: 'arraybuffer'
    }
  );
  return Buffer.from(res.data);
}
```

### Embedding Service (src/services/embeddingService.ts)

```typescript
import axios from 'axios';

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await axios.post(
    'https://api.openai.com/v1/embeddings',
    { input: text, model: 'text-embedding-3-small' },
    { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }
  );
  return res.data.data[0].embedding;
}
```

### LangChain Document Loader & Embeddings (src/services/langchainService.ts)

```typescript
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { prisma } from '../index';

// Initialize embeddings (LangChain)
export const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small'
});

// Initialize Pinecone
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

// Load and process website content
export async function loadWebsiteContent() {
  try {
    // 1. Load HTML from Sunmarke website
    const loader = new CheerioWebBaseLoader('https://www.sunmarke.com/');
    const docs = await loader.load();
    
    // 2. Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitDocuments(docs);
    
    // 3. Create embeddings using LangChain
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    const vectorStore = await PineconeStore.fromDocuments(
      chunks,
      embeddings,
      { pineconeIndex: index }
    );
    
    // 4. Store metadata in PostgreSQL
    for (const chunk of chunks) {
      await prisma.contentChunk.create({
        data: {
          content: chunk.pageContent,
          source: chunk.metadata.source || 'https://www.sunmarke.com/',
          embedding: [], // Will be populated by Pinecone
          metadata: chunk.metadata
        }
      });
    }
    
    return `Loaded ${chunks.length} chunks`;
  } catch (error) {
    console.error('Failed to load website:', error);
    throw error;
  }
}

// Search similar content using RAG
export async function searchWithRAG(query: string) {
  try {
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    const vectorStore = await PineconeStore.getInstance(embeddings, {
      pineconeIndex: index
    });
    
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
```

### LangChain RAG Chain (src/services/ragChainService.ts)

```typescript
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
    
    // 3. Create LLM instance (for testing)
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo'
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
```

---

## OLD SERVICES (Keep for backward compatibility)

### Agent Route (src/routes/agent.ts)

```typescript
import express from 'express';
import { searchWithRAG } from '../services/langchainService';
import { callAllLLMs } from '../services/llmService';
import { generateSpeech } from '../services/ttsService';
import { createRAGChain } from '../services/ragChainService';
import { prisma } from '../index';

const router = express.Router();

router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    // 1. RAG Search using LangChain
    const { context } = await searchWithRAG(query);
    
    // 2. Call 3 LLMs in parallel
    const [geminiRes, kimiRes, deepseekRes] = await callAllLLMs(context, query);
    
    // 3. Generate speech for all responses
    const [geminiAudio, kimiAudio, deepseekAudio] = await Promise.all([
      generateSpeech(geminiRes),
      generateSpeech(kimiRes),
      generateSpeech(deepseekRes)
    ]);
    
    // 4. Store in database
    await prisma.userQuery.create({
      data: {
        userInput: query,
        geminResponse: geminiRes,
        kimiResponse: kimiRes,
        deepseekResp: deepseekRes
      }
    });
    
    res.json({
      responses: {
        gemini: { text: geminiRes, audio: geminiAudio.toString('base64') },
        kimi: { text: kimiRes, audio: kimiAudio.toString('base64') },
        deepseek: { text: deepseekRes, audio: deepseekAudio.toString('base64') }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

export default router;
```

### Database Schema (prisma/schema.prisma)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model ContentChunk {
  id        String   @id @default(cuid())
  content   String   @db.Text
  source    String
  embedding Float[]  @db.Vector(1536)
  metadata  Json
  createdAt DateTime @default(now())
}

model UserQuery {
  id            String   @id @default(cuid())
  userInput     String   @db.Text
  geminResponse String   @db.Text
  kimiResponse  String   @db.Text
  deepseekResp  String   @db.Text
  createdAt     DateTime @default(now())
}
```

---

## FRONTEND CODE

### State Store (src/store/agentStore.ts)

```typescript
import { create } from 'zustand';

export const useAgentStore = create((set) => ({
  isRecording: false,
  isLoading: false,
  responses: null,
  error: null,
  
  setRecording: (recording) => set({ isRecording: recording }),
  setLoading: (loading) => set({ isLoading: loading }),
  setResponses: (responses) => set({ responses }),
  setError: (error) => set({ error })
}));
```

### Voice Hook (src/hooks/useVoiceRecorder.ts)

```typescript
import { useRef, useState } from 'react';

export function useVoiceRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorder.onstart = () => setIsRecording(true);
    mediaRecorder.onstop = () => setIsRecording(false);
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
  };

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
          chunksRef.current = [];
          resolve(blob);
        };
        mediaRecorderRef.current.stop();
      }
    });
  };

  return { isRecording, startRecording, stopRecording };
}
```

### Voice Recorder (src/components/VoiceRecorder.tsx)

```typescript
'use client';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAgentStore } from '@/store/agentStore';
import { useState } from 'react';

export default function VoiceRecorder() {
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
  const { isLoading, setLoading, setResponses } = useAgentStore();
  const [transcript, setTranscript] = useState('');

  const handleRecord = async () => {
    if (!isRecording) {
      startRecording();
    } else {
      setLoading(true);
      try {
        const audioBlob = await stopRecording();
        const formData = new FormData();
        formData.append('audio', audioBlob);
        const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
        const data = await res.json();
        setTranscript(data.transcript);

        const agentRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: data.transcript })
        });
        const result = await agentRes.json();
        setResponses(result.responses);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <button
        onClick={handleRecord}
        className={`px-6 py-3 rounded text-white font-semibold ${
          isRecording ? 'bg-red-500' : 'bg-blue-500'
        }`}
      >
        {isRecording ? '⏹ Stop' : '🎤 Record'}
      </button>
      {transcript && <p className="text-gray-800">{transcript}</p>}
    </div>
  );
}
```

### Response Panel (src/components/ResponsePanel.tsx)

```typescript
'use client';
import { useState } from 'react';

export default function ResponsePanel({ title, text, audio }: any) {
  const playAudio = () => {
    const audioData = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const blob = new Blob([audioData], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    new Audio(url).play();
  };

  return (
    <div className="flex-1 p-6 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <button onClick={playAudio} className="mb-4 px-4 py-2 bg-green-500 text-white rounded">
        ▶ Play
      </button>
      <p className="text-gray-700">{text}</p>
    </div>
  );
}
```

### Comparison View (src/components/ComparisonView.tsx)

```typescript
'use client';
import ResponsePanel from './ResponsePanel';
import { useAgentStore } from '@/store/agentStore';

export default function ComparisonView() {
  const { responses, isLoading } = useAgentStore();
  if (isLoading) return <div className="p-8 text-center">Processing...</div>;
  if (!responses) return null;

  return (
    <div className="grid grid-cols-3 gap-4 mt-8">
      <ResponsePanel title="Gemini" text={responses.gemini.text} audio={responses.gemini.audio} />
      <ResponsePanel title="Kimi" text={responses.kimi.text} audio={responses.kimi.audio} />
      <ResponsePanel title="DeepSeek" text={responses.deepseek.text} audio={responses.deepseek.audio} />
    </div>
  );
}
```

### Main Page (src/app/page.tsx)

```typescript
'use client';
import VoiceRecorder from '@/components/VoiceRecorder';
import ComparisonView from '@/components/ComparisonView';
import { useAgentStore } from '@/store/agentStore';

export default function Home() {
  const { error } = useAgentStore();
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">Sunmarke Voice Assistant</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <VoiceRecorder />
          {error && <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}
        </div>
        <ComparisonView />
      </div>
    </main>
  );
}
```

---

## SETUP

```bash
# 1. Initialize database
npx prisma migrate dev --name init

# 2. Load website content into Pinecone (one-time)
# Add this route temporarily or run as script
curl -X POST http://localhost:5000/api/content/load-website

# 3. Run backend
cd backend && npm run dev

# 4. Run frontend (new terminal)
cd frontend && npm run dev

# 5. Test at localhost:3000
```

### Content Loading Route (src/routes/content.ts) - Optional

```typescript
import express from 'express';
import { loadWebsiteContent } from '../services/langchainService';

const router = express.Router();

router.post('/load-website', async (req, res) => {
  try {
    const result = await loadWebsiteContent();
    res.json({ success: true, message: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load content' });
  }
});

export default router;
```

---

## DEPLOYMENT

**Frontend (Vercel):**
Push to GitHub → Connect to Vercel → Deploy

**Backend (Railway):**
Connect GitHub → Add env vars → Deploy

---

## COST (~$15/month)

| Service | Cost |
|---------|------|
| Gemini | $0 |
| Kimi | $3 |
| DeepSeek | $3 |
| Deepgram | $1 |
| ElevenLabs | $3 |
| OpenAI | $1 |
| Pinecone | $2 |
| Database | $0 |
| Hosting | $2 |

---

**Ready to build!** Follow code above, get API keys, set up database, then run locally first.