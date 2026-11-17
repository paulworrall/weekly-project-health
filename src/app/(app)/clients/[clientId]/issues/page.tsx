import type { Metadata } from "next";
import { LogPage } from "@/components/features/log-page";

export const metadata: Metadata = { title: "Issue log" };

export default async function Page(props: PageProps<"/clients/[clientId]/issues">) {
  const { clientId } = await props.params;
  return <LogPage clientId={clientId} kind="ISSUE" searchParams={await props.searchParams} />;
}
