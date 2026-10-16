import { useEffect, useRef, useState } from "react";
import { Brand } from "../layout/Brand";

type IntroPhase = "hidden" | "visible" | "leaving";

const MIN_VISIBLE_MS = 650;
const EXIT_DURATION_MS = 720;
let hasPlayedIntro = false;

export function IntroLoader({ loading }: { loading: boolean }) {
  const [phase, setPhase] = useState<IntroPhase>(
    hasPlayedIntro ? "hidden" : "visible",
  );
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (phase === "visible" && shownAt.current === null) {
      hasPlayedIntro = true;
      shownAt.current = performance.now();
    }
  }, [phase]);

  useEffect(() => {
    if (loading || phase !== "visible" || shownAt.current === null) return;

    const elapsed = performance.now() - shownAt.current;
    const leaveTimer = window.setTimeout(
      () => setPhase("leaving"),
      Math.max(0, MIN_VISIBLE_MS - elapsed),
    );

    return () => window.clearTimeout(leaveTimer);
  }, [loading, phase]);

  useEffect(() => {
    if (phase !== "leaving") return;

    const exitDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 180
      : EXIT_DURATION_MS;
    const hideTimer = window.setTimeout(() => {
      shownAt.current = null;
      setPhase("hidden");
    }, exitDuration);

    return () => window.clearTimeout(hideTimer);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`intro-loader fixed inset-0 z-[100] grid place-items-center overflow-hidden text-white${phase === "leaving" ? " intro-loader--leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Streaming"
    >
      <div
        className="intro-loader__panel intro-loader__panel--top absolute inset-x-0 top-0 h-[50.5%] bg-[#050505] [background-image:radial-gradient(circle_at_50%_100%,rgb(229_9_20_/_0.09),transparent_24rem)]"
        aria-hidden="true"
      />
      <div
        className="intro-loader__panel intro-loader__panel--bottom absolute inset-x-0 bottom-0 h-[50.5%] bg-[#050505] [background-image:radial-gradient(circle_at_50%_0%,rgb(229_9_20_/_0.09),transparent_24rem)]"
        aria-hidden="true"
      />
      <div
        className="intro-loader__brand relative z-10 origin-center scale-[1.75] will-change-transform"
        aria-hidden="true"
      >
        <Brand
          markClassName="intro-loader__mark"
          wordmarkClassName="intro-loader__wordmark"
          linkToHome={false}
        />
      </div>
      <div
        className="intro-loader__signal absolute top-[calc(50%+3.8rem)] flex items-center gap-1.5 transition-opacity duration-200"
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
      </div>
      <div
        className="intro-loader__beam pointer-events-none absolute left-1/2 top-1/2 z-20 h-px w-screen origin-center bg-[#e50914]"
        aria-hidden="true"
      />
    </div>
  );
}
