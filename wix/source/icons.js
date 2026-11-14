const sharp = require("sharp");
const path = require("path");
const root = process.argv[2];
const out = path.join(root, "wix/images");
const src = path.join(root, "src/assets/assets/rankoya_icon_dark.png");
(async () => {
  const L = 129, T = 126, S = 997, R = 230; // the navy square's bounds and corner radius
  const { data, info } = await sharp(src)
    .extract({ left: L, top: T, width: S, height: S })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const C = info.channels;
  const navy = [5, 17, 44];
  // Fill the white rounded corners with navy so the icon is a full-bleed square.
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const cx = x < R ? R : x > S - 1 - R ? S - 1 - R : x;
      const cy = y < R ? R : y > S - 1 - R ? S - 1 - R : y;
      if ((x - cx) ** 2 + (y - cy) ** 2 > (R - 6) ** 2) {
        const i = (y * S + x) * C;
        data[i] = navy[0];
        data[i + 1] = navy[1];
        data[i + 2] = navy[2];
      }
    }
  const buf = await sharp(data, { raw: { width: S, height: S, channels: C } }).png().toBuffer();
  await sharp(buf).resize(1000, 1000, { kernel: "lanczos3" }).png().toFile(path.join(out, "app-icon-1000x1000.png"));
  await sharp(buf).resize(400, 400, { kernel: "lanczos3" }).png().toFile(path.join(out, "company-logo-square-400x400.png"));
  await sharp(path.join(root, "src/assets/brand/logo-light.png")).png().toFile(path.join(out, "company-logo-horizontal-light-bg.png"));
  await sharp(path.join(root, "src/assets/brand/logo-dark.png")).png().toFile(path.join(out, "company-logo-horizontal-dark-bg.png"));
  console.log("icons done");
})();
