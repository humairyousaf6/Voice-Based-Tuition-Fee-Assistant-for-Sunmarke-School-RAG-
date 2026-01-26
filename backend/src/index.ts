import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import agentRoutes from './routes/agent';
import contentRoutes from './routes/content';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
export const prisma = new PrismaClient();

app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://sunmarkefrontend.vercel.app',
        'https://sunmarkefrontend-4nl5g871b-humairs-projects-92c0e83f.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use('/api/agent', agentRoutes);
app.use('/api/content', contentRoutes);

// Only start server in non-Vercel environments
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => console.log(`Server on port ${PORT}`));
}

// Export for Vercel serverless
export default app;

