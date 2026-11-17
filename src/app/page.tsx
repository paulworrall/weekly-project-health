import { redirect } from "next/navigation";
import { landingPath } from "@/lib/permissions";
import { getViewer } from "@/lib/viewer";

/** "/" sends each role to its landing page, or to sign in. */
export default async function Home() {
  const viewer = await getViewer();
  redirect(viewer ? landingPath(viewer) : "/login");
}
