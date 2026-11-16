// Builds public/index.html from src/ and data/. Run: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const r = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const js = ["logic.js", "store.js", "ui1.js", "ui2.js", "ui3.js"].map(f => r("src/" + f)).join("\n");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#d6322a">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icon-180.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
${r("src/head.html")}
</head><body>
<div id="root"></div>
<script src="https://unpkg.com/htm@3.1.1/preact/standalone.umd.js"></script>
<script>window.__GAME__=${r("data/game-data.json").trim()};</script>
<script>
${js}
</script>
</body></html>
`;
mkdirSync(new URL("../public", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/index.html", import.meta.url), html);
console.log("Built public/index.html (" + Math.round(html.length / 1024) + " KB)");
