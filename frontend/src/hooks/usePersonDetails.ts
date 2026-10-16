import { useEffect, useState } from "react";
import { getPersonDetailsTmdb, type PersonDetails } from "../api/tmdb";

export function usePersonDetails(personId: number) {
  const [data, setData] = useState<PersonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    getPersonDetailsTmdb(personId)
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [personId]);

  return { data, loading, error };
}