import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import app from './app';
import { initializeSignalingServer } from './socket/signaling';
import { prisma } from './utils/prisma';

const PORT = parseInt(process.env.PORT || '5000', 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '3443', 10);
const NEXT_FRONTEND_PORT = 3000;

const httpServer = http.createServer(app);
const io = initializeSignalingServer(httpServer);

// Optional Unified HTTPS Mobile Gateway (Port 3443) for Mobile WebRTC Camera/Mic Secure Context
const certPath = path.join(__dirname, '..', 'certs', 'cert.pem');
const keyPath = path.join(__dirname, '..', 'certs', 'key.pem');

let httpsServer: https.Server | null = null;

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const credentials = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  httpsServer = https.createServer(credentials, (req, res) => {
    const url = req.url || '/';

    // 1. Route /api/* directly to Express backend app
    if (url.startsWith('/api')) {
      app(req, res);
      return;
    }

    // 2. Ignore /socket.io/* here since io.attach(httpsServer) handles it
    if (url.startsWith('/socket.io')) {
      return;
    }

    // 3. Proxy all frontend requests to Next.js server on 127.0.0.1:3000
    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: NEXT_FRONTEND_PORT,
        path: url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `127.0.0.1:${NEXT_FRONTEND_PORT}`,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );

    proxyReq.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Frontend dev server is starting up on port 3000...');
    });

    req.pipe(proxyReq, { end: true });
  });

  // Attach the same Socket.IO signaling server to the HTTPS server
  io.attach(httpsServer);
}

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('[Database]: Connected to PostgreSQL via Prisma ORM');

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server]: PulseMeet Backend & Signaling Server running on:`);
      console.log(`          Local:   http://localhost:${PORT}`);
      console.log(`          Network: http://192.168.20.12:${PORT}`);
    });

    if (httpsServer) {
      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(
          `[HTTPS Mobile Gateway]: https://192.168.20.12:${HTTPS_PORT} (Enables mobile camera & mic)`
        );
      });
    }
  } catch (error) {
    console.error('[Startup Error]: Failed to connect to database or start server:', error);
    process.exit(1);
  }
};

startServer();
