// Builds the app (public/app/index.html) from src/ and data/. The homepage is public/index.html. Run: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const r = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const env = process.env;
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
if (!url || !key) console.warn("Supabase env vars not set: building in on-device mode (no accounts).");
const config = JSON.stringify({ supabaseUrl: url, supabaseKey: key });
const js = ["logic.js", "store.js", "ui1.js", "ui2.js", "ui3.js"].map(f => r("src/" + f)).join("\n");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#d6322a">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/icon-180.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
${r("src/head.html")}
</head><body>
<div id="root"></div>
<script src="https://unpkg.com/htm@3.1.1/preact/standalone.umd.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js"></script>
<script>window.PL_CONFIG=${config};</script>
<script>window.__GAME__=${r("data/game-data.json").trim()};</script>
<script>
${js}
</script>
</body></html>
`;
mkdirSync(new URL("../public/app", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/app/index.html", import.meta.url), html);
console.log("Built public/app/index.html (" + Math.round(html.length / 1024) + " KB)");
