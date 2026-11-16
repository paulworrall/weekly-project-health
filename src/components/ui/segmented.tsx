"use client";

/** Square segmented control (Open / Closed / All); the selected option is navy. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="lbl" id={`seg-${label}`}>
        {label}
      </span>
      <div role="group" aria-labelledby={`seg-${label}`} className="flex">
        {options.map((o) => {
          const selected = o === value;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(o)}
              className={`-ml-px min-h-11 cursor-pointer rounded-none border border-navy px-4 text-[15px] first:ml-0 ${
                selected ? "bg-navy font-medium text-white" : "bg-white text-navy hover:bg-cream"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
