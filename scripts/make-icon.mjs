// Builds the site icon from the hero cutout: head and shoulders as an ember duotone on a night-plum tile.
// Usage: node scripts/make-icon.mjs . <outDir>   then copy icon.png, apple-icon.png and favicon.ico into src/app
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import path from "node:path";

const [root, out] = process.argv.slice(2).map((p) => path.resolve(p));
const require = createRequire(path.join(root, "package.json"));
const sharp = require("sharp");

const N = 512;
const R = 120; // corner radius
// Head and shoulders from the hero cutout, recoloured as an ember duotone: night plum shadows through
// inferno red to amber highlights, the site's own palette. Reads as one bold shape at tab size.
const head = await sharp(path.join(root, "public/assets/portrait-studio.webp"))
    .extract({ left: 250, top: 0, width: 360, height: 360 })
    .resize(N, N, { kernel: "lanczos3" })
    .png()
    .toBuffer();
const alpha = await sharp(head).extractChannel(3).toBuffer();
const { data, info } = await sharp(head).flatten({ background: "#000" }).grayscale().linear(1.35, -30).raw().toBuffer({ resolveWithObject: true });
const STOPS = [[15, 13, 22], [66, 10, 104], [147, 38, 103], [221, 81, 58], [252, 165, 10], [252, 211, 77]];
const rgb = Buffer.alloc(info.width * info.height * 3);
for (let i = 0; i < info.width * info.height; i++) {
    const t = (data[i] / 255) * (STOPS.length - 1);
    const k = Math.min(STOPS.length - 2, Math.floor(t));
    const f = t - k;
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = Math.round(STOPS[k][c] * (1 - f) + STOPS[k + 1][c] * f);
}
const face = await sharp(rgb, { raw: { width: info.width, height: info.height, channels: 3 } }).joinChannel(alpha).png().toBuffer();

const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}"><rect width="${N}" height="${N}" rx="${R}" fill="#0f0d16"/></svg>`);
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}"><rect width="${N}" height="${N}" rx="${R}" fill="#fff"/></svg>`);

const master = await sharp(bg)
    .composite([{ input: face }, { input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
writeFileSync(path.join(out, "icon-master.png"), master);

const png = (s) =>
    sharp(master)
        .resize(s, s, { kernel: "lanczos3" })
        .sharpen(s <= 32 ? { sigma: 0.6 } : undefined)
        .png({ compressionLevel: 9, palette: s >= 64, quality: 92 })
        .toBuffer();
writeFileSync(path.join(out, "icon.png"), await png(192));
// apple-touch: full square, iOS rounds the corners itself
writeFileSync(
    path.join(out, "apple-icon.png"),
    await sharp(await sharp(bg).composite([{ input: face }]).flatten({ background: "#0f0d16" }).png().toBuffer())
        .resize(180, 180)
        .png({ palette: true, quality: 92, compressionLevel: 9 })
        .toBuffer()
);

// favicon.ico with PNG-encoded 16, 32 and 48 px entries
const sizes = [16, 32, 48];
const imgs = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(s, e);
    header.writeUInt8(s, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(imgs[i].length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += imgs[i].length;
});
writeFileSync(path.join(out, "favicon.ico"), Buffer.concat([header, ...imgs]));

// preview: large, then the real 32 and 16 px sizes blown up, on a dark and a light tab strip
const show = async (s) => sharp(await png(s)).resize(128, 128, { kernel: "nearest" }).png().toBuffer();
const strip = async (bgc) =>
    sharp({ create: { width: 412, height: 140, channels: 4, background: bgc } })
        .composite([
            { input: await sharp(master).resize(128, 128).png().toBuffer(), left: 6, top: 6 },
            { input: await show(32), left: 142, top: 6 },
            { input: await show(16), left: 278, top: 6 },
        ])
        .png()
        .toBuffer();
await sharp({ create: { width: 412, height: 280, channels: 4, background: "#000" } })
    .composite([{ input: await strip("#35363a"), top: 0, left: 0 }, { input: await strip("#dee1e6"), top: 140, left: 0 }])
    .png()
    .toFile(path.join(out, "icon-preview.png"));
console.log("ok");
