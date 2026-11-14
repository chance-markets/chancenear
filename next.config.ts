import type { NextConfig } from "next";

const config: NextConfig = {
  // postgres and the Agent API SDK run on the server only.
  serverExternalPackages: ["postgres"],
  poweredByHeader: false,
};

export default config;
