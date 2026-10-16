import express, { Request, Response } from "express";
import asyncHandler from "../core/asyncHandler";
import { validateRequest } from "../core/validation";
import * as tmdbService from "../service/tmdbService";
import {
  tmdbSearchQuerySchema,
  tmdbTrendingQuerySchema,
  tmdbIdParamsSchema,
  tmdbRecommendationsParamsSchema,
  tmdbTypeParamsSchema,
  tmdbDiscoverParamsSchema,
  tvSeasonParamsSchema,
  tmdbPersonParamsSchema,
} from "../validation/tmdbRoutes";

const router = express.Router();

router.get(
  "/search",
  validateRequest({ query: tmdbSearchQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { q, type } = req.query as {
      q: string;
      type?: "multi" | "movie" | "tv";
    };
    const data = await tmdbService.search(q, type ?? "multi");
    res.status(200).json(data);
  })
);

router.get(
  "/trending",
  validateRequest({ query: tmdbTrendingQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, window } = req.query as {
      type?: "all" | "movie" | "tv";
      window?: "day" | "week";
    };

    const data = await tmdbService.getTrending(type ?? "all", window ?? "day");
    res.status(200).json(data);
  })
);

router.get(
  "/movie/:tmdbId",
  validateRequest({ params: tmdbIdParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId } = req.params as { tmdbId: string };
    const data = await tmdbService.getMovieDetails(Number(tmdbId));
    res.status(200).json(data);
  })
);

router.get(
  "/tv/:tmdbId",
  validateRequest({ params: tmdbIdParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId } = req.params as { tmdbId: string };
    const data = await tmdbService.getTvDetails(Number(tmdbId));
    res.status(200).json(data);
  })
);

router.get(
  "/tv/:tmdbId/episodes",
  validateRequest({ params: tmdbIdParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId } = req.params as { tmdbId: string };
    const data = await tmdbService.getTvAllEpisodes(Number(tmdbId));
    res.status(200).json(data);
  })
);

router.get(
  "/tv/:tmdbId/season/:season",
  validateRequest({ params: tvSeasonParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId, season } = req.params as { tmdbId: string; season: string };
    const data = await tmdbService.getTvSeasonDetails(
      Number(tmdbId),
      Number(season)
    );
    res.status(200).json(data);
  })
);

router.get(
  "/collection/:tmdbId",
  validateRequest({ params: tmdbIdParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId } = req.params as { tmdbId: string };
    const data = await tmdbService.getCollection(Number(tmdbId));
    res.status(200).json(data);
  })
);

router.get(
  "/:type/:tmdbId/recommendations",
  validateRequest({ params: tmdbRecommendationsParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, tmdbId } = req.params as { type: "movie" | "tv"; tmdbId: string };
    const data = await tmdbService.getRecommendations(Number(tmdbId), type);
    res.status(200).json(data);
  })
);

router.get(
  "/:type/:tmdbId/images",
  validateRequest({ params: tmdbRecommendationsParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, tmdbId } = req.params as { type: "movie" | "tv"; tmdbId: string };
    const data = await tmdbService.getImages(Number(tmdbId), type);
    res.status(200).json(data);
  })
);

router.get(
  "/top-rated/:type",
  validateRequest({ params: tmdbTypeParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params as { type: "movie" | "tv" };
    const data = await tmdbService.getTopRated(type);
    res.status(200).json(data);
  })
);

router.get(
  "/genres/:type",
  validateRequest({ params: tmdbTypeParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params as { type: "movie" | "tv" };
    const data = await tmdbService.getGenres(type);
    res.status(200).json(data);
  })
);

router.get(
  "/discover/:type/:genreId",
  validateRequest({ params: tmdbDiscoverParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, genreId } = req.params as { type: "movie" | "tv"; genreId: string };
    const data = await tmdbService.discoverByGenre(type, Number(genreId));
    res.status(200).json(data);
  })
);

router.get(
  "/person/:personId",
  validateRequest({ params: tmdbPersonParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { personId } = req.params as { personId: string };
    const data = await tmdbService.getPersonDetails(Number(personId));
    res.status(200).json(data);
  })
);

export default router;
