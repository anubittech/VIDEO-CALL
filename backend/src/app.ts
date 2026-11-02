import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import meetingRoutes from './routes/meeting.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Allow requests from localhost, LAN IP addresses (e.g. 192.168.x.x), and mobile clients
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Redirect browser visitors who open port 5000 directly to the Next.js Frontend on port 3000
app.get('/', (req, res) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    const hostHeader = req.headers.host || 'localhost';
    const hostname = hostHeader.split(':')[0];
    res.redirect(`http://${hostname}:3000`);
    return;
  }
  res.status(200).json({
    success: true,
    service: 'pulsemeet-backend',
    message: 'PulseMeet API Server is running. Open http://localhost:3000 for the web application.',
    frontendUrl: 'http://localhost:3000',
  });
});

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'pulsemeet-backend',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Requested API endpoint does not exist.',
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
