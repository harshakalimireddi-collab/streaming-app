import apiClient from "./axiosInstance";

export type MediaType = "movie" | "tv";

export interface SearchResult {
  id: number;
  type: MediaType;
  title: string;
  year: string | null;
  poster: string | null;
  backdrop: string | null;
  overview: string;
  vote_average: number | null;
  genres: string [];
}

export interface SearchResponse {
  results: SearchResult[];
}

export const searchTmdb = async (
  q: string,
  type: "multi" | "movie" | "tv" = "multi"
) => {
  const res = await apiClient.get<SearchResponse>("/tmdb/search", {
    params: { q, type },
  });
  return res.data;
};

export interface TrendingResponse {
  results: SearchResult[];
}

export const trendingTmdb = async (
  type: "all" | "movie" | "tv" = "all",
  window: "day" | "week" = "day"
) => {
  const res = await apiClient.get<TrendingResponse>("/tmdb/trending", {
    params: { type, window },
  });
  return res.data;
};

export const recommendationsTmdb = async (
  type: "movie" | "tv",
  tmdbId: number
) => {
  const res = await apiClient.get<{ results: SearchResult[] }>(
    `/tmdb/${type}/${tmdbId}/recommendations`
  );
  return res.data;
};

export interface CollectionResponse {
  id: number;
  name: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  parts: SearchResult[];
}

export const getCollectionTmdb = async (collectionId: number) => {
  const res = await apiClient.get<CollectionResponse>(`/tmdb/collection/${collectionId}`);
  return res.data;
};

export const getTitleImages = async (type: "movie" | "tv", tmdbId: number) => {
  const res = await apiClient.get<{ logoUrl: string | null }>(
    `/tmdb/${type}/${tmdbId}/images`
  );
  return res.data;
};

export const topRatedTmdb = async (type: "movie" | "tv") => {
  const res = await apiClient.get<{ results: SearchResult[] }>(`/tmdb/top-rated/${type}`);
  return res.data;
};

export type Genre = { id: number; name: string };

export const getGenresTmdb = async (type: "movie" | "tv") => {
  const res = await apiClient.get<{ genres: Genre[] }>(`/tmdb/genres/${type}`);
  return res.data;
};

export const discoverByGenreTmdb = async (type: "movie" | "tv", genreId: number) => {
  const res = await apiClient.get<{ results: SearchResult[] }>(`/tmdb/discover/${type}/${genreId}`);
  return res.data;
};

export type PersonDetails = {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  place_of_birth?: string;
  known_for_department?: string;
  profile_path?: string | null;
  knownFor: SearchResult[];
  movies: SearchResult[];
  shows: SearchResult[];
};
 
export const getPersonDetailsTmdb = async (personId: number) => {
  const res = await apiClient.get<PersonDetails>(`/tmdb/person/${personId}`);
  return res.data;
};
 
