#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const fg = (await import("fast-glob")).default;

const patterns = process.argv.slice(2);
if (patterns.length === 0) { console.error("usage: lint-tokens.mjs <glob...>"); process.exit(2); }
const files = await fg(patterns);
if (files.length === 0) { console.log("OK — no files matched lint:tokens globs."); process.exit(0); }

// Resolve the checker by filesystem path (not via exports map, which omits scripts/).
const require = createRequire(import.meta.url);
const pkgDir = path.dirname(require.resolve("matcha-oat-design-system/tailwind-preset"));
const checker = path.join(pkgDir, "scripts", "check-no-raw-values.mjs");
const res = spawnSync(process.execPath, [checker, ...files], { stdio: "inherit" });
process.exit(res.status ?? 1);
