import { useEffect, useState } from "react";
import { searchTmdb, type SearchResult } from "../api/tmdb";

type SearchType = "multi" | "movie" | "tv";

export function useTmdbSearch(params: {
  query: string;
  type: SearchType;
  enabled: boolean;
}) {
  const { query, type, enabled } = params;

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const data = await searchTmdb(query, type);
        if (!cancelled) setResults(data.results ?? []);
      } catch {
        if (!cancelled) {
          setError("Search failed. Is the backend running?");
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [query, type, enabled]);

  return {
    results,
    loading,
    error,
  };
}
