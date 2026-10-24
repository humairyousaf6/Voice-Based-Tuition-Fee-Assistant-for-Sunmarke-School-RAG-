# Sunmarke Voice Assistant

A voice-enabled RAG application for Sunmarke School that records spoken questions, transcribes them, retrieves relevant school information from the Sunmarke tuition page, and returns three grounded model responses side by side.

## Project Overview

This project combines:

- A `Next.js` frontend for voice recording, transcription display, and multi-model comparison
- An `Express + TypeScript` backend for transcription, retrieval, LLM calls, and text-to-speech
- A `Qdrant` vector database for storing and searching embedded school content
- A `RAG` pipeline that mixes standard page-text chunks with structured tuition-fee facts for better fee accuracy

## Data Source

The current knowledge base is built from the official Sunmarke School tuition page:

- `https://www.sunmarke.com/admissions/tuition-fees/`

The ingestion pipeline extracts:

- General page content
- Tuition table rows by year group
- Application and assessment fee details
- Acceptance fee details
- Re-enrolment fee details
- Payment-related information

## Steps Covered

- Recording a voice question in the browser
- Sending recorded audio to the backend
- Transcribing speech to text using Deepgram
- Fetching and parsing the Sunmarke tuition page
- Converting page content into RAG-ready documents
- Creating embeddings using free embedding backends
- Storing vectors in Qdrant
- Retrieving the most relevant content for the user question
- Sending retrieved context to three LLM lanes
- Returning grounded answers in text and optional audio form

## Current Result

The system can now answer tuition-related questions much more accurately than the earlier raw-text-only version. It is especially improved for:

- Year-specific tuition fees
- Application and assessment fee questions
- Re-enrolment fee questions
- General school fee queries

The frontend shows:

- Transcript output
- Three model responses side by side
- Read-aloud support for responses

## Tech Stack

- `Next.js 14`
- `React 18`
- `TypeScript`
- `Tailwind CSS`
- `Express`
- `Prisma`
- `Qdrant`
- `LangChain`
- `Deepgram`
- `ElevenLabs`
- `OpenRouter`
- `Google Gemini Embeddings`

## Environment Variables

### Backend

Add these in `backend/.env`:

- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION`
- `OPENROUTER_API_KEY1`
- `OPENROUTER_API_KEY2`
- `OPENROUTER_API_KEY3`
- `GOOGLE_API_KEY` or `GEMINI_API_KEY`
- `JINA_API_KEY` (optional)
- `DEEPGRAM_API_KEY`
- `ELEVENLABS_API_KEY`
- `DATABASE_URL` (optional for logging)

### Frontend

Add this in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

For production on Vercel:

```env
NEXT_PUBLIC_API_URL=https://sunmarkebackend.vercel.app
```

## Local Setup

### Backend

1. Go to the backend folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Configure `.env`

4. Start the backend:

```bash
npm run dev
```

### Frontend

1. Go to the frontend folder:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Configure `.env.local`

4. Start the frontend:

```bash
npm run dev
```

## Usage

1. Open the frontend in the browser.
2. Click the microphone button to start recording.
3. Speak a question such as:
   - `What is the Year 10 annual tuition fee?`
   - `What is the application and assessment fee?`
4. Stop recording.
5. Review the transcript and compare the three generated answers.

## Deployment

This project is deployed as two separate Vercel projects:

- Frontend project with `Root Directory = frontend`
- Backend project with `Root Directory = backend`

### Frontend Vercel Variable

```env
NEXT_PUBLIC_API_URL=https://sunmarkebackend.vercel.app
```

### Backend Vercel Variables

Add the same backend environment variables listed above in the Vercel project settings.

## Possible Improvements

- Ingest more Sunmarke pages beyond tuition fees
- Add better structured parsing for more page types
- Improve model quality by replacing unstable free model fallbacks
- Add automated scheduled re-ingestion
- Make allowed frontend origins configurable via environment variables
- Add production monitoring and error tracking
- Improve backend text-to-speech reliability

## 👨‍💻 Author

Muhammad Humair

AI/ML & Automation Engineer
