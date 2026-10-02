// Regenerates native/assets from the web sources:
//   - i18n.json   from src/utils/translations.ts
//   - icons/*.svg from lucide-react (same icon set as the React UI)
// Run from the repo root: node native/tools/gen-assets.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const assets = resolve(root, "native/assets");
mkdirSync(resolve(assets, "icons"), { recursive: true });

// --- translations -----------------------------------------------------------
const source = readFileSync(resolve(root, "src/utils/translations.ts"), "utf8");
const start = source.indexOf("export const TRANSLATIONS = ") + "export const TRANSLATIONS = ".length;
const end = source.indexOf("} as const;", start) + 1;
const translations = new Function(`return (${source.slice(start, end)});`)();
writeFileSync(resolve(assets, "i18n.json"), JSON.stringify(translations, null, 1));
console.log(`i18n.json: ${Object.keys(translations.fr).length} fr keys, ${Object.keys(translations.en).length} en keys`);

// --- icons ------------------------------------------------------------------
const icons = [
  "activity", "arrow-down", "battery", "battery-charging", "battery-low", "bell", "bluetooth", "box",
  "check", "clock", "cpu", "crown", "disc", "download", "ethernet-port", "external-link", "eye", "eye-off",
  "flower", "gamepad-2", "globe", "hard-drive", "heart", "info", "loader-circle", "maximize-2",
  "memory-stick", "minimize-2", "minus", "monitor", "monitor-play", "moon", "refresh-cw", "rotate-ccw",
  "router", "settings", "settings-2", "signal", "square", "sun", "trash-2", "upload", "volume-2",
  "volume-x", "wifi", "x",
];

const iconDir = resolve(root, "node_modules/lucide-react/dist/esm/icons");
for (const name of icons) {
  const file = resolve(iconDir, `${name}.js`);
  if (!existsSync(file)) {
    console.warn(`missing icon: ${name}`);
    continue;
  }
  const js = readFileSync(file, "utf8");
  const from = js.indexOf("[", js.indexOf("createLucideIcon("));
  const to = js.lastIndexOf("]);") + 1;
  const nodes = new Function(`return (${js.slice(from, to)});`)();
  const body = nodes
    .map(([tag, attrs]) => {
      const attributes = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ");
      return `<${tag} ${attributes}/>`;
    })
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ` +
    `stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  writeFileSync(resolve(assets, "icons", `${name}.svg`), svg);
}
console.log(`icons: ${icons.length}`);
