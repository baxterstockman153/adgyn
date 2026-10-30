import type { ReactNode } from "react";
import { loadWorkspace } from "@/lib/smart-sleeves-server";
import { Shell } from "./shell";
import "./workspace.css";

export const dynamic = "force-dynamic";

export default async function SmartSleeveLayout({ children }: { children: ReactNode }) {
  const { cafe, hasOutreach } = await loadWorkspace();
  return <Shell cafe={cafe} hasOutreach={hasOutreach}>{children}</Shell>;
}
