import express from 'express';
import { loadWebsiteContent } from '../services/langchainService';

const router = express.Router();

router.post('/load-website', async (req, res) => {
    try {
        const result = await loadWebsiteContent();
        res.json({ success: true, message: result });
    } catch (error) {
        const message = String((error as any)?.message || error || 'Failed to load content');
        res.status(500).json({ error: message });
    }
});

export default router;
