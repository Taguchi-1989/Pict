/**
 * ロゴ関連の配布ファイルを public/ に作り直すスクリプト。`npm run brand` で実行する。
 *
 * 図形の定義元は app/brand-geometry.ts（画面のロゴと共有）。ここでは同じ図形から
 * ファビコン・アプリアイコン・OGP画像（ウェブのサムネイル）を書き出す。
 *
 * PNGはヘッドレスChromeで描画する。Playwrightが入れたChromeを使うので、
 * ない場合は CHROME_PATH に実行ファイルのパスを渡す。
 *   CHROME_PATH=/usr/bin/chromium npm run brand
 * PNGを作り直さずSVGだけ更新したいときは `npm run brand -- --svg-only`。
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MARK_CORNER,
  MARK_SIZE,
  MARK_STROKE,
  brandColors,
  markHands,
  markHead,
  markLimbOrder,
  markPaths,
} from "../app/brand-geometry.ts";
import { posePresets } from "../app/pose-data.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const svgOnly = process.argv.includes("--svg-only");

/* ------------------------------------------------------------------ ロゴマーク */

/**
 * ロゴマークのSVG。app/brand-mark.tsx と同じ図形を文字列で組み立てる。
 * @param {object} options
 * @param {number} [options.corner] 角丸の半径。0にすると全面塗り（iOS・Androidが自前で角を丸めるアイコン用）。
 * @param {number} [options.figureScale] 人物の縮小率。全面塗りのときは余白を確保するために縮める。
 * @param {string} [options.gradientId] 同じページに複数置く場合に衝突しないためのID。
 */
function markSvg({ corner = MARK_CORNER, figureScale = 1, gradientId = "ink" } = {}) {
  const offset = (MARK_SIZE * (1 - figureScale)) / 2;
  const figure = `
    <g transform="translate(${round(offset)} ${round(offset)}) scale(${figureScale})">
      <g fill="none" stroke="${brandColors.accent}" stroke-width="${MARK_STROKE}" stroke-linecap="round" stroke-linejoin="round">
        ${markLimbOrder.map((d) => `<path d="${d}" />`).join("\n        ")}
        <path d="${markPaths.neck}" />
      </g>
      <path d="${markPaths.torso}" fill="${brandColors.accent}" stroke="${brandColors.accent}" stroke-width="${MARK_STROKE * 0.72}" stroke-linejoin="round" />
      ${markHands.map((hand) => `<circle cx="${hand.cx}" cy="${hand.cy}" r="${MARK_STROKE * 0.58}" fill="${brandColors.accent}" />`).join("\n      ")}
      <circle cx="${markHead.cx}" cy="${markHead.cy}" r="${markHead.r}" fill="${brandColors.accent}" />
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_SIZE} ${MARK_SIZE}" width="${MARK_SIZE}" height="${MARK_SIZE}" role="img" aria-label="ピクトポーズ">
  <defs>
    <linearGradient id="${gradientId}" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${brandColors.inkLight}" />
      <stop offset="1" stop-color="${brandColors.inkDark}" />
    </linearGradient>
  </defs>
  <rect width="${MARK_SIZE}" height="${MARK_SIZE}" rx="${corner}" fill="url(#${gradientId})" />${figure}
</svg>
`;
}

/* ------------------------------------------------- OGP画像に描くアプリの人物 */

const figureStyle = { stroke: 24, head: 28, color: brandColors.ink };

/** OGP画像で見せる姿勢。「右を指す」は腕・脚が胴に重ならず、関節が全部見える。 */
const showcasePose = posePresets.find((preset) => preset.id === "point-right")?.pose;
const neutralPose = posePresets.find((preset) => preset.id === "neutral")?.pose;
if (!showcasePose || !neutralPose) throw new Error("OGP用の姿勢プリセットが見つからない");

/**
 * 白い操作点を出す関節。胴に隠れる肩・腰・首は出さず、手足の先だけにして散らからないようにする。
 * 動かした先の手首だけを選択中の色にし、元の位置からの軌跡を破線で描く。
 */
const showcaseHandles = ["head", "elbowL", "wristL", "elbowR", "kneeL", "kneeR", "ankleL", "ankleR"];
const showcaseSelected = "wristR";

const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** app/pose-editor.tsx の Figure と同じ描き方で人物を描く（保護具や道具は使わない）。 */
function figureSvg(pose) {
  const chain = (...joints) => `M ${joints.map((joint) => `${pose[joint].x} ${pose[joint].y}`).join(" L ")}`;
  const shoulderMid = midpoint(pose.shoulderL, pose.shoulderR);
  const hipMid = midpoint(pose.hipL, pose.hipR);
  const limb = `fill="none" stroke="${figureStyle.color}" stroke-width="${figureStyle.stroke}" stroke-linecap="round" stroke-linejoin="round"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${figureViewBox(pose)}" class="showcase">
    ${dragTrail(pose)}
    <path d="${chain("shoulderL", "elbowL", "wristL")}" ${limb} />
    <path d="${chain("hipL", "kneeL", "ankleL")}" ${limb} />
    <path d="${chain("shoulderR", "elbowR", "wristR")}" ${limb} />
    <path d="${chain("hipR", "kneeR", "ankleR")}" ${limb} />
    <path d="M ${pose.shoulderL.x} ${pose.shoulderL.y} Q ${shoulderMid.x} ${shoulderMid.y - 5} ${pose.shoulderR.x} ${pose.shoulderR.y} L ${pose.hipR.x} ${pose.hipR.y} Q ${hipMid.x} ${hipMid.y + 4} ${pose.hipL.x} ${pose.hipL.y} Z"
      fill="${figureStyle.color}" stroke="${figureStyle.color}" stroke-width="${figureStyle.stroke * 0.72}" stroke-linejoin="round" />
    <path d="${chain("neck")} L ${shoulderMid.x} ${shoulderMid.y + 3}" ${limb} />
    <circle cx="${pose.wristL.x}" cy="${pose.wristL.y}" r="${figureStyle.stroke * 0.58}" fill="${figureStyle.color}" />
    <circle cx="${pose.wristR.x}" cy="${pose.wristR.y}" r="${figureStyle.stroke * 0.58}" fill="${figureStyle.color}" />
    <circle cx="${pose.head.x}" cy="${pose.head.y}" r="${figureStyle.head}" fill="${figureStyle.color}" />
    ${showcaseHandles.map((joint) => `<circle cx="${pose[joint].x}" cy="${pose[joint].y}" r="8.5" fill="#ffffff" stroke="#7d8b80" stroke-width="2.5" />`).join("\n    ")}
    <circle cx="${pose[showcaseSelected].x}" cy="${pose[showcaseSelected].y}" r="13" fill="${brandColors.accent}" stroke="${brandColors.ink}" stroke-width="3" />
  </svg>`;
}

/** アプリのキャンバス（0 0 400 440）のうち、人物が実際に占める範囲だけを切り出す。 */
function figureViewBox(pose) {
  const joints = Object.values(pose);
  const margin = figureStyle.head + 12;
  const left = Math.min(...joints.map((joint) => joint.x)) - margin;
  const right = Math.max(...joints.map((joint) => joint.x)) + margin;
  const top = Math.min(...joints.map((joint) => joint.y)) - margin;
  const bottom = Math.max(...joints.map((joint) => joint.y)) + margin;
  return `${round(left)} ${round(top)} ${round(right - left)} ${round(bottom - top)}`;
}

/**
 * 直立のときの手首の位置を薄い丸で残し、そこから今の手首までの軌跡を破線で描く。
 * 「手首をつまんで動かした結果いまの姿勢になった」ことを1枚で見せるため。
 * 腕そのものを薄く残す案は、胴に重なって灰色の板に見えたのでやめた。
 */
function dragTrail(pose) {
  const pivot = pose.shoulderR;
  const from = neutralPose[showcaseSelected];
  const to = pose[showcaseSelected];
  const radius = Math.round(Math.hypot(to.x - pivot.x, to.y - pivot.y));
  return `<circle cx="${from.x}" cy="${from.y}" r="10" fill="none" stroke="#b3bdb6" stroke-width="3" />
    <path d="M ${from.x} ${from.y} A ${radius} ${radius} 0 0 0 ${to.x} ${to.y}"
      fill="none" stroke="#b3bdb6" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="2 14" />`;
}

/* ------------------------------------------------------------------ OGP画像 */

const SITE_TITLE = "ピクトポーズ";
const SITE_EYEBROW = "MANUAL FIGURE STUDIO";
const SITE_LEAD = "作業マニュアルの人物ピクトグラムを、<br />関節をドラッグして作る。";
const SITE_CHIPS = ["31種の姿勢プリセット", "保護具・道具・危険源マーク", "SVG・PNGで保存"];

function ogpHtml() {
  return page(`
  <style>
    body { width: 1200px; height: 630px; display: flex; align-items: center; background: ${brandColors.paper}; color: ${brandColors.ink}; }
    /* アプリの床グリッドと同じ斜め線を薄く敷いて、地の白さを和らげる。 */
    body::before {
      content: ""; position: absolute; inset: 0;
      background:
        repeating-linear-gradient(60deg, rgba(23,33,27,.045) 0 1px, transparent 1px 40px),
        repeating-linear-gradient(120deg, rgba(23,33,27,.045) 0 1px, transparent 1px 40px);
    }
    .left { position: relative; width: 620px; padding-left: 72px; }
    .eyebrow { margin: 26px 0 0; color: #6d7a72; font-size: 17px; font-weight: 800; letter-spacing: .2em; }
    h1 { margin: 10px 0 0; font-size: 88px; font-weight: 900; letter-spacing: -.035em; line-height: 1; }
    .lead { margin: 26px 0 0; color: #46534a; font-size: 27px; font-weight: 700; line-height: 1.62; }
    .chips { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 34px; }
    .chips span { padding: 9px 15px; border: 1px solid #cdd7cf; border-radius: 999px; background: #fff; color: #4f5c53; font-size: 18px; font-weight: 750; }
    .card {
      position: relative; display: flex; flex-direction: column; align-items: center; justify-content: space-between;
      width: 412px; height: 502px; margin-left: 24px; padding: 30px 26px 22px;
      border: 1px solid ${brandColors.line}; border-radius: 30px; background: #fff;
      box-shadow: 0 26px 60px rgba(30, 45, 34, .11);
    }
    .card .showcase { width: 360px; height: 392px; }
    .card .caption { display: flex; align-items: center; gap: 9px; margin: 0; color: #5a675d; font-size: 18px; font-weight: 800; }
    .card .caption i { display: block; width: 13px; height: 13px; border-radius: 50%; border: 3px solid ${brandColors.ink}; background: ${brandColors.accent}; }
  </style>
  <div class="left">
    ${markSvg({ gradientId: "ogp-ink" }).replace("<svg", '<svg width="104" height="104"')}
    <p class="eyebrow">${SITE_EYEBROW}</p>
    <h1>${SITE_TITLE}</h1>
    <p class="lead">${SITE_LEAD}</p>
    <div class="chips">${SITE_CHIPS.map((chip) => `<span>${chip}</span>`).join("")}</div>
  </div>
  <div class="card">
    ${figureSvg(showcasePose)}
    <p class="caption"><i></i>関節をつまんで動かすだけ</p>
  </div>`);
}

function page(body) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Noto Sans JP", "IPAGothic", sans-serif; -webkit-font-smoothing: antialiased; }
</style></head><body>${body}</body></html>`;
}

/** アイコンPNG用。指定サイズちょうどにマークだけを置いたページ。 */
function iconHtml(size, options) {
  return page(`<style>body { width: ${size}px; height: ${size}px; }
  svg { display: block; width: ${size}px; height: ${size}px; }</style>
  ${markSvg({ ...options, gradientId: "icon-ink" })}`);
}

/* -------------------------------------------------------------------- 出力 */

const round = (value) => Math.round(value * 1000) / 1000;

function writeAsset(name, contents) {
  writeFileSync(join(publicDir, name), contents);
  console.log(`  ${name}`);
}

/** ヘッドレスChromeを1回起動して1枚撮る。--screenshot は出力先ディレクトリを作らないので先に用意する。 */
function shot(html, width, height, outName) {
  const work = mkdtempSync(join(tmpdir(), "brand-"));
  const browser = chromePath();
  try {
    const htmlPath = join(work, "page.html");
    writeFileSync(htmlPath, html);
    execFileSync(browser, [
      // headless_shell は既定でヘッドレス。chrome本体のときだけモード指定が要る。
      ...(browser.includes("headless") ? [] : ["--headless=new"]),
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--font-render-hinting=none",
      "--default-background-color=00000000",
      `--screenshot=${join(work, "out.png")}`,
      `--window-size=${width},${height}`,
      `--user-data-dir=${join(work, "profile")}`,
      htmlPath,
    ], { stdio: ["ignore", "ignore", "pipe"] });
    renameSync(join(work, "out.png"), join(publicDir, outName));
    console.log(`  ${outName}  (${width}x${height})`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

let cachedChrome;
/**
 * 描画に使うChromeを探す。
 *
 * chrome本体（--headless=new）は --window-size からツールバー分の高さを引いて描くため、
 * 指定サイズより下が欠ける。欠けない chrome-headless-shell を優先して探す。
 */
function chromePath() {
  if (cachedChrome) return cachedChrome;
  const shells = [];
  const browsers = [];
  const push = (path, isShell) => { if (path && existsSync(path)) (isShell ? shells : browsers).push(path); };

  push(process.env.CHROME_PATH, (process.env.CHROME_PATH ?? "").includes("headless"));
  const installed = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (installed && existsSync(installed)) {
    for (const entry of readdirSync(installed)) {
      if (entry.startsWith("chromium_headless_shell")) push(join(installed, entry, "chrome-linux", "headless_shell"), true);
      else if (entry.startsWith("chromium-")) push(join(installed, entry, "chrome-linux", "chrome"), false);
    }
  }
  for (const path of ["/usr/bin/chrome-headless-shell", "/usr/local/bin/chrome-headless-shell"]) push(path, true);
  for (const path of ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]) push(path, false);

  if (!shells.length && !browsers.length) {
    throw new Error("ヘッドレスChromeが見つからない。CHROME_PATH に実行ファイルのパスを渡してください。");
  }
  if (!shells.length) {
    console.warn("  警告: chrome-headless-shell が無いため chrome 本体で描画する。画像の下側が欠けることがある。");
  }
  cachedChrome = shells[0] ?? browsers[0];
  return cachedChrome;
}

mkdirSync(publicDir, { recursive: true });
console.log("ロゴのファイルを書き出す:");

// タブのアイコンであり、資料などで使うロゴマークそのもの。
writeAsset("favicon.svg", markSvg({ gradientId: "favicon-ink" }));
writeAsset("site.webmanifest", `${JSON.stringify({
  name: "ピクトポーズ｜作業マニュアル向けピクトグラム編集",
  short_name: "ピクトポーズ",
  description: "基本姿勢を選び、関節をドラッグして微調整。SVG・PNGで保存できる人物ピクトグラムエディタ。",
  lang: "ja",
  start_url: "/",
  display: "standalone",
  background_color: brandColors.paper,
  theme_color: brandColors.ink,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2)}\n`);

if (svgOnly) {
  console.log("--svg-only のためPNGは作り直さない。");
} else {
  shot(iconHtml(192), 192, 192, "icon-192.png");
  shot(iconHtml(512), 512, 512, "icon-512.png");
  // Androidのマスク（円や角丸で切り抜かれる）に耐えるよう、全面塗りにして人物を内側に寄せる。
  shot(iconHtml(512, { corner: 0, figureScale: 0.66 }), 512, 512, "icon-maskable-512.png");
  // iOSは自分で角を丸めるので、こちらも全面塗りにする。
  shot(iconHtml(180, { corner: 0, figureScale: 0.8 }), 180, 180, "apple-touch-icon.png");
  shot(ogpHtml(), 1200, 630, "ogp.png");
}
