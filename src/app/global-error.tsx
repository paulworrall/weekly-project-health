"use client";

import "./globals.css";

/**
 * Brief 08: last resort when the root layout itself fails. Plain markup (the layout, its font
 * and the app header aren't available here).
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen bg-cream text-navy">
        <header className="bg-navy px-4 py-4 text-[15px] font-medium text-white sm:px-8">
          Weekly Project Health
        </header>
        <main id="main" className="px-4 pt-6 sm:px-8">
          <div role="alert" className="max-w-[640px] bg-white p-7">
            <h1 className="text-[32px] font-light">Something went wrong</h1>
            <p className="mt-3 text-[15px]">
              The tool couldn&apos;t start. Reload the page in a moment; if it keeps happening, tell
              the Admin
              {error.digest ? ` and quote reference ${error.digest}` : ""}.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 min-h-11 cursor-pointer border border-navy bg-navy px-4 text-[14px] font-medium text-white"
            >
              Reload the page
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
