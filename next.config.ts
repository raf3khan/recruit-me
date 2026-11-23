import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // PGlite loads its WebAssembly from its own package folder, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  partialPrefetching: true,
  // Migrations are read from disk when the database opens, so ship them with the server.
  outputFileTracingIncludes: { "/**": ["./drizzle/**"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
