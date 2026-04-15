import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default withSentryConfig(nextConfig, {
  // Silent during build unless CI
  silent: !process.env.CI,
  // Sentry org/project (read from env)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: false,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    autoInstrumentServerFunctions: true,
    autoInstrumentMiddleware: true,
  },
});
