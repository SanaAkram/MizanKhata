import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't emit CLAUDE.md / agent rule files into the repo.
  agentRules: false,
};

export default nextConfig;
