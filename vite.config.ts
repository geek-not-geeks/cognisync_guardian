import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Hand-written replacement for @lovable.dev/vite-tanstack-config.
// That package did three categories of things:
//   1. Core plugin wiring (tailwind, tsconfig paths, TanStack Start, React,
//      and nitro with a Cloudflare preset for the production build) — kept
//      below, written out explicitly.
//   2. Lovable-sandbox-only behavior (asset proxying to *.lovable.app, an
//      HMR gate plugin, a dev-server bridge, sandbox-specific host/port
//      enforcement) — dropped entirely; none of it does anything outside
//      Lovable's own hosted IDE, which this project no longer runs in.
//   3. Dev-only convenience logging that posted errors to Lovable's own dev
//      UI via custom HMR events — dropped; standard Vite/terminal error
//      output covers this during local development.
export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      server: { entry: "server" },
    }),
    // nitro builds the deployable server output; only needed for `vite build`.
    ...(command === "build" ? [nitro({ preset: "cloudflare-module" })] : []),
    viteReact(),
  ],
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  server: {
    host: true,
    port: 8080,
  },
}));
