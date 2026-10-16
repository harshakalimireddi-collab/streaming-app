import type { Request, Response } from 'express';
import createServer, { Server } from '../src/createServer';

let serverInstance: Server | null = null;

export default async function handler(req: Request, res: Response) {
  if (!serverInstance) {
    serverInstance = await createServer();
  }
  return serverInstance.getApp()(req, res);
}
