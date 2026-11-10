#!/usr/bin/env node
/**
 * Zips the agency website template (agency/rankoya_agency_page) into
 * public/agency/rankoya-agency-template.zip, which the Agency kit page offers
 * as a download. Source files only: node_modules, dist, .git and local files
 * are left out, so users run `npm install` themselves.
 *
 *   npm run agency:zip
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import zlib from "node:zlib";

const SOURCE = "agency/rankoya_agency_page";
const OUTPUT = "public/agency/rankoya-agency-template.zip";
/** Folder name users see when they unzip. */
const ROOT_FOLDER = "rankoya-agency-template";

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".vercel", ".claude", ".idea", ".vscode"]);
const SKIP_FILES = [/\.tsbuildinfo$/, /\.local$/, /^\.env/, /^\.DS_Store$/, /^Thumbs\.db$/, /\.log$/];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : walk(path);
    return SKIP_FILES.some((re) => re.test(entry.name)) ? [] : [path];
  });
}

// zlib.crc32 exists from Node 22.2; fall back to a table for older versions.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 =
  zlib.crc32 ??
  ((buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  });

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

const files = walk(SOURCE).sort();
const locals = [];
const centrals = [];
let offset = 0;

for (const path of files) {
  const name = Buffer.from(`${ROOT_FOLDER}/${relative(SOURCE, path).split(sep).join("/")}`, "utf8");
  const data = readFileSync(path);
  const deflated = zlib.deflateRawSync(data, { level: 9 });
  // Store already-compressed files (images, fonts) as-is when deflate doesn't help.
  const stored = deflated.length >= data.length;
  const body = stored ? data : deflated;
  const crc = crc32(data);
  const { time, day } = dosDateTime(statSync(path).mtime);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(stored ? 0 : 8, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(day, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(stored ? 0 : 8, 10);
  central.writeUInt16LE(time, 12);
  central.writeUInt16LE(day, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);

  locals.push(local, name, body);
  centrals.push(central, name);
  offset += local.length + name.length + body.length;
}

const centralDir = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDir.length, 12);
end.writeUInt32LE(offset, 16);

const zip = Buffer.concat([...locals, centralDir, end]);
mkdirSync(join(OUTPUT, ".."), { recursive: true });
writeFileSync(OUTPUT, zip);
console.log(`Wrote ${OUTPUT}: ${files.length} files, ${(zip.length / 1024).toFixed(0)} KB`);
