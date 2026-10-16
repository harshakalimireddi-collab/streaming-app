import axios from "axios";
import ServiceError from "../core/ServiceError";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
  throw new Error("TMDB_API_KEY is missing");
}

import https from "https";

const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: true,
});

const client = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Encoding": "identity",
  },
  params: {
    api_key: TMDB_API_KEY,
  },
  httpsAgent,
  timeout: 15000,
});

const cache = new Map<string, { data: any; expiry: number }>();

async function safeGet(url: string, config?: any, retries = 3): Promise<any> {
  const cacheKey = `${url}:${JSON.stringify(config?.params ?? {})}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return { data: cached.data };
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await client.get(url, config);
      cache.set(cacheKey, { data: res.data, expiry: Date.now() + 5 * 60 * 1000 });
      return res;
    } catch (err: any) {
      if (err?.response?.status && err.response.status < 500 && err.response.status !== 429) {
        throw err;
      }
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 180));
    }
  }
}

const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const IMG_BASE_ORIGINAL = "https://image.tmdb.org/t/p/original";

const MOVIE_GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

const TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  10762: "Kids", 9648: "Mystery", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk",
  10768: "War & Politics", 37: "Western",
};

function normalizeSearchResult(r: any) {
  const type = (r.media_type ?? (r.title ? "movie" : "tv")) as "movie" | "tv";
  const genreMap = type === "movie" ? MOVIE_GENRES : TV_GENRES;
  const genres: string[] = Array.isArray(r.genres)
    ? r.genres.map((g: any) => g.name)
    : (r.genre_ids ?? []).map((id: number) => genreMap[id]).filter(Boolean);

  return {
    id: r.id,
    type,
    title: r.title ?? r.name ?? "",
    year: ((r.release_date ?? r.first_air_date ?? "").slice(0, 4) || null) as string | null,
    poster: r.poster_path ? `${IMG_BASE}${r.poster_path}` : null,
    backdrop: r.backdrop_path ? `${IMG_BASE_ORIGINAL}${r.backdrop_path}` : null,
    overview: r.overview ?? "",
    vote_average: typeof r.vote_average === "number" ? Math.round(r.vote_average * 10) / 10 : null,
    genres,
  };
}

function getKnownForScore(c: any) {
  const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const character = String(c?.character ?? "").trim().toLowerCase();
  const isSelf = !character || ["self", "himself", "herself", "host", "narrator"].some((role) => character.startsWith(role));
  const isVoice = character.includes("voice");

  if (!c.poster_path || isSelf || (c.vote_count ?? 0) < 50) return null;

  let roleWeight = 0.4;
  if (c.media_type === "tv") {
    const episodes = Number(c.episode_count ?? 0);
    if (episodes < 2 || (episodes < 5 && isVoice)) return null;
    roleWeight = episodes === 2 ? 0.22 : clamp(Math.log1p(episodes) / Math.log1p(60), 0.28, 1);
  } else if (typeof c.order === "number") {
    roleWeight = clamp(1 - c.order / 20, 0.18, 1);
  }

  const popularityScore = clamp(Math.log1p(c.popularity ?? 0) / Math.log1p(350));
  const voteCountScore = clamp(Math.log1p(c.vote_count ?? 0) / Math.log1p(8000));
  const ratingScore = clamp(((c.vote_average ?? 0) - 4) / 4);

  return roleWeight * 55 + popularityScore * 25 + voteCountScore * 12 + ratingScore * 8;
}

export async function search(
  query: string,
  type: "multi" | "movie" | "tv" = "multi"
) {
  const endpoint =
    type === "movie"
      ? "/search/movie"
      : type === "tv"
      ? "/search/tv"
      : "/search/multi";

  try {
    const { data } = await safeGet(endpoint, {
      params: { query, include_adult: false },
    });
    const results = (data?.results ?? [])
      .filter((r: any) => r.media_type !== "person")
      .map(normalizeSearchResult);
    return { results };
  } catch (err: any) {
    throw ServiceError.internalServerError(`TMDB search failed: ${err.message}`);
  }
}

export async function getTrending(
  type: "all" | "movie" | "tv" = "all",
  window: "day" | "week" = "day"
) {
  try {
    const { data } = await safeGet(`/trending/${type}/${window}`, {
      params: { include_adult: false },
    });
    const results = (data?.results ?? [])
      .filter((r: any) => r.media_type !== "person")
      .map(normalizeSearchResult);
    return { results };
  } catch (err: any) {
    throw ServiceError.internalServerError(`TMDB trending failed: ${err.message}`);
  }
}

export async function getMovieDetails(tmdbId: number) {
  try {
    const { data } = await safeGet(`/movie/${tmdbId}`, {
      params: { append_to_response: "credits,videos" },
    });
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      throw ServiceError.notFound(`Movie not found: ${tmdbId}`);
    }
    throw ServiceError.internalServerError(`TMDB movie details failed: ${err.message}`);
  }
}

export async function getTvDetails(tmdbId: number) {
  try {
    const { data } = await safeGet(`/tv/${tmdbId}`, {
      params: { append_to_response: "credits,videos" },
    });
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      throw ServiceError.notFound(`TV show not found: ${tmdbId}`);
    }
    throw ServiceError.internalServerError(`TMDB tv details failed: ${err.message}`);
  }
}

export async function getTvSeasonDetails(tmdbId: number, season: number) {
  try {
    const { data } = await safeGet(`/tv/${tmdbId}/season/${season}`);
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      throw ServiceError.notFound(`Season not found: tv=${tmdbId} season=${season}`);
    }
    throw ServiceError.internalServerError(`TMDB season details failed: ${err.message}`);
  }
}

export async function getTvAllEpisodes(tmdbId: number) {
  const tv = await getTvDetails(tmdbId);
  const seasons: Array<{ season_number: number; id?: number; name?: string }> =
    Array.isArray(tv?.seasons) ? tv.seasons : [];

  if (seasons.length === 0) {
    return { tmdbId, tvId: tv?.id ?? tmdbId, episodes: [], totalEpisodes: 0, totalSeasons: 0 };
  }

  try {
    const seasonDetails = await Promise.all(
      seasons.map(async (s) => {
        const seasonNumber = Number(s.season_number);
        const { data } = await safeGet(`/tv/${tmdbId}/season/${seasonNumber}`);
        return { seasonNumber, data };
      })
    );

    const episodes = seasonDetails.flatMap(({ seasonNumber, data }) => {
      const eps = Array.isArray(data?.episodes) ? data.episodes : [];
      return eps.map((ep: any) => ({
        tvId: tmdbId,
        season: seasonNumber,
        episode: ep.episode_number,
        id: ep.id,
        name: ep.name ?? "",
        overview: ep.overview ?? "",
        air_date: ep.air_date ?? null,
        still: ep.still_path ? `${IMG_BASE}${ep.still_path}` : null,
        runtime: ep.runtime ?? null,
      }));
    });

    episodes.sort((a, b) => a.season - b.season || a.episode - b.episode);

    return {
      tmdbId,
      tvId: tv?.id ?? tmdbId,
      episodes,
      totalEpisodes: episodes.length,
      totalSeasons: seasons.length,
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      throw ServiceError.notFound(`Episodes not found: tv=${tmdbId}`);
    }
    throw ServiceError.internalServerError(`TMDB all episodes failed: ${err.message}`);
  }
}

export async function getRecommendations(tmdbId: number, type: "movie" | "tv") {
  try {
    const { data } = await safeGet(`/${type}/${tmdbId}/recommendations`);
    const results = (data?.results ?? []).map(normalizeSearchResult);
    return { results };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      throw ServiceError.notFound(`${type === "movie" ? "Movie" : "TV show"} not found: ${tmdbId}`);
    }
    throw ServiceError.internalServerError(`TMDB recommendations failed: ${err.message}`);
  }
}

export async function getCollection(collectionId: number) {
  try {
    const { data } = await safeGet(`/collection/${collectionId}`);
    const parts = (data?.parts ?? [])
      .map((part: any) => normalizeSearchResult({ ...part, media_type: "movie" }))
      .sort((a: any, b: any) => (a.year ?? "9999").localeCompare(b.year ?? "9999"));

    return {
      id: data?.id,
      name: data?.name ?? "",
      overview: data?.overview ?? "",
      poster: data?.poster_path ? `${IMG_BASE}${data.poster_path}` : null,
      backdrop: data?.backdrop_path ? `${IMG_BASE_ORIGINAL}${data.backdrop_path}` : null,
      parts,
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      throw ServiceError.notFound(`Collection not found: ${collectionId}`);
    }
    throw ServiceError.internalServerError(`TMDB collection failed: ${err.message}`);
  }
}

export async function getImages(tmdbId: number, type: "movie" | "tv") {
  try {
    const { data } = await safeGet(`/${type}/${tmdbId}/images`, {
      params: { include_image_language: "en,null" },
    });
    const logos = (data?.logos ?? []) as any[];
    const sorted = logos
      .filter((l: any) => l.file_path)
      .sort((a: any, b: any) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
    const logo = sorted.find((l: any) => l.file_path?.endsWith(".png")) ?? sorted[0] ?? null;
    return {
      logoUrl: logo ? `https://image.tmdb.org/t/p/w500${logo.file_path}` : null,
    };
  } catch {
    return { logoUrl: null };
  }
}

export async function getTopRated(type: "movie" | "tv") {
  try {
    const { data } = await safeGet(`/${type}/top_rated`);
    const results = (data?.results ?? []).map(normalizeSearchResult);
    return { results };
  } catch (err: any) {
    throw ServiceError.internalServerError(`TMDB top rated failed: ${err.message}`);
  }
}

export async function getPopular(type: "movie" | "tv") {
  try {
    const { data } = await safeGet(`/${type}/popular`);
    const results = (data?.results ?? []).map((r: any) =>
      normalizeSearchResult({ ...r, media_type: type })
    );
    return { results };
  } catch (err: any) {
    throw ServiceError.internalServerError(`TMDB popular failed: ${err.message}`);
  }
}

export async function getUpcoming() {
  try {
    const { data } = await safeGet(`/movie/upcoming`);
    const results = (data?.results ?? []).map((r: any) =>
      normalizeSearchResult({ ...r, media_type: "movie" })
    );
    return { results };
  } catch (err: any) {
    throw ServiceError.internalServerError(`TMDB upcoming failed: ${err.message}`);
  }
}

export async function getGenres(type: "movie" | "tv") {
  try {
    const { data } = await safeGet(`/genre/${type}/list`);
    return { genres: data?.genres ?? [] };
  } catch (err: any) {
    throw ServiceError.internalServerError(`TMDB genres failed: ${err.message}`);
  }
}

export async function discoverByGenre(type: "movie" | "tv", genreId: number) {
  try {
    const { data } = await safeGet(`/discover/${type}`, {
      params: { with_genres: genreId, sort_by: "popularity.desc", include_adult: false },
    });
    const results = (data?.results ?? []).map(normalizeSearchResult);
    return { results };
  } catch (err: any) {
    throw ServiceError.internalServerError(`TMDB discover failed: ${err.message}`);
  }
}

export async function getPersonDetails(personId: number) {
  try {
    const { data } = await safeGet(`/person/${personId}`, {
      params: { append_to_response: "combined_credits" },
    });

    const cast = (data?.combined_credits?.cast ?? []) as any[];

    const dedupe = (arr: any[]) =>
      arr.filter((c, i, a) => a.findIndex((x: any) => x.id === c.id && x.media_type === c.media_type) === i);

    const knownFor = dedupe(
      cast
        .map((c) => ({ ...c, knownForScore: getKnownForScore(c) }))
        .filter((c) => c.knownForScore !== null)
    )
      .sort((a: any, b: any) => b.knownForScore - a.knownForScore)
      .slice(0, 12)
      .map(normalizeSearchResult);

    const allCredits = dedupe(cast.filter((c) => c.poster_path));

    const movies = allCredits
      .filter((c: any) => c.media_type === "movie")
      .sort((a: any, b: any) => (b.release_date ?? "").localeCompare(a.release_date ?? ""))
      .map(normalizeSearchResult);

    const shows = allCredits
      .filter((c: any) => c.media_type === "tv")
      .sort((a: any, b: any) => (b.first_air_date ?? "").localeCompare(a.first_air_date ?? ""))
      .map(normalizeSearchResult);

    return {
      id: data.id,
      name: data.name,
      biography: data.biography,
      birthday: data.birthday,
      place_of_birth: data.place_of_birth,
      known_for_department: data.known_for_department,
      profile_path: data.profile_path,
      knownFor,
      movies,
      shows,
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      throw ServiceError.notFound(`Person not found: ${personId}`);
    }
    throw ServiceError.internalServerError(`TMDB person details failed: ${err.message}`);
  }
}
