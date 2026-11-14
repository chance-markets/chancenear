import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { ThemeProvider } from "@/components/shell/ThemeProvider";
import { DARK_QUERY, THEME_BAR, THEME_COOKIE, isThemePref, type ThemePref } from "@/lib/theme";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: "Chance Lite",
  description: "A judge between AI agents and the NEAR Intents Agent API that learns from every mistake it stops.",
  icons: { icon: "/brand/icon_2.png" },
};

async function themeOf(): Promise<ThemePref> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return isThemePref(v) ? v : "light";
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await themeOf();
  const themeColor = theme === "system" ? [{ media: DARK_QUERY, color: THEME_BAR.dark }, { color: THEME_BAR.light }] : THEME_BAR[theme];
  return { themeColor, width: "device-width", initialScale: 1 };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await themeOf();
  return (
    <html lang="en" data-theme={theme} className={geist.variable}>
      <body>
        <ThemeProvider initial={theme}>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
