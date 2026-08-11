/**
 * ロゴマークの図形定義。
 *
 * アプリが書き出すピクトグラムと同じ描き方（丸い頭＋丸端の手足＋先細りの胴）で人物を描き、
 * 上げた腕に白い関節ハンドルを置いて「関節を動かして姿勢を作るアプリ」だと一目で分かるようにする。
 *
 * ここが唯一の定義元。画面のロゴ（app/brand-mark.tsx）と、
 * public/ のファビコン・アイコン・OGP画像（scripts/generate-brand-assets.mjs）が両方これを読む。
 * 形を変えたら `npm run brand` でpublic/の画像を作り直すこと。
 */

/** マークの座標系。正方形で、この中に人物が収まる。 */
export const MARK_SIZE = 128;
/** 角丸の半径。UIの .brand-mark（43px角丸13px）と同じ比率。 */
export const MARK_CORNER = 38;
/**
 * 手足の線幅。小さく表示しても消えないよう、アプリ既定の人物より少しだけ太くしている。
 * 頭・胴・脚の長さの比はアプリの人物（頭半径28・肩幅70・胴120・脚158）に合わせた。
 */
export const MARK_STROKE = 9;

export const brandColors = {
  ink: "#17211b",
  /** 角丸背景のグラデーション。単色より奥行きが出る。小さい表示でも潰れない程度の差にとどめる。 */
  inkLight: "#1e2b23",
  inkDark: "#101812",
  accent: "#e9ff58",
  paper: "#f4f6f3",
  line: "#dce4de",
} as const;

/** 頭。肩幅の中央に乗る。 */
export const markHead = { cx: 57.5, cy: 20, r: 9.5 } as const;

/**
 * 人物の各パーツ。関節は 肩(45,38)/(70,38)・腰(51,69)/(64,69) を基準に置いている。
 * 腕は胴から離し、脚は開いて立たせる。小さく表示したときに手足が胴に溶けないようにするため。
 * 右腕だけを斜め上に上げているのは、直立より「姿勢を作ったあと」に見えて、
 * 正方形の余った右上を埋められるため。
 */
export const markPaths = {
  /** 首。頭の下端から胴の中まで。 */
  neck: "M 57.5 29.5 L 57.5 42",
  /** 胴。肩から腰へ先細りさせる。 */
  torso: "M 45 38 Q 57.5 34.5 70 38 L 64 69 Q 57.5 71 51 69 Z",
  /** 左腕（画面左・下ろす） */
  armLeft: "M 45 38 L 35 52 L 30 68",
  /** 右腕（画面右・上げる） */
  armRight: "M 70 38 L 86 31 L 98 19",
  /** 左脚 */
  legLeft: "M 51 69 L 45 91 L 39 114",
  /** 右脚 */
  legRight: "M 64 69 L 71 91 L 78 114",
} as const;

/** 手先。アプリの人物と同じく、手首に丸を置いて手を表す。 */
export const markHands = [
  { cx: 30, cy: 68 },
  { cx: 98, cy: 19 },
] as const;

/*
 * エディタの関節ハンドル（白い操作点）をマークにも重ねる案は見送った。
 * 白丸だと腕がそこで途切れて見え、輪にしても64px以下では汚れにしか見えないため。
 * 「関節を動かして作る」ことはOGP画像（scripts/generate-brand-assets.mjs）の方で見せる。
 */

/** 人物の全パーツを描く順。手足→胴→首の順に重ねると、アプリの人物と同じ見え方になる。 */
export const markLimbOrder = [
  markPaths.armLeft,
  markPaths.legLeft,
  markPaths.armRight,
  markPaths.legRight,
] as const;
