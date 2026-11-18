"use client";

/**
 * The HTML report page's frame (brief 07): a toolbar (Download PowerPoint, Print) that is hidden
 * when printing, and the slides scaled down to fit narrow windows (full size when printed).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";

export function ReportView({
  title,
  subtitle,
  pptxHref,
  children,
}: {
  title: string;
  subtitle: string;
  pptxHref: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setZoom(Math.min(1, (el.clientWidth - 32) / 1280));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="min-h-screen bg-line-soft">
      <div className="report-toolbar sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-navy px-4 py-3 text-white sm:px-8">
        <div>
          <h1 className="text-[18px] font-medium">{title}</h1>
          <p className="text-[13px] opacity-90">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={pptxHref} download className={buttonClasses("onNavy", "md")}>
            Download PowerPoint
          </a>
          <button
            type="button"
            className={buttonClasses("onNavyOutline", "md")}
            onClick={() => window.print()}
          >
            Print or save as PDF
          </button>
        </div>
      </div>
      <main className="report-stack flex flex-col items-center gap-6 px-4 py-6" style={{ zoom }}>
        {children}
      </main>
    </div>
  );
}
