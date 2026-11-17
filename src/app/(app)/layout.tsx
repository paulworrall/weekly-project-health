import { AppHeader } from "@/components/layout/app-header";
import { requireViewer } from "@/lib/viewer";

/** Signed-in area: header with the role's nav. Each page also checks its own permissions. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireViewer();
  return (
    <>
      <AppHeader role={viewer.role} userName={viewer.name} />
      <main id="main" className="mx-auto max-w-[1360px] px-4 pt-6 pb-12 sm:px-8">
        {children}
      </main>
    </>
  );
}
