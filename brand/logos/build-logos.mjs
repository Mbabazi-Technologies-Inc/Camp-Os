// Rebuilds every file in brand/logos from code, with the lettering turned into
// outlines so printers don't need fonts.
//
// Run from a folder where these are installed:
//   npm i opentype.js@1.3.4 @fontsource/geist-sans @fontsource/fraunces
// then:
//   SHARP_PATH=<path to this repo>/node_modules/sharp node build-logos.mjs <output folder>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import opentype from "opentype.js";

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PATH);

const OUT = process.argv[2];
const fontDir = (pkg) => path.join("node_modules/@fontsource", pkg, "files");
const load = (pkg, file) => opentype.parse(fs.readFileSync(path.join(fontDir(pkg), file)).buffer);
const geist700 = load("geist-sans", "geist-sans-latin-700-normal.woff");
const geist600 = load("geist-sans", "geist-sans-latin-600-normal.woff");
const fraunces600 = load("fraunces", "fraunces-latin-600-normal.woff");

const C = {
  navy: "#0f2f37",
  amber: "#d98d2b",
  teal: "#14586b",
  white: "#fdfefd",
  peach: "#f3b97a",
  green: "#3c7146",
};

const r2 = (n) => Math.round(n * 100) / 100;

// Width of a run of text, with letter-spacing between characters.
function measure(font, text, size, tracking) {
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  const advances = glyphs.map((g) => g.advanceWidth * scale);
  const width = advances.reduce((a, b) => a + b, 0) + tracking * (glyphs.length - 1);
  return { glyphs, advances, width };
}

// Straight text as one outlined path. anchor: start | middle | end.
function textPath(font, text, x, y, size, { tracking = 0, anchor = "start", kern = true } = {}) {
  if (!tracking) {
    const w = font.getAdvanceWidth(text, size, { kerning: kern });
    const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    return { d: font.getPath(text, x0, y, size, { kerning: kern }).toPathData(2), width: w };
  }
  const { glyphs, advances, width } = measure(font, text, size, tracking);
  let cx = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  let d = "";
  glyphs.forEach((g, i) => {
    d += g.getPath(cx, y, size).toPathData(2);
    cx += advances[i] + tracking;
  });
  return { d, width };
}

// Text set along a circle, centred at the top (outside reading) or the
// bottom (inside reading), matching the SVG textPath layout of the original.
function arcText(font, text, { cx, cy, r, size, tracking, where, centerAt }) {
  const { glyphs, advances, width } = measure(font, text, size, tracking);
  let s = (centerAt ?? (Math.PI * r) / 2) - width / 2;
  const parts = [];
  glyphs.forEach((g, i) => {
    const mid = s + advances[i] / 2;
    const t = mid / r;
    let px, py, deg;
    if (where === "top") {
      px = cx - r * Math.cos(t);
      py = cy - r * Math.sin(t);
      deg = (Math.atan2(-Math.cos(t), Math.sin(t)) * 180) / Math.PI;
    } else {
      px = cx - r * Math.cos(t);
      py = cy + r * Math.sin(t);
      deg = (Math.atan2(Math.cos(t), Math.sin(t)) * 180) / Math.PI;
    }
    const d = g.getPath(-advances[i] / 2, 0, size).toPathData(2);
    if (d) parts.push(`<path transform="translate(${r2(px)} ${r2(py)}) rotate(${r2(deg)})" d="${d}"/>`);
    s += advances[i] + tracking;
  });
  return parts.join("");
}

// ---- Shared artwork pieces (200 x 200 badge coordinate space) ----

C.deepTeal = "#0f4655";
C.hill = "#2c5a38";
C.pineLight = "#4f8a59";

/** A classic camp pine: three tiers on one ground line, with a short trunk. */
function pine(cx, base, h, w) {
  const tier = (top, bottom, half) => [`${cx} ${top}`, `${cx + half} ${bottom}`, `${cx - half} ${bottom}`];
  const t1 = tier(base - h, base - h * 0.58, w * 0.3);
  const t2 = tier(base - h * 0.72, base - h * 0.28, w * 0.42);
  const t3 = tier(base - h * 0.44, base - 2, w * 0.5);
  const poly = (pts) => `M${pts.join(" L")}Z`;
  return poly(t1) + poly(t2) + poly(t3) + `M${cx - 1.6} ${base - 3}h3.2v5h-3.2Z`;
}

const r2s = (n) => Math.round(n * 100) / 100;
/** A four-point star, used as a separator in the ring. */
function star(x, y, s) {
  const k = s * 0.22;
  return `M${x} ${y - s}Q${r2s(x + k)} ${r2s(y - k)} ${x + s} ${y}Q${r2s(x + k)} ${r2s(y + k)} ${x} ${y + s}Q${r2s(x - k)} ${r2s(y + k)} ${x - s} ${y}Q${r2s(x - k)} ${r2s(y - k)} ${x} ${y - s}Z`;
}

const pinesCentre = pine(100, 101, 46, 30);
const pinesSide = pine(77, 103, 32, 22) + pine(123, 103, 34, 22);
const hill = "M38 106 Q62 88 86 98 Q104 90 122 96 Q144 86 162 104 L162 130 L38 130Z";
const wave1 = "M64 114 c6 -4.5 12 -4.5 18 0 s12 4.5 18 0 s12 -4.5 18 0 s12 4.5 18 0";
const wave2 = "M73 124 c4.5 -3.5 9 -3.5 13.5 0 s9 3.5 13.5 0 s9 -3.5 13.5 0 s9 3.5 13.5 0";
const est = textPath(geist600, "EST. 1946", 100, 145.5, 9.5, { tracking: 2.6, anchor: "middle" }).d;

// Ring lettering: the name across the top; place across the bottom with a star between.
const nameArc = arcText(geist700, "MILL STREAM", { cx: 100, cy: 100, r: 69.5, size: 16, tracking: 4.2, where: "top" });
const R_BOTTOM = 79;
const GAP = 13; // arc length kept clear for the star
const bibleW = measure(geist600, "BIBLE CAMP", 11, 2.6).width;
const placeW = measure(geist600, "OMEMEE, ON", 11, 2.6).width;
const mid = (Math.PI * R_BOTTOM) / 2;
const placeArc =
  arcText(geist600, "BIBLE CAMP", { cx: 100, cy: 100, r: R_BOTTOM, size: 11, tracking: 2.6, where: "bottom", centerAt: mid - GAP / 2 - bibleW / 2 }) +
  arcText(geist600, "OMEMEE, ON", { cx: 100, cy: 100, r: R_BOTTOM, size: 11, tracking: 2.6, where: "bottom", centerAt: mid + GAP / 2 + placeW / 2 });
const ringStars = star(100, 100 + R_BOTTOM - 4, 3.4) + star(25.5, 100, 3.6) + star(174.5, 100, 3.6);

/**
 * The scene inside the inner circle: the sun going down behind a hill and
 * three pines, on the water. ink = one-colour knockout mode (draws in black
 * for a mask, and only the shapes that carry the drawing).
 */
let clipId = 0;
function scene(ink = false, r = 57) {
  if (ink) {
    // In a mask, black = cut out (garment shows) and white = ink stays. The
    // pines get a thin ink outline so the sun doesn't merge into them.
    return [
      `<circle cx="119" cy="80" r="9" fill="#000"/>`,
      `<path d="${pinesSide}${pinesCentre}" fill="#000" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/>`,
      `<path d="M50 106.5 H150" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>`,
      `<path d="${wave1}" stroke="#000" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
      `<path d="${wave2}" stroke="#000" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
      `<path fill="#000" d="${est}"/>`,
    ].join("");
  }
  const id = `scene${++clipId}`;
  return [
    `<clipPath id="${id}"><circle cx="100" cy="100" r="${r}"/></clipPath>`,
    `<g clip-path="url(#${id})">`,
    `<circle cx="100" cy="100" r="${r}" fill="${C.teal}"/>`,
    `<circle cx="119" cy="80" r="10" fill="${C.peach}"/>`,
    `<path d="${hill}" fill="${C.hill}"/>`,
    `<rect x="30" y="106" width="140" height="70" fill="${C.deepTeal}"/>`,
    `</g>`,
    `<path fill="${C.pineLight}" d="${pinesSide}"/>`,
    `<path fill="${C.green}" d="${pinesCentre}"/>`,
    `<path d="${wave1}" stroke="${C.white}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
    `<path d="${wave2}" stroke="${C.peach}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    `<path fill="${C.white}" fill-opacity="0.92" d="${est}"/>`,
  ].join("");
}

// Version 1: the current badge, lettering in the ring.
function badgeV1Color() {
  return [
    `<circle cx="100" cy="100" r="96" fill="${C.navy}"/>`,
    `<circle cx="100" cy="100" r="89.5" fill="none" stroke="${C.amber}" stroke-width="2.2"/>`,
    `<circle cx="100" cy="100" r="85.5" fill="none" stroke="${C.white}" stroke-opacity="0.18" stroke-width="0.7"/>`,
    `<circle cx="100" cy="100" r="58.5" fill="none" stroke="${C.amber}" stroke-width="1.6"/>`,
    scene(false, 57),
    `<g fill="${C.white}">${nameArc}</g>`,
    `<g fill="${C.peach}">${placeArc}</g>`,
    `<path fill="${C.amber}" d="${ringStars}"/>`,
  ].join("");
}

function badgeV1Knockouts() {
  return [
    `<circle cx="100" cy="100" r="89.5" fill="none" stroke="#000" stroke-width="2.2"/>`,
    `<circle cx="100" cy="100" r="58.5" fill="none" stroke="#000" stroke-width="1.6"/>`,
    `<g fill="#000">${nameArc}${placeArc}</g>`,
    `<path fill="#000" d="${ringStars}"/>`,
    scene(true),
  ].join("");
}

// Version 2: the mark alone, no lettering in the ring, so the scene fills it.
const S2 = 1.36; // scene scale
const sceneT = `transform="translate(100 100) scale(${S2}) translate(-100 -100)"`;
function markV2Color() {
  return [
    `<circle cx="100" cy="100" r="96" fill="${C.navy}"/>`,
    `<circle cx="100" cy="100" r="89.5" fill="none" stroke="${C.amber}" stroke-width="2.5"/>`,
    `<g ${sceneT}>${scene(false, 58.5)}</g>`,
    `<circle cx="100" cy="100" r="${r2s(58.5 * S2)}" fill="none" stroke="${C.amber}" stroke-width="1.6"/>`,
  ].join("");
}
function markV2Knockouts() {
  return [
    `<circle cx="100" cy="100" r="89.5" fill="none" stroke="#000" stroke-width="2.5"/>`,
    `<circle cx="100" cy="100" r="${r2s(58.5 * S2)}" fill="none" stroke="#000" stroke-width="1.6"/>`,
    `<g ${sceneT}>${scene(true)}</g>`,
  ].join("");
}

// One-colour version: a solid disc of ink with every detail knocked out, so
// the garment shows through. Prints with a single screen.
let maskId = 0;
function oneColour(knockouts, ink, { x = 0, y = 0, s = 1 } = {}) {
  const id = `ko${++maskId}`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><circle cx="100" cy="100" r="96" fill="#fff"/>${knockouts}</mask><circle cx="100" cy="100" r="96" fill="${ink}" mask="url(#${id})"/></g>`;
}
const place = (art, { x = 0, y = 0, s = 1 } = {}) => `<g transform="translate(${x} ${y}) scale(${s})">${art}</g>`;

function svg(w, h, body, title) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 10}" height="${h * 10}"><title>${title}</title>${body}</svg>\n`;
}

// ---- Lockups for version 2 ----
const NAME = "Mill Stream";

/** "BIBLE CAMP ✦ OMEMEE, ON" as outlines, with a drawn star between the two halves. */
function placeLine(x, y, size, tracking, anchor = "start") {
  const left = measure(geist600, "BIBLE CAMP", size, tracking).width;
  const right = measure(geist600, "OMEMEE, ON", size, tracking).width;
  const gap = size * 1.5;
  const total = left + gap + right;
  const x0 = anchor === "middle" ? x - total / 2 : x;
  const a = textPath(geist600, "BIBLE CAMP", x0, y, size, { tracking });
  const b = textPath(geist600, "OMEMEE, ON", x0 + left + gap, y, size, { tracking });
  const st = star(r2s(x0 + left + gap / 2), r2s(y - size * 0.36), r2s(size * 0.3));
  return { d: a.d + b.d, star: st, width: total };
}

function stacked(markArt, nameFill, placeFill, starFill) {
  // Wide enough for the name with a little breathing room either side.
  const nameW = textPath(fraunces600, NAME, 0, 0, 54).width;
  const W = Math.ceil(Math.max(300, nameW + 24));
  const mark = place(markArt, { x: (W - 200) / 2, y: 0 });
  const n = textPath(fraunces600, NAME, W / 2, 258, 54, { anchor: "middle" });
  const p = placeLine(W / 2, 290, 14.5, 3.2, "middle");
  return {
    w: W,
    h: 298,
    body: mark + `<path fill="${nameFill}" d="${n.d}"/><path fill="${placeFill}" d="${p.d}"/><path fill="${starFill}" d="${p.star}"/>`,
  };
}

function horizontal(markArt, nameFill, placeFill, starFill) {
  const tx = 226;
  const n = textPath(fraunces600, NAME, tx, 100, 62);
  const p = placeLine(tx + 3, 136, 15, 3.1);
  const W = Math.ceil(tx + Math.max(n.width, p.width + 3) + 6);
  const rule = `<rect x="${tx + 3}" y="113" width="40" height="2.5" rx="1.25" fill="${starFill}"/>`;
  return {
    w: W,
    h: 200,
    body: place(markArt) + `<path fill="${nameFill}" d="${n.d}"/>${rule}<path fill="${placeFill}" d="${p.d}"/><path fill="${starFill}" d="${p.star}"/>`,
  };
}

// ---- Write everything ----
const files = [];
function write(rel, w, h, body, title) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, svg(w, h, body, title));
  files.push(file);
}

write("version-1-badge/millstream-badge-full-colour.svg", 200, 200, badgeV1Color(), "Mill Stream badge, full colour");
write("version-1-badge/millstream-badge-1colour-navy.svg", 200, 200, oneColour(badgeV1Knockouts(), C.navy), "Mill Stream badge, one colour navy");
write("version-1-badge/millstream-badge-1colour-white.svg", 200, 200, oneColour(badgeV1Knockouts(), "#ffffff"), "Mill Stream badge, one colour white");

write("version-2-mark/millstream-mark-full-colour.svg", 200, 200, markV2Color(), "Mill Stream mark, full colour");
write("version-2-mark/millstream-mark-1colour-navy.svg", 200, 200, oneColour(markV2Knockouts(), C.navy), "Mill Stream mark, one colour navy");
write("version-2-mark/millstream-mark-1colour-white.svg", 200, 200, oneColour(markV2Knockouts(), "#ffffff"), "Mill Stream mark, one colour white");

const ways = [
  ["full-colour-on-light", () => markV2Color(), C.navy, C.teal, C.amber],
  ["full-colour-on-dark", () => markV2Color(), "#ffffff", C.peach, C.amber],
  ["1colour-navy", () => oneColour(markV2Knockouts(), C.navy), C.navy, C.navy, C.navy],
  ["1colour-white", () => oneColour(markV2Knockouts(), "#ffffff"), "#ffffff", "#ffffff", "#ffffff"],
];
for (const [name, art, nf, pf, sf] of ways) {
  const st = stacked(art(), nf, pf, sf);
  write(`version-2-mark/stacked/millstream-stacked-${name}.svg`, st.w, st.h, st.body, `Mill Stream stacked logo, ${name}`);
  const hz = horizontal(art(), nf, pf, sf);
  write(`version-2-mark/horizontal/millstream-horizontal-${name}.svg`, hz.w, hz.h, hz.body, `Mill Stream horizontal logo, ${name}`);
}

// Transparent PNGs, 3000px on the long side, for printers who want rasters.
for (const file of files) {
  const png = file.replace(/\.svg$/, ".png");
  const meta = await sharp(file, { density: 72 }).metadata();
  const long = Math.max(meta.width, meta.height);
  const density = Math.round((72 * 3000) / long);
  await sharp(file, { density }).png().toFile(png);
}
console.log(files.map((f) => path.relative(OUT, f)).join("\n"));
