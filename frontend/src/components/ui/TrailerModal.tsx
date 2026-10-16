import { CloseIcon } from "./Icons";

type Props = {
  url: string;
  name: string | undefined;
  onClose: () => void;
};

export function TrailerModal({ url, name, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md px-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0e0e14] rounded-2xl border border-white/15 p-4 shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded-full bg-[#e50914]" />
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-md">
              {name || "Official Trailer Preview"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close trailer"
            className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <CloseIcon size={14} />
          </button>
        </div>
        <div className="aspect-video rounded-xl overflow-hidden border border-white/10 bg-black shadow-inner">
          <iframe
            src={url}
            title={name ?? "Trailer"}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
