/**
 * Windows (Bureau) : force esbuild-wasm pour eviter spawn EPERM depuis Node.
 * npm install --ignore-scripts est OK ; ce script s execute apres.
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const esbuildPkg = "node_modules/esbuild/package.json";
if (!existsSync(esbuildPkg)) process.exit(0);

const pkg = JSON.parse(readFileSync(esbuildPkg, "utf8"));
if (pkg.name === "esbuild-wasm") process.exit(0);

console.log("Koi Monitor: bascule esbuild -> esbuild-wasm (compat Windows)...");
execSync(
  "npm install esbuild@npm:esbuild-wasm@0.25.12 --save-dev --ignore-scripts --force",
  { stdio: "inherit" },
);
