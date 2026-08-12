import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { ENV } from './config/env.js';

export async function createApp() {
  const app = express();

  // Security & Parsing
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow inline scripts for thermal receipt print views
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
    })
  );

  const allowedOrigins = ENV.FRONTEND_URL.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));


  app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Small-Mart POS API' });
  });


  app.use('/api', apiRouter);

  // 404 for anything else (this server is API-only now)
  app.use((req, res) => {
    res.status(404).json({ status: 'error', message: 'Not found' });
  });


  app.use(errorHandler);

  return app;
}
