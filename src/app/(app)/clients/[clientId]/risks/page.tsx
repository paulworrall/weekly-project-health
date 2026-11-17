import type { Metadata } from "next";
import { LogPage } from "@/components/features/log-page";

export const metadata: Metadata = { title: "Risk log" };

export default async function Page(props: PageProps<"/clients/[clientId]/risks">) {
  const { clientId } = await props.params;
  return <LogPage clientId={clientId} kind="RISK" searchParams={await props.searchParams} />;
}
