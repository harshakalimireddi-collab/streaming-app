import { useEffect, useRef, useState } from "react";

export function useSlideshow(count: number, animationDurationMs = 700, autoRotateMs = 10000) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const animationTimeoutRef = useRef<number | null>(null);

  function transitionTo(idx: number) {
    if (idx === activeIdx) return;
    if (animationTimeoutRef.current !== null) {
      window.clearTimeout(animationTimeoutRef.current);
    }
    setPrevIdx(activeIdx);
    setAnimating(true);
    setActiveIdx(idx);
    animationTimeoutRef.current = window.setTimeout(() => {
      setPrevIdx(null);
      setAnimating(false);
      animationTimeoutRef.current = null;
    }, animationDurationMs);
  }

  function goTo(idx: number) {
    if (animating) return;
    transitionTo(idx);
  }

  useEffect(() => {
    if (count < 2) return;
    const t = window.setTimeout(() => {
      transitionTo((activeIdx + 1) % count);
    }, autoRotateMs);
    return () => window.clearTimeout(t);
  }, [activeIdx, count]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current !== null) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return { activeIdx, prevIdx, animating, goTo };
}
