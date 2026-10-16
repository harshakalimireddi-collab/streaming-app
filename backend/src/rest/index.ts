import type { Express } from 'express';
import healthRouter from './healthRouter';
import streamRouter from './streamRouter';
import tmdbRouter from './tmdbRouter';
import { errorHandler } from '../core/errorHandler';

export default function installRest(app: Express) {
  app.use('/api/health', healthRouter);
  app.use('/api/streams', streamRouter);
  app.use('/api/tmdb', tmdbRouter);
  app.use(errorHandler);
}