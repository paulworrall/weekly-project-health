"use client";

/**
 * Accessible tabs (WAI-ARIA tabs pattern): arrow keys move between tabs, Home / End jump,
 * the selected tab is the only one in the Tab order.
 */
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabDef<K extends string> {
  key: K;
  label: ReactNode;
  /** Muted line under the label. */
  subtitle?: ReactNode;
}

export function Tabs<K extends string>({
  label,
  tabs,
  value,
  onChange,
  children,
}: {
  label: string;
  tabs: TabDef<K>[];
  value: K;
  onChange: (key: K) => void;
  /** The selected tab's panel. */
  children: ReactNode;
}) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.key === value)
  );

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : e.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].key);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label={label} className="flex flex-wrap border-b-2 border-navy">
        {tabs.map((t, i) => {
          const selected = t.key === value;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.key)}
              onKeyDown={onKeyDown}
              className={`-mb-[2px] flex min-h-14 cursor-pointer flex-col items-start justify-center gap-0.5 border-2 px-5 pt-3 pb-2.5 text-left ${
                selected
                  ? "border-navy border-b-white bg-white text-navy"
                  : "border-transparent bg-transparent text-navy hover:bg-white"
              }`}
            >
              <span className="text-[18px] font-medium">{t.label}</span>
              {t.subtitle ? <span className="text-[14px] text-muted">{t.subtitle}</span> : null}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel-${tabs[index].key}`}
        aria-labelledby={`${base}-tab-${tabs[index].key}`}
        tabIndex={0}
        className="flex flex-col gap-7 pt-7 focus-visible:outline-offset-4"
      >
        {children}
      </div>
    </div>
  );
}
