#!/usr/bin/env node
/**
 * Fails when a user-facing attribute is a hard-coded string literal, and
 * reports message keys that are present in `en` but missing in a locale.
 *   aria-label="Close"   → error (use t("…"))
 *   placeholder={t("x")} → fine
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/app", "src/components"];
const ATTRS = ["aria-label", "aria-description", "placeholder", "title", "alt", "label"];
const pattern = new RegExp(`\\s(${ATTRS.join("|")})="([^"]*[A-Za-z][^"]*)"`, "g");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

let failures = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const match of line.matchAll(pattern)) {
        failures++;
        console.error(`${relative(process.cwd(), file)}:${i + 1}  hard-coded ${match[1]}="${match[2]}"`);
      }
    });
  }
}

// Missing-key report (warnings only; drafts may lag behind en).
const en = JSON.parse(readFileSync("src/messages/en.json", "utf8"));
const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
const enKeys = new Set(flatten(en));
for (const name of readdirSync("src/messages")) {
  if (name === "en.json" || !name.endsWith(".json")) continue;
  const keys = new Set(flatten(JSON.parse(readFileSync(join("src/messages", name), "utf8"))));
  const missing = [...enKeys].filter((k) => !keys.has(k));
  if (missing.length)
    console.warn(`${name}: ${missing.length} key(s) fall back to en (e.g. ${missing.slice(0, 3).join(", ")})`);
}

if (failures) {
  console.error(`\n${failures} hard-coded attribute string(s). Move them to src/messages/en.json.`);
  process.exit(1);
}
console.log("i18n check passed");
