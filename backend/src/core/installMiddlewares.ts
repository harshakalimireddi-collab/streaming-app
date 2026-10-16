import type { Express } from 'express';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { loggingMiddleware } from './loggingMiddleware';

dotenv.config();

export default function installMiddlewares(app: Express) {
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: true, credentials: true }));

  if (process.env.NODE_ENV === 'development') {
    app.use(loggingMiddleware);
  }
  app.use(express.json());
}