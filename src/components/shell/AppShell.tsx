import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

/** The whole window: one grey page, the sidebar on it, and the white island that holds each page. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="window">
      <Sidebar />
      <main className="island">{children}</main>
    </div>
  );
}
