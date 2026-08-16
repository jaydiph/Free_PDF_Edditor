import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Military-Grade Helmet Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Allows wasm & workers for client-side tesseract & pdf-lib
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  hsts: true,
  noSniff: true,
  xssFilter: true
}));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Anti-Sniffing Custom Header
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
  next();
});

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Free-PDF Editor',
    author: 'Jaydip Hadiya',
    version: '1.0.0',
    secured: true,
    timestamp: new Date().toISOString()
  });
});

// Optional server-side pipeline endpoint
app.post('/api/pipeline/process', upload.array('files'), async (req, res) => {
  try {
    const pipelineData = JSON.parse(req.body.pipeline || '[]');
    res.json({
      success: true,
      message: 'Pipeline configuration validated',
      stepsCount: pipelineData.length,
      filesReceived: req.files ? req.files.length : 0
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Serve frontend in production build if dist exists
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Free-PDF Editor API is running. Run `npm run dev` for Vite frontend development server.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Free-PDF Editor Server] Secured & listening on http://localhost:${PORT}`);
});
