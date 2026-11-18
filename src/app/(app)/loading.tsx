/** Brief 08: shown while a signed-in page loads its data. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="bg-white p-7">
      <p className="eyebrow mb-2.5">Loading</p>
      <p className="text-[20px] font-light">Loading the latest figures…</p>
      <div aria-hidden="true" className="mt-5 space-y-3">
        <div className="h-4 w-2/3 animate-pulse bg-cream" />
        <div className="h-4 w-1/2 animate-pulse bg-cream" />
        <div className="h-4 w-3/5 animate-pulse bg-cream" />
      </div>
    </div>
  );
}
