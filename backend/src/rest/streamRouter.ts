import express, { Request, Response } from "express";
import asyncHandler from "../core/asyncHandler";
import { validateRequest } from "../core/validation";
import * as streamService from "../service/streamService";
import {
  movieStreamParamsSchema,
  tvStreamParamsSchema,
} from "../validation/streamRoutes";

const router = express.Router();


router.get(
  "/movie/:tmdbId",
  validateRequest({ params: movieStreamParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId } = req.params as { tmdbId: string };
    const result = await streamService.getMovieStreamUrl(tmdbId);

    res.status(200).json(result);
  })
);

router.get(
  "/tv/:tmdbId/:season/:episode",
  validateRequest({ params: tvStreamParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId, season, episode } = req.params as {
      tmdbId: string;
      season: string;
      episode: string;
    };

    const result = await streamService.getTvStreamUrl(tmdbId, season, episode);

    res.status(200).json(result);
  })
);

export default router;
