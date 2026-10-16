import { useCallback, useState } from "react";

export function useRecentQueries(storageKey: string, limit = 8) {
  function load(): string[] {
    try {
      const raw = localStorage.getItem(storageKey);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }

  const [recent, setRecent] = useState<string[]>(() => load());

  const persist = (list: string[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(list.slice(0, limit)));
    } catch {}
  };

  const commit = useCallback(
    (query: string) => {
      const q = query.trim();
      if (q.length < 2) return;

      setRecent((prev) => {
        const next = [q, ...prev.filter((x) => x !== q)].slice(0, limit);
        persist(next);
        return next;
      });
    },
    [limit]
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setRecent([]);
  }, [storageKey]);

  return {
    recent,
    commit,
    clear,
  };
}
