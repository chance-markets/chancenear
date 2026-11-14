import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { ThemeProvider } from "@/components/shell/ThemeProvider";
import { DARK_QUERY, THEME_BAR, THEME_COOKIE, isThemePref, type ThemePref } from "@/lib/theme";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

const SITE = process.env.PUBLIC_BASE_URL || "https://web-production-a3b908a4.up.railway.app";
const DESCRIPTION =
  "ChanceNear is the self-improvement stack for AI agents on NEAR Intents. It checks every action an agent proposes before it runs (intent match against the user's own words, prompt-injection taint tracking, NEAR Intents dry runs and live quotes, and a NEAR AI Cloud judge whose TEE signature is verified), then turns each mistake into a lesson the agent loads before its next action, and measures the mistakes falling.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "ChanceNear: the self-improvement stack for NEAR agents", template: "%s · ChanceNear" },
  description: DESCRIPTION,
  applicationName: "ChanceNear",
  keywords: ["AI agent guard", "agent security", "prompt injection", "NEAR Intents", "Agent API", "NEAR AI Cloud", "TEE", "self-improving agents", "agent playbook", "MCP"],
  openGraph: { type: "website", siteName: "ChanceNear", title: "ChanceNear: the self-improvement stack for NEAR agents", description: DESCRIPTION, url: SITE },
  twitter: { card: "summary", title: "ChanceNear: the self-improvement stack for NEAR agents", description: DESCRIPTION },
  alternates: { types: { "text/plain": "/llms.txt", "text/markdown": "/skill.md" } },
  icons: { icon: "/brand/icon_2.png" },
};

/** What the product is, in schema.org terms, for any reader that parses structured data. Every feature is in the code. */
const STRUCTURED = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ChanceNear",
  url: SITE,
  description: DESCRIPTION,
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  isAccessibleForFree: true,
  license: "https://opensource.org/licenses/MIT",
  sameAs: ["https://github.com/chance-markets/chance-lite"],
  featureList: [
    "Pre-execution judgment of NEAR Intents Agent API swaps, transfers, withdrawals and limit orders",
    "Intent match against the user's own words: amounts, token decimals, shares of a balance, tokens, chain, payee, buy or sell",
    "Prompt-injection taint tracking: blocks actions whose recipient, amount or kind came from untrusted content",
    "Grounding in NEAR Intents dry runs and live 1Click quotes",
    "NEAR AI Cloud judge in a TEE with verified response signatures",
    "Self-improvement loop: every block becomes a lesson in the agent's playbook, delivered in verdicts, playbook.md and MCP",
    "Measured learning: prevented mistakes, repeats, and rehearsal rounds",
    "Optional SFT and DPO fine-tune export for open-weight models",
  ],
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED) }} />
        <ThemeProvider initial={theme}>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
