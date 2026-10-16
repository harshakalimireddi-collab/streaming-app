import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, CheckIcon } from "./Icons";
import { useDropdown } from "../../hooks/useDropdown";

export function SeasonDropdown({
  seasons,
  value,
  onChange,
}: {
  seasons: Array<{ id?: number; season_number: number; name?: string }>;
  value: number;
  onChange: (seasonNumber: number) => void;
}) {
  const { open, setOpen, pos, btnRef, wrapRef, listRef } = useDropdown();

  const selected = useMemo(() => {
    const found = seasons.find((s) => s.season_number === value);
    return found?.name ?? `Season ${value}`;
  }, [seasons, value]);

  useEffect(() => {
    if (!open) return;
    const container = listRef.current;
    if (!container) return;
    const active = container.querySelector(`[data-season="${value}"]`) as HTMLElement | null;
    if (active)
      container.scrollTop = Math.max(
        0,
        active.offsetTop - container.clientHeight / 2 + active.offsetHeight / 2
      );
  }, [open, value, listRef]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm select-none"
      >
        <span>{selected}</span>
        <span
          style={{
            display: "inline-flex",
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
          }}
        >
          <ChevronDown size={13} />
        </span>
      </button>

      {pos &&
        createPortal(
          <div
            ref={listRef}
            className="fixed rounded-xl overflow-hidden border border-white/[0.12] bg-[#14141e] py-1"
            style={{
              top: pos.top + 4,
              left: pos.left,
              zIndex: 99999,
              minWidth: 190,
              maxHeight: 320,
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.85)",
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.97)",
              pointerEvents: open ? "auto" : "none",
              transition: "opacity 0.18s ease, transform 0.18s ease",
              scrollbarWidth: "thin",
              scrollbarColor: "#333 transparent",
            }}
          >
            {seasons.map((s) => {
              const n = s.season_number;
              const name = s.name ?? `Season ${n}`;
              const active = n === value;
              return (
                <button
                  key={s.id ?? n}
                  type="button"
                  data-season={n}
                  onClick={() => {
                    onChange(n);
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold border-none cursor-pointer text-left transition-colors ${
                    active
                      ? "bg-[#e50914] text-white"
                      : "text-zinc-300 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <span>{name}</span>
                  {active && <CheckIcon size={12} />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
