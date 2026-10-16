export function MediaTypeToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center p-1 bg-white/[0.05] rounded-xl border border-white/[0.08] shadow-inner select-none">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all duration-200 cursor-pointer ${
              isActive
                ? "bg-[#e50914] text-white shadow-md shadow-[#e50914]/25"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
