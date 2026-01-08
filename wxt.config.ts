import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "翻译插件",
    permissions: ["contextMenus", "activeTab", "scripting", "storage"],
    host_permissions: ["*://*/*"],
    action: {
      default_popup: "popup.html",
    },
    version_name: "1.0.0",
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval' http://localhost:3000 http://localhost:3001; object-src 'self'",
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
    server: {
      hmr: {
        port: 3000,
      },
    },
  }),
});
