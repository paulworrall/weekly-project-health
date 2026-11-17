import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Viewer } from "@/types/views";
import { getRepository } from "@/server/repository";
import { DEV_ROLE_COOKIE } from "./dev-role";

/** The signed-in viewer. Brief 01: from the dev role cookie; brief 03: from the NextAuth session. */
export async function getViewer(): Promise<Viewer | null> {
  const role = (await cookies()).get(DEV_ROLE_COOKIE)?.value;
  if (role !== "ADMIN" && role !== "UPDATER") return null;
  return (await getRepository()).viewerForRole(role);
}

/** For pages that need a signed-in viewer: sends everyone else to sign in. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}
