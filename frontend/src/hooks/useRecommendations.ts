import { useEffect, useState } from "react";
import { recommendationsTmdb, type SearchResult } from "../api/tmdb";

export function useRecommendations(tmdbId: number, type: string | undefined) {
  const [recommendations, setRecommendations] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!type || !tmdbId || (type !== "movie" && type !== "tv")) return;
    recommendationsTmdb(type, tmdbId)
      .then(d => setRecommendations(d.results ?? []))
      .catch(() => {});
  }, [tmdbId, type]);

  return recommendations;
}