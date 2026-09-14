import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";
import hostingConfig from "./.openai/hosting.json";

function sitesManifest(): Plugin {
  return {
    name: "thor-guard-sites-manifest",
    async closeBundle() {
      const output = resolve("dist", ".openai");
      await rm(output, { recursive: true, force: true });
      await mkdir(output, { recursive: true });
      await cp(resolve(".openai", "hosting.json"), resolve(output, "hosting.json"));
    },
  };
}

export default defineConfig(async () => {
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: { port: 3000, strictPort: true },
    plugins: [
      vinext(),
      sitesManifest(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          main: "vinext/server/fetch-handler",
          compatibility_flags: ["nodejs_compat"],
        },
      }),
    ],
  };
});

void hostingConfig.project_id;
