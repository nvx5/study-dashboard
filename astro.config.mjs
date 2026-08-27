import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
    persistState: true,
  }),
  session: false,
  devToolbar: {
    enabled: false,
  },
  vite: {
    ssr: {
      optimizeDeps: {
        include: ["astro/assets/services/noop"],
      },
    },
  },
});
