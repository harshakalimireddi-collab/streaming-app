import { useEffect, useState } from "react";
import { getCollectionTmdb, type CollectionResponse } from "../api/tmdb";

export function useCollection(collectionId?: number | null) {
  const [collection, setCollection] = useState<CollectionResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!collectionId) {
      setCollection(null);
      return;
    }

    setCollection(null);
    getCollectionTmdb(collectionId)
      .then((data) => {
        if (!cancelled) setCollection(data);
      })
      .catch(() => {
        if (!cancelled) setCollection(null);
      });

    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  return collection;
}
