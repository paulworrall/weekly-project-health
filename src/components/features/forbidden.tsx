import Link from "next/link";

/** Shown when a signed-in user opens a page their role can't see. */
export function Forbidden({ backHref }: { backHref: string }) {
  return (
    <div className="max-w-[640px] bg-white p-7">
      <h1 className="text-[32px] font-light">You don&apos;t have access to this page</h1>
      <p className="mt-3 text-[15px]">It is for the Admin only.</p>
      <Link href={backHref} className="mt-5 inline-flex min-h-11 items-center underline">
        Back to your start page
      </Link>
    </div>
  );
}
