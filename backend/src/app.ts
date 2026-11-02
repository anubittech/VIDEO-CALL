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
