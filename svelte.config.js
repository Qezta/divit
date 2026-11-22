import vercel from "@sveltejs/adapter-vercel";
import staticAdapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // The mirror intentionally omits dynamic routes such as /api/chat.
    adapter:
      process.env.VITE_IPFS_MIRROR === "1"
        ? staticAdapter({ pages: "build/ipfs", strict: false })
        : vercel({ runtime: "nodejs22.x" }),
  },
};

export default config;
