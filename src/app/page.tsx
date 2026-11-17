import { redirect } from "next/navigation";
import { landingPath } from "@/lib/permissions";
import { getViewer } from "@/lib/viewer";
import { DEFAULT_CLIENT_ID } from "@/mocks/repository";

/** "/" sends each role to its landing page, or to sign in. */
export default async function Home() {
  const viewer = await getViewer();
  redirect(viewer ? landingPath(viewer, DEFAULT_CLIENT_ID) : "/login");
}
