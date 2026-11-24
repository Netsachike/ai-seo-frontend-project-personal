const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const root = process.argv[2], sp = __dirname;
const toUrl = (p) => "file:///" + p.split(path.sep).join("/");
let html = fs.readFileSync(path.join(sp, "shots.html"), "utf8")
  .replace("FONT_SANS", toUrl(path.join(root, "node_modules/next/dist/next-devtools/server/font/geist-latin.woff2")))
  .replace("FONT_MONO", toUrl(path.join(root, "node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2")))
  .replaceAll("LOGO_DARKBG", toUrl(path.join(root, "src/assets/brand/logo-dark.png")));
fs.writeFileSync(path.join(sp, "shots.built.html"), html);
const names = { s1: "01-overview", s2: "02-ai-visibility", s3: "03-approve-articles", s4: "04-wix-blog-publishing" };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto(toUrl(path.join(sp, "shots.built.html")));
  await page.evaluate(() => document.fonts.ready);
  for (const [id, name] of Object.entries(names))
    await page.locator("#" + id).screenshot({ path: path.join(root, "wix/images/screenshots", name + ".png") });
  await browser.close();
  console.log("done");
})();
