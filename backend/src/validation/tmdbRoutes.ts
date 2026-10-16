import Joi from "joi";

export const tmdbSearchQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).required(),
  type: Joi.string().valid("multi", "movie", "tv").optional(),
}).unknown(false);

export const tmdbTrendingQuerySchema = Joi.object({
  type: Joi.string().valid("all", "movie", "tv").optional(),
  window: Joi.string().valid("day", "week").optional(),
}).unknown(false);

export const tmdbIdParamsSchema = Joi.object({
  tmdbId: Joi.number().integer().positive().required(),
}).unknown(false);

export const tmdbTypeParamsSchema = Joi.object({
  type: Joi.string().valid("movie", "tv").required(),
}).unknown(false);

export const tmdbRecommendationsParamsSchema = Joi.object({
  type: Joi.string().valid("movie", "tv").required(),
  tmdbId: Joi.number().integer().positive().required(),
}).unknown(false);

export const tvSeasonParamsSchema = Joi.object({
  tmdbId: Joi.number().integer().positive().required(),
  season: Joi.number().integer().positive().required(),
}).unknown(false);

export const tmdbDiscoverParamsSchema = Joi.object({
  type: Joi.string().valid("movie", "tv").required(),
  genreId: Joi.number().integer().positive().required(),
}).unknown(false);

export const tmdbPersonParamsSchema = Joi.object({
  personId: Joi.number().integer().positive().required(),
}).unknown(false);