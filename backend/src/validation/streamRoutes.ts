import Joi from "joi";

export const movieStreamParamsSchema = Joi.object({
  tmdbId: Joi.number().integer().positive().required(),
});

export const tvStreamParamsSchema = Joi.object({
  tmdbId: Joi.number().integer().positive().required(),
  season: Joi.number().integer().positive().required(),
  episode: Joi.number().integer().positive().required(),
});


