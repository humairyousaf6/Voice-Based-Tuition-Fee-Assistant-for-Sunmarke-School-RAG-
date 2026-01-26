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
