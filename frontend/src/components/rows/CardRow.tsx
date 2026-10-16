import { type ReactNode, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "../ui/Icons";

export function CardRow({ children, scrollAmount = 640, scrollItems, resetKey, onScrollIntent }: {
  children: ReactNode;
  scrollAmount?: number;
  scrollItems?: number;
  resetKey?: unknown;
  onScrollIntent?: (dir: "left" | "right") => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resetKey === undefined) return;
    scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [resetKey]);

  const scroll = (dir: "left" | "right") => {
    const row = scrollRef.current;
    if (!row) return;
    onScrollIntent?.(dir);

    const firstCard = row.firstElementChild;
    const gap = Number.parseFloat(window.getComputedStyle(row).columnGap) || 0;
    const itemWidth = firstCard?.getBoundingClientRect().width ?? 0;
    const amount = scrollItems && itemWidth > 0
      ? (itemWidth + gap) * scrollItems
      : scrollAmount;

    row.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative group/carousel">
      <button
        type="button"
        aria-label="Scroll left"
        onPointerEnter={() => onScrollIntent?.("left")}
        onClick={() => scroll("left")}
        className="absolute left-1 sm:left-2 top-[38%] -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-black/85 hover:bg-[#e50914] backdrop-blur-md rounded-full border border-white/20 text-white shadow-xl opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 focus-visible:opacity-100"
      >
        <ChevronLeft />
      </button>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 pt-1 px-1 scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Scroll right"
        onPointerEnter={() => onScrollIntent?.("right")}
        onClick={() => scroll("right")}
        className="absolute right-1 sm:right-2 top-[38%] -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-black/85 hover:bg-[#e50914] backdrop-blur-md rounded-full border border-white/20 text-white shadow-xl opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 focus-visible:opacity-100"
      >
        <ChevronRight />
      </button>
    </div>
  );
}
