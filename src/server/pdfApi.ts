import express from 'express';
import bodyParser from 'body-parser';
import { extractFromHtml } from '@/services/pdf/extract';
import { generatePdfBuffer } from '@/services/pdf/generate_pdf';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const limiter = rateLimit({ windowMs: 60_000, max: 12 });
router.use(bodyParser.json({ limit: '2mb' }));
router.use(limiter);

router.post('/generate-booklet', async (req, res) => {
  try {
    const { html } = req.body;
    if (!html || typeof html !== 'string') return res.status(400).json({ error: 'html required' });

    const data = extractFromHtml(html);
    const pdfBuf = await generatePdfBuffer(data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="booklet.pdf"');
    res.setHeader('Content-Length', String(pdfBuf.length));
    res.send(pdfBuf);
  } catch (err: any) {
    console.error('pdfApi error', err);
    res.status(500).json({ error: err.message || 'internal' });
  }
});

export default router;
