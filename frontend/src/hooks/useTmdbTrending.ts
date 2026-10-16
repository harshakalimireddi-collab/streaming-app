import { useEffect, useState } from "react";
import { trendingTmdb, type SearchResult } from "../api/tmdb";

type SearchType = "multi" | "movie" | "tv";
type TrendingWindow = "day" | "week";

export function useTmdbTrending(params: {
  type: SearchType;
  window: TrendingWindow;
  enabled: boolean;
}) {
  const { type, window, enabled } = params;

  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const tmdbType = type === "multi" ? "all" : type;
        const data = await trendingTmdb(tmdbType, window);
        if (!cancelled) setTrending(data.results ?? []);
      } catch {
        if (!cancelled) {
          setError("Trending failed. Is the backend running?");
          setTrending([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [type, window, enabled]);

  return {
    trending,
    loading,
    error,
  };
}
