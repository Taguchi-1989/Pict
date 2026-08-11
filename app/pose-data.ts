export type JointName =
  | "head" | "neck"
  | "shoulderL" | "elbowL" | "wristL"
  | "shoulderR" | "elbowR" | "wristR"
  | "hipL" | "kneeL" | "ankleL"
  | "hipR" | "kneeR" | "ankleR";

export type Point = { x: number; y: number };
export type Pose = Record<JointName, Point>;
export type PoseView = "front" | "side";
export type ItemType =
  | "none" | "wrench" | "screwdriver" | "hammer" | "drill"
  | "sprayer" | "hose" | "flashlight" | "pliers" | "saw" | "brush"
  | "cutter" | "scissors" | "remote" | "rag" | "clipboard" | "pen"
  | "stopwatch" | "ruler" | "caliper" | "welding-torch" | "inspection-hammer" | "box";
export type SceneType =
  | "none" | "cutting-table" | "scissor-table" | "wiping-table" | "overhead-crane"
  | "measuring-table" | "welding-table" | "impact-inspection" | "box-carry";

/**
 * 人物とは別に、資料側の説明として絵に足す注目マーク。
 *
 * 2系統ある：
 * - 注釈マーク：ぶつけた箇所のギザギザ、注目の丸、手順番号など。色は赤・青・黒から選ぶ。
 * - 警告マーク：黄色い三角の標識で「そこに何の危険源があるか」を示す。
 *   配色が意味を持つため、色は「標準色／白黒（モノクロ印刷用）」の2択として扱う。
 *
 * 禁止（赤丸）・着用指示（青丸）・GHS（化学品）は、選択肢が増えて迷うことと、
 * 薬品の扱いは資料の別ページで説明するという運用に合わせて、あえて持たない。
 */
export type MarkType =
  // 注釈
  | "impact" | "circle" | "frame" | "arrow"
  | "caution" | "ban" | "pinch" | "step"
  // 警告（危険源）
  | "warn-pinch" | "warn-entangle" | "warn-electric" | "warn-hot"
  | "warn-slip" | "warn-overhead" | "warn-falling" | "warn-oxygen";

/** マークの色。人物の配色とは独立させる。警告マークではalert＝標準色、ink＝白黒として使う。 */
export type MarkTone = "alert" | "info" | "ink";

export type SceneMark = {
  id: string;
  type: MarkType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  tone: MarkTone;
  /** 手順番号マークに表示する文字（1〜2文字）。 */
  label?: string;
};

export const markToneColors: Record<MarkTone, string> = {
  alert: "#d63a2b",
  info: "#1f6fb2",
  ink: "#17211b",
};

export const markToneOptions: { id: MarkTone; label: string }[] = [
  { id: "alert", label: "赤" },
  { id: "info", label: "青" },
  { id: "ink", label: "黒" },
];

/** 警告マーク用の色切り替え。標識の配色を崩さないよう、標準色か白黒かだけを選ばせる。 */
export const signToneOptions: { id: MarkTone; label: string }[] = [
  { id: "alert", label: "標準色" },
  { id: "ink", label: "白黒" },
];

export type MarkGroup = "annotation" | "warning";

export const markGroupOptions: { id: MarkGroup; label: string; note: string }[] = [
  { id: "annotation", label: "注釈", note: "ぶつけた箇所や注目させたい場所を示す記号" },
  { id: "warning", label: "危険源", note: "黄色の三角＝そこに危険があることを示す警告標識" },
];

export const markOptions: {
  id: MarkType;
  group: MarkGroup;
  label: string;
  hint: string;
  /** 角度スライダーを出すかどうか（向きが意味を持つマークだけ）。 */
  rotatable: boolean;
}[] = [
  { id: "impact", group: "annotation", label: "衝突（ギザギザ）", hint: "ぶつけた・当たった箇所", rotatable: false },
  { id: "circle", group: "annotation", label: "注目の丸", hint: "見てほしい箇所を丸で囲む", rotatable: false },
  { id: "frame", group: "annotation", label: "範囲の破線枠", hint: "注目させたい範囲を四角で囲む", rotatable: false },
  { id: "arrow", group: "annotation", label: "矢印", hint: "動きの向き・力のかかる向き", rotatable: true },
  { id: "caution", group: "annotation", label: "注意（△!）", hint: "危険源・注意点", rotatable: false },
  { id: "ban", group: "annotation", label: "禁止（○＼）", hint: "してはいけない動作", rotatable: false },
  { id: "pinch", group: "annotation", label: "はさまれ", hint: "はさまれ・巻き込まれの向き", rotatable: true },
  { id: "step", group: "annotation", label: "手順番号", hint: "作業手順書の番号付け", rotatable: false },

  { id: "warn-pinch", group: "warning", label: "はさまれ注意", hint: "ローラー・プレス・治具にはさまれる危険源", rotatable: false },
  { id: "warn-entangle", group: "warning", label: "巻き込まれ注意", hint: "回転部・歯車・ベルトへの巻き込み", rotatable: false },
  { id: "warn-electric", group: "warning", label: "感電注意", hint: "充電部・活線作業の危険源", rotatable: false },
  { id: "warn-hot", group: "warning", label: "高温注意", hint: "高温面・蒸気・溶接部でのやけど", rotatable: false },
  { id: "warn-slip", group: "warning", label: "転倒注意", hint: "床の油・水・段差によるすべり", rotatable: false },
  { id: "warn-overhead", group: "warning", label: "頭上注意", hint: "梁・配管への激突", rotatable: false },
  { id: "warn-falling", group: "warning", label: "落下物注意", hint: "上からの飛来・落下", rotatable: false },
  { id: "warn-oxygen", group: "warning", label: "酸欠・窒息注意", hint: "タンク・ピット・不活性ガス置換部", rotatable: false },
];

const signDefault = { scale: 0.85, rotation: 0, tone: "alert" as MarkTone };

export const markDefaults: Record<MarkType, { scale: number; rotation: number; tone: MarkTone }> = {
  impact: { scale: 1, rotation: 0, tone: "alert" },
  circle: { scale: 1.2, rotation: 0, tone: "alert" },
  frame: { scale: 1.3, rotation: 0, tone: "alert" },
  arrow: { scale: 1, rotation: 0, tone: "alert" },
  caution: { scale: 1, rotation: 0, tone: "alert" },
  ban: { scale: 1.1, rotation: 0, tone: "alert" },
  pinch: { scale: 1, rotation: 0, tone: "alert" },
  step: { scale: 1, rotation: 0, tone: "ink" },
  "warn-pinch": signDefault,
  "warn-entangle": signDefault,
  "warn-electric": signDefault,
  "warn-hot": signDefault,
  "warn-slip": signDefault,
  "warn-overhead": signDefault,
  "warn-falling": signDefault,
  "warn-oxygen": signDefault,
};

export type PresetItem = { type: ItemType; rotation: number; scale: number };
export type PresetDefaults = {
  helmet?: boolean;
  harness?: boolean;
  leftItem?: PresetItem;
  rightItem?: PresetItem;
  scene?: SceneType;
};

/** 資料の用途と作業の中身で絞り込むためのタグ。並び順がそのまま画面の並び順になる。 */
export const presetTagOrder = [
  "作業手順書", "労災報告", "安全教育・KY",
  "高所作業", "工具作業", "機械・設備", "電気", "高温・溶接",
  "運搬・重量物", "点検・測定", "清掃", "合図・誘導",
] as const;

export type PresetTag = (typeof presetTagOrder)[number];

/**
 * 資料でどれだけ出番があるかの順位。
 * 1＝ほとんどの資料で使う、2＝作業が合えば使う、3＝限られた場面だけ。
 * 「すべて」で一覧したときに1から順に並べ、探す手間を減らす。
 */
export type PresetRank = 1 | 2 | 3;

export type PosePreset = {
  id: string;
  name: string;
  category: "基本" | "移動" | "作業" | "注意・合図" | "災害・ケガ";
  view: PoseView;
  pose: Pose;
  defaults: PresetDefaults;
  tags: PresetTag[];
  rank: PresetRank;
};

const base: Pose = {
  head: { x: 200, y: 72 }, neck: { x: 200, y: 112 },
  shoulderL: { x: 165, y: 120 }, elbowL: { x: 148, y: 180 }, wristL: { x: 140, y: 238 },
  shoulderR: { x: 235, y: 120 }, elbowR: { x: 252, y: 180 }, wristR: { x: 260, y: 238 },
  hipL: { x: 181, y: 240 }, kneeL: { x: 178, y: 322 }, ankleL: { x: 176, y: 398 },
  hipR: { x: 219, y: 240 }, kneeR: { x: 222, y: 322 }, ankleR: { x: 224, y: 398 },
};

function make(
  id: string,
  name: string,
  category: PosePreset["category"],
  overrides: Partial<Record<JointName, Point>> = {},
  view: PoseView = "front",
  defaults: PresetDefaults = {},
): PosePreset {
  return {
    id, name, category, view, defaults,
    tags: presetTags[id] ?? [],
    rank: presetRanks[id] ?? 2,
    pose: Object.fromEntries(
      Object.entries(base).map(([key, point]) => [key, overrides[key as JointName] ?? point]),
    ) as Pose,
  };
}

// 姿勢そのものとは別軸の「どの資料に使うか・何の作業か」をタグで持たせる。
const presetTags: Record<string, PresetTag[]> = {
  neutral: ["作業手順書", "安全教育・KY"],
  sit: ["作業手順書"],
  "side-stand": ["作業手順書"],
  walk: ["作業手順書", "安全教育・KY"],
  "step-up": ["作業手順書", "安全教育・KY"],

  "one-up": ["合図・誘導", "安全教育・KY"],
  "point-right": ["合図・誘導"],
  stop: ["合図・誘導", "安全教育・KY"],

  "drill-wall": ["作業手順書", "工具作業"],
  "fasten-overhead": ["作業手順書", "工具作業", "高所作業"],
  "tighten-pipe": ["作業手順書", "工具作業"],
  "hammer-work": ["作業手順書", "工具作業"],
  "saw-work": ["作業手順書", "工具作業"],
  "cutter-table": ["作業手順書", "工具作業"],
  "scissors-table": ["作業手順書", "工具作業"],
  "spray-work": ["作業手順書", "清掃"],
  "watering-work": ["作業手順書", "清掃"],
  "brush-clean": ["作業手順書", "清掃"],
  "wipe-table": ["作業手順書", "清掃"],
  "flashlight-inspect": ["作業手順書", "点検・測定"],
  "record-check": ["作業手順書", "点検・測定"],
  "time-measure": ["作業手順書", "点検・測定"],
  "ruler-measure": ["作業手順書", "点検・測定"],
  "caliper-measure": ["作業手順書", "点検・測定"],
  "impact-inspection": ["作業手順書", "点検・測定", "機械・設備"],
  "height-check": ["作業手順書", "高所作業", "点検・測定"],
  "crane-remote": ["作業手順書", "機械・設備", "運搬・重量物"],
  "welding-work": ["作業手順書", "高温・溶接"],
  lift: ["作業手順書", "運搬・重量物", "安全教育・KY"],
  push: ["作業手順書", "運搬・重量物"],
  "carry-box": ["作業手順書", "運搬・重量物"],

  "slip-fall": ["労災報告", "安全教育・KY"],
  "height-fall": ["労災報告", "高所作業", "安全教育・KY"],
  "caught-in": ["労災報告", "機械・設備", "安全教育・KY"],
  "falling-object": ["労災報告", "安全教育・KY"],
  "hand-cut": ["労災報告", "工具作業"],
  "burn-contact": ["労災報告", "高温・溶接"],
  "electric-shock": ["労災報告", "電気", "安全教育・KY"],
  "back-strain": ["労災報告", "運搬・重量物", "安全教育・KY"],
  "head-bump": ["労災報告", "安全教育・KY"],
  "crouch-injured": ["労災報告"],
  "heat-exhaustion": ["労災報告", "安全教育・KY"],
  "lying-down": ["労災報告"],
};

/**
 * よく使う順のランク。作業手順書と労災報告で頻出するものを1にした。
 * 迷いを減らすのが目的なので、1は各カテゴリの代表だけに絞っている。
 */
const presetRanks: Record<string, PresetRank> = {
  // 1：まず出てきてほしい代表的な姿勢
  neutral: 1, walk: 1, sit: 1, "side-stand": 1,
  "one-up": 1, "point-right": 1, stop: 1,
  "drill-wall": 1, "hammer-work": 1, "record-check": 1, lift: 1, "carry-box": 1,
  "slip-fall": 1, "height-fall": 1, "caught-in": 1, "falling-object": 1, "head-bump": 1,

  // 3：使う場面が限られるもの
  "watering-work": 3, "scissors-table": 3, "wipe-table": 3,
  "time-measure": 3, "caliper-measure": 3,
  "heat-exhaustion": 3, "lying-down": 3, "crouch-injured": 3,
};

const sideStand: Partial<Record<JointName, Point>> = {
  head: { x: 220, y: 75 }, neck: { x: 204, y: 113 },
  shoulderL: { x: 195, y: 122 }, shoulderR: { x: 216, y: 118 },
  elbowL: { x: 180, y: 181 }, wristL: { x: 178, y: 236 },
  elbowR: { x: 228, y: 177 }, wristR: { x: 232, y: 235 },
  hipL: { x: 194, y: 242 }, hipR: { x: 215, y: 239 },
  kneeL: { x: 190, y: 323 }, ankleL: { x: 185, y: 399 },
  kneeR: { x: 220, y: 321 }, ankleR: { x: 226, y: 397 },
};

const sideCrouch: Partial<Record<JointName, Point>> = {
  head: { x: 258, y: 124 }, neck: { x: 226, y: 152 },
  shoulderL: { x: 211, y: 160 }, shoulderR: { x: 233, y: 152 },
  elbowL: { x: 190, y: 209 }, wristL: { x: 213, y: 249 },
  elbowR: { x: 269, y: 192 }, wristR: { x: 304, y: 226 },
  hipL: { x: 195, y: 269 }, hipR: { x: 218, y: 263 },
  kneeL: { x: 148, y: 324 }, ankleL: { x: 116, y: 389 },
  kneeR: { x: 261, y: 318 }, ankleR: { x: 300, y: 386 },
};

const sideKneel: Partial<Record<JointName, Point>> = {
  head: { x: 228, y: 88 }, neck: { x: 210, y: 126 },
  shoulderL: { x: 198, y: 134 }, shoulderR: { x: 220, y: 127 },
  elbowL: { x: 177, y: 187 }, wristL: { x: 195, y: 235 },
  elbowR: { x: 253, y: 178 }, wristR: { x: 278, y: 224 },
  hipL: { x: 196, y: 253 }, hipR: { x: 219, y: 248 },
  kneeL: { x: 166, y: 333 }, ankleL: { x: 116, y: 393 },
  kneeR: { x: 246, y: 335 }, ankleR: { x: 322, y: 390 },
};

const sideReach: Partial<Record<JointName, Point>> = {
  ...sideStand,
  head: { x: 225, y: 75 }, neck: { x: 208, y: 113 },
  shoulderL: { x: 197, y: 123 }, shoulderR: { x: 219, y: 116 },
  elbowL: { x: 178, y: 177 }, wristL: { x: 170, y: 230 },
  elbowR: { x: 270, y: 108 }, wristR: { x: 326, y: 91 },
};

const sideOperate: Partial<Record<JointName, Point>> = {
  ...sideStand,
  head: { x: 226, y: 82 }, neck: { x: 211, y: 119 },
  shoulderL: { x: 199, y: 129 }, shoulderR: { x: 221, y: 121 },
  elbowL: { x: 177, y: 181 }, wristL: { x: 194, y: 224 },
  elbowR: { x: 260, y: 154 }, wristR: { x: 305, y: 178 },
  hipL: { x: 197, y: 248 }, hipR: { x: 219, y: 243 },
  kneeL: { x: 173, y: 327 }, ankleL: { x: 147, y: 400 },
  kneeR: { x: 239, y: 322 }, ankleR: { x: 274, y: 396 },
};

const sideTableWork: Partial<Record<JointName, Point>> = {
  ...sideCrouch,
  head: { x: 247, y: 115 }, neck: { x: 222, y: 147 },
  shoulderL: { x: 207, y: 156 }, shoulderR: { x: 232, y: 149 },
  elbowL: { x: 246, y: 198 }, wristL: { x: 278, y: 238 },
  elbowR: { x: 270, y: 194 }, wristR: { x: 310, y: 239 },
  hipL: { x: 196, y: 267 }, hipR: { x: 220, y: 261 },
};

const sideRemoteWork: Partial<Record<JointName, Point>> = {
  ...sideStand,
  head: { x: 226, y: 74 }, neck: { x: 209, y: 113 },
  shoulderL: { x: 196, y: 123 }, shoulderR: { x: 220, y: 117 },
  elbowL: { x: 239, y: 164 }, wristL: { x: 269, y: 194 },
  elbowR: { x: 253, y: 153 }, wristR: { x: 286, y: 190 },
};

const sideRecordWork: Partial<Record<JointName, Point>> = {
  ...sideStand,
  head: { x: 228, y: 78 }, neck: { x: 210, y: 116 },
  shoulderL: { x: 197, y: 125 }, shoulderR: { x: 220, y: 119 },
  elbowL: { x: 225, y: 166 }, wristL: { x: 254, y: 188 },
  elbowR: { x: 253, y: 158 }, wristR: { x: 272, y: 180 },
};

const sideMeasureWork: Partial<Record<JointName, Point>> = {
  ...sideTableWork,
  head: { x: 250, y: 109 }, neck: { x: 224, y: 144 },
  elbowL: { x: 243, y: 191 }, wristL: { x: 275, y: 229 },
  elbowR: { x: 272, y: 185 }, wristR: { x: 311, y: 226 },
};

const frontCarryBox: Partial<Record<JointName, Point>> = {
  head: { x: 200, y: 70 }, neck: { x: 200, y: 110 },
  shoulderL: { x: 164, y: 120 }, shoulderR: { x: 236, y: 120 },
  elbowL: { x: 146, y: 180 }, wristL: { x: 166, y: 226 },
  elbowR: { x: 254, y: 180 }, wristR: { x: 234, y: 226 },
  hipL: { x: 181, y: 252 }, hipR: { x: 219, y: 252 },
  kneeL: { x: 161, y: 326 }, ankleL: { x: 133, y: 398 },
  kneeR: { x: 239, y: 326 }, ankleR: { x: 266, y: 398 },
};

export const posePresets: PosePreset[] = [
  make("neutral", "直立", "基本"),
  make("sit", "座る", "基本", {
    head: { x: 188, y: 88 }, neck: { x: 190, y: 126 },
    shoulderL: { x: 156, y: 132 }, shoulderR: { x: 226, y: 125 },
    elbowL: { x: 148, y: 190 }, wristL: { x: 176, y: 238 },
    elbowR: { x: 238, y: 187 }, wristR: { x: 214, y: 238 },
    hipL: { x: 174, y: 253 }, hipR: { x: 216, y: 251 },
    kneeL: { x: 251, y: 271 }, ankleL: { x: 253, y: 369 },
    kneeR: { x: 287, y: 279 }, ankleR: { x: 289, y: 369 },
  }),
  make("walk", "歩く", "移動", {
    head: { x: 212, y: 78 }, neck: { x: 205, y: 116 },
    shoulderL: { x: 170, y: 125 }, shoulderR: { x: 240, y: 117 },
    elbowL: { x: 129, y: 165 }, wristL: { x: 95, y: 206 },
    elbowR: { x: 270, y: 168 }, wristR: { x: 302, y: 210 },
    hipL: { x: 186, y: 243 }, hipR: { x: 226, y: 239 },
    kneeL: { x: 146, y: 319 }, ankleL: { x: 91, y: 379 },
    kneeR: { x: 258, y: 314 }, ankleR: { x: 308, y: 386 },
  }),
  make("step-up", "段差を上がる", "移動", {
    head: { x: 218, y: 78 }, neck: { x: 210, y: 116 },
    shoulderL: { x: 173, y: 125 }, shoulderR: { x: 244, y: 117 },
    elbowL: { x: 144, y: 171 }, wristL: { x: 117, y: 213 },
    elbowR: { x: 274, y: 160 }, wristR: { x: 304, y: 201 },
    hipL: { x: 188, y: 241 }, hipR: { x: 230, y: 239 },
    kneeL: { x: 143, y: 293 }, ankleL: { x: 99, y: 293 },
    kneeR: { x: 242, y: 325 }, ankleR: { x: 246, y: 399 },
  }),
  make("one-up", "片手を上げる", "注意・合図", {
    elbowR: { x: 251, y: 78 }, wristR: { x: 251, y: 28 },
  }),
  make("point-right", "右を指す", "注意・合図", {
    elbowR: { x: 297, y: 122 }, wristR: { x: 360, y: 120 },
    elbowL: { x: 159, y: 168 }, wristL: { x: 177, y: 212 },
  }),
  make("stop", "停止の合図", "注意・合図", {
    elbowL: { x: 116, y: 145 }, wristL: { x: 68, y: 110 },
    elbowR: { x: 274, y: 142 }, wristR: { x: 326, y: 112 },
  }),

  make("drill-wall", "壁をドリル加工", "作業", sideOperate, "side", {
    helmet: true, rightItem: { type: "drill", rotation: 2, scale: 1.2 },
  }),
  make("fasten-overhead", "上向きねじ締め", "作業", sideReach, "side", {
    helmet: true, rightItem: { type: "screwdriver", rotation: -38, scale: 1.15 },
  }),
  make("tighten-pipe", "配管をスパナ締め", "作業", sideKneel, "side", {
    helmet: true, rightItem: { type: "wrench", rotation: 52, scale: 1.15 },
  }),
  make("hammer-work", "ハンマー打ち", "作業", sideCrouch, "side", {
    helmet: true, rightItem: { type: "hammer", rotation: -58, scale: 1.2 },
  }),
  make("spray-work", "噴霧器で散布", "作業", sideOperate, "side", {
    rightItem: { type: "sprayer", rotation: 2, scale: 1.15 },
  }),
  make("watering-work", "散水ノズルで散水", "作業", sideOperate, "side", {
    rightItem: { type: "hose", rotation: 0, scale: 1.15 },
  }),
  make("flashlight-inspect", "ライトで設備点検", "作業", sideCrouch, "side", {
    helmet: true, rightItem: { type: "flashlight", rotation: 8, scale: 1.15 },
  }),
  make("saw-work", "のこぎりで切断", "作業", sideKneel, "side", {
    helmet: true, rightItem: { type: "saw", rotation: 8, scale: 1.15 },
  }),
  make("brush-clean", "ブラシで清掃", "作業", sideCrouch, "side", {
    rightItem: { type: "brush", rotation: 34, scale: 1.15 },
  }),
  make("lift", "荷物を持ち上げる", "作業", {
    head: { x: 200, y: 102 }, neck: { x: 200, y: 140 },
    shoulderL: { x: 164, y: 145 }, shoulderR: { x: 236, y: 145 },
    elbowL: { x: 148, y: 206 }, wristL: { x: 174, y: 253 },
    elbowR: { x: 252, y: 206 }, wristR: { x: 226, y: 253 },
    hipL: { x: 178, y: 267 }, hipR: { x: 222, y: 267 },
    kneeL: { x: 144, y: 329 }, ankleL: { x: 118, y: 396 },
    kneeR: { x: 256, y: 329 }, ankleR: { x: 282, y: 396 },
  }, "front", { helmet: true }),
  make("push", "押す作業", "作業", {
    head: { x: 220, y: 82 }, neck: { x: 208, y: 118 },
    shoulderL: { x: 174, y: 126 }, shoulderR: { x: 244, y: 114 },
    elbowL: { x: 236, y: 151 }, wristL: { x: 302, y: 151 },
    elbowR: { x: 276, y: 134 }, wristR: { x: 334, y: 134 },
    hipL: { x: 188, y: 243 }, hipR: { x: 229, y: 235 },
    kneeL: { x: 150, y: 319 }, ankleL: { x: 110, y: 391 },
    kneeR: { x: 255, y: 315 }, ankleR: { x: 289, y: 390 },
  }, "front", { helmet: true }),
  make("height-check", "高所設備を確認", "作業", sideReach, "side", {
    helmet: true, harness: true, rightItem: { type: "flashlight", rotation: -35, scale: 1.05 },
  }),
  make("cutter-table", "作業台でカッター切断", "作業", sideTableWork, "side", {
    helmet: true, scene: "cutting-table", rightItem: { type: "cutter", rotation: 18, scale: 1.1 },
  }),
  make("scissors-table", "作業台でハサミ切断", "作業", sideTableWork, "side", {
    scene: "scissor-table", rightItem: { type: "scissors", rotation: 12, scale: 1.1 },
  }),
  make("crane-remote", "天井クレーンを操作", "作業", sideRemoteWork, "side", {
    helmet: true, scene: "overhead-crane", rightItem: { type: "remote", rotation: 4, scale: 1.05 },
  }),
  make("wipe-table", "ウェスで拭き取り", "作業", sideTableWork, "side", {
    scene: "wiping-table", rightItem: { type: "rag", rotation: 8, scale: 1.15 },
  }),
  make("record-check", "ボードに記録", "作業", sideRecordWork, "side", {
    helmet: true,
    leftItem: { type: "clipboard", rotation: 8, scale: 1.05 },
    rightItem: { type: "pen", rotation: 44, scale: 0.95 },
  }),
  make("time-measure", "ストップウォッチで測定", "作業", sideRecordWork, "side", {
    rightItem: { type: "stopwatch", rotation: 2, scale: 1.05 },
  }),
  make("ruler-measure", "定規で寸法測定", "作業", sideMeasureWork, "side", {
    scene: "measuring-table", rightItem: { type: "ruler", rotation: 2, scale: 1.1 },
  }),
  make("caliper-measure", "ノギスで寸法測定", "作業", sideMeasureWork, "side", {
    scene: "measuring-table", rightItem: { type: "caliper", rotation: 3, scale: 1.1 },
  }),
  make("welding-work", "溶接作業", "作業", sideCrouch, "side", {
    scene: "welding-table", rightItem: { type: "welding-torch", rotation: 22, scale: 1.1 },
  }),
  make("impact-inspection", "打音検査", "作業", sideOperate, "side", {
    helmet: true, scene: "impact-inspection", rightItem: { type: "inspection-hammer", rotation: -18, scale: 1.05 },
  }),
  make("carry-box", "段ボール箱を運搬", "作業", frontCarryBox, "front", {
    helmet: true, scene: "box-carry",
  }),
  make("side-stand", "横向き・直立", "基本", sideStand, "side"),

  // 労災報告書の「事故の型」（厚生労働省の分類）に合わせた被災状況の姿勢。
  make("slip-fall", "転倒（すべる）", "災害・ケガ", {
    head: { x: 126, y: 196 }, neck: { x: 152, y: 222 },
    shoulderL: { x: 162, y: 232 }, elbowL: { x: 142, y: 184 }, wristL: { x: 146, y: 136 },
    shoulderR: { x: 172, y: 224 }, elbowR: { x: 196, y: 180 }, wristR: { x: 216, y: 138 },
    hipL: { x: 222, y: 288 }, kneeL: { x: 266, y: 250 }, ankleL: { x: 312, y: 228 },
    hipR: { x: 230, y: 296 }, kneeR: { x: 254, y: 346 }, ankleR: { x: 300, y: 378 },
  }, "side"),
  make("height-fall", "墜落・転落", "災害・ケガ", {
    head: { x: 150, y: 118 }, neck: { x: 172, y: 146 },
    shoulderL: { x: 182, y: 158 }, elbowL: { x: 146, y: 190 }, wristL: { x: 112, y: 216 },
    shoulderR: { x: 192, y: 148 }, elbowR: { x: 224, y: 112 }, wristR: { x: 252, y: 86 },
    hipL: { x: 238, y: 224 }, kneeL: { x: 224, y: 294 }, ankleL: { x: 260, y: 340 },
    hipR: { x: 248, y: 214 }, kneeR: { x: 290, y: 258 }, ankleR: { x: 322, y: 302 },
  }, "side", { helmet: true }),
  make("caught-in", "はさまれ・巻き込まれ", "災害・ケガ", {
    head: { x: 172, y: 80 }, neck: { x: 178, y: 118 },
    shoulderL: { x: 146, y: 128 }, elbowL: { x: 120, y: 180 }, wristL: { x: 110, y: 234 },
    shoulderR: { x: 214, y: 122 }, elbowR: { x: 268, y: 134 }, wristR: { x: 326, y: 146 },
    hipL: { x: 160, y: 246 }, kneeL: { x: 150, y: 324 }, ankleL: { x: 142, y: 398 },
    hipR: { x: 198, y: 244 }, kneeR: { x: 198, y: 324 }, ankleR: { x: 202, y: 398 },
  }, "front", { helmet: true }),
  make("falling-object", "飛来・落下物", "災害・ケガ", {
    head: { x: 200, y: 112 }, neck: { x: 200, y: 150 },
    shoulderL: { x: 166, y: 158 }, elbowL: { x: 138, y: 122 }, wristL: { x: 172, y: 88 },
    shoulderR: { x: 234, y: 158 }, elbowR: { x: 262, y: 122 }, wristR: { x: 228, y: 88 },
    hipL: { x: 180, y: 266 }, kneeL: { x: 164, y: 332 }, ankleL: { x: 156, y: 398 },
    hipR: { x: 220, y: 266 }, kneeR: { x: 236, y: 332 }, ankleR: { x: 244, y: 398 },
  }, "front", { helmet: true }),
  make("hand-cut", "切れ・こすれ", "災害・ケガ", {
    head: { x: 200, y: 76 }, neck: { x: 200, y: 114 },
    shoulderL: { x: 166, y: 122 }, elbowL: { x: 142, y: 176 }, wristL: { x: 184, y: 198 },
    shoulderR: { x: 234, y: 122 }, elbowR: { x: 258, y: 176 }, wristR: { x: 214, y: 196 },
    hipL: { x: 182, y: 244 }, kneeL: { x: 178, y: 324 }, ankleL: { x: 176, y: 398 },
    hipR: { x: 218, y: 244 }, kneeR: { x: 222, y: 324 }, ankleR: { x: 224, y: 398 },
  }),
  make("burn-contact", "高温との接触（やけど）", "災害・ケガ", {
    head: { x: 224, y: 84 }, neck: { x: 208, y: 120 },
    shoulderL: { x: 196, y: 130 }, elbowL: { x: 174, y: 180 }, wristL: { x: 190, y: 222 },
    shoulderR: { x: 218, y: 122 }, elbowR: { x: 256, y: 148 }, wristR: { x: 294, y: 118 },
    hipL: { x: 194, y: 248 }, kneeL: { x: 172, y: 326 }, ankleL: { x: 148, y: 396 },
    hipR: { x: 214, y: 244 }, kneeR: { x: 230, y: 322 }, ankleR: { x: 258, y: 394 },
  }, "side"),
  make("electric-shock", "感電", "災害・ケガ", {
    head: { x: 200, y: 74 }, neck: { x: 200, y: 112 },
    shoulderL: { x: 162, y: 122 }, elbowL: { x: 120, y: 150 }, wristL: { x: 82, y: 126 },
    shoulderR: { x: 238, y: 122 }, elbowR: { x: 280, y: 150 }, wristR: { x: 318, y: 126 },
    hipL: { x: 180, y: 244 }, kneeL: { x: 170, y: 324 }, ankleL: { x: 164, y: 398 },
    hipR: { x: 220, y: 244 }, kneeR: { x: 230, y: 324 }, ankleR: { x: 236, y: 398 },
  }),
  make("back-strain", "腰を痛める（動作の反動）", "災害・ケガ", {
    head: { x: 250, y: 132 }, neck: { x: 226, y: 162 },
    shoulderL: { x: 212, y: 170 }, elbowL: { x: 186, y: 214 }, wristL: { x: 200, y: 252 },
    shoulderR: { x: 234, y: 164 }, elbowR: { x: 258, y: 206 }, wristR: { x: 224, y: 248 },
    hipL: { x: 192, y: 258 }, kneeL: { x: 186, y: 330 }, ankleL: { x: 182, y: 396 },
    hipR: { x: 210, y: 254 }, kneeR: { x: 214, y: 330 }, ankleR: { x: 218, y: 396 },
  }, "side"),
  make("head-bump", "激突（頭をぶつける）", "災害・ケガ", {
    head: { x: 236, y: 98 }, neck: { x: 214, y: 130 },
    shoulderL: { x: 202, y: 140 }, elbowL: { x: 186, y: 184 }, wristL: { x: 220, y: 120 },
    shoulderR: { x: 222, y: 134 }, elbowR: { x: 250, y: 180 }, wristR: { x: 254, y: 228 },
    hipL: { x: 196, y: 254 }, kneeL: { x: 190, y: 330 }, ankleL: { x: 186, y: 396 },
    hipR: { x: 214, y: 250 }, kneeR: { x: 218, y: 328 }, ankleR: { x: 222, y: 396 },
  }, "side"),
  make("crouch-injured", "うずくまる（負傷）", "災害・ケガ", {
    head: { x: 222, y: 214 }, neck: { x: 212, y: 250 },
    shoulderL: { x: 200, y: 258 }, elbowL: { x: 192, y: 302 }, wristL: { x: 224, y: 326 },
    shoulderR: { x: 220, y: 252 }, elbowR: { x: 232, y: 296 }, wristR: { x: 258, y: 320 },
    hipL: { x: 186, y: 332 }, kneeL: { x: 244, y: 340 }, ankleL: { x: 212, y: 394 },
    hipR: { x: 200, y: 328 }, kneeR: { x: 256, y: 334 }, ankleR: { x: 226, y: 392 },
  }, "side"),
  make("heat-exhaustion", "熱中症で座り込む", "災害・ケガ", {
    head: { x: 218, y: 202 }, neck: { x: 208, y: 238 },
    shoulderL: { x: 196, y: 246 }, elbowL: { x: 180, y: 296 }, wristL: { x: 208, y: 336 },
    shoulderR: { x: 216, y: 240 }, elbowR: { x: 250, y: 272 }, wristR: { x: 242, y: 210 },
    hipL: { x: 188, y: 352 }, kneeL: { x: 256, y: 338 }, ankleL: { x: 300, y: 384 },
    hipR: { x: 202, y: 348 }, kneeR: { x: 264, y: 350 }, ankleR: { x: 308, y: 388 },
  }, "side"),
  make("lying-down", "倒れている", "災害・ケガ", {
    head: { x: 106, y: 340 }, neck: { x: 144, y: 346 },
    shoulderL: { x: 160, y: 364 }, elbowL: { x: 196, y: 386 }, wristL: { x: 236, y: 394 },
    shoulderR: { x: 160, y: 344 }, elbowR: { x: 200, y: 302 }, wristR: { x: 240, y: 296 },
    hipL: { x: 258, y: 372 }, kneeL: { x: 310, y: 378 }, ankleL: { x: 356, y: 388 },
    hipR: { x: 258, y: 352 }, kneeR: { x: 312, y: 346 }, ankleR: { x: 358, y: 354 },
  }, "side"),
];

export const jointLabels: Record<JointName, string> = {
  head: "頭", neck: "首", shoulderL: "左肩", elbowL: "左肘", wristL: "左手",
  shoulderR: "右肩", elbowR: "右肘", wristR: "右手", hipL: "左腰",
  kneeL: "左膝", ankleL: "左足", hipR: "右腰", kneeR: "右膝", ankleR: "右足",
};

export function clonePose(pose: Pose): Pose {
  return Object.fromEntries(Object.entries(pose).map(([key, point]) => [key, { ...point }])) as Pose;
}

/**
 * 「この作業なら、まずこの危険源を示す」という対応表。
 * 労災報告の事故の型と、作業手順書のKY（危険予知）でよく挙がるものを優先した。
 * ここに無いプリセットは用途タグから拾う。
 */
const presetHazards: Record<string, MarkType[]> = {
  "drill-wall": ["warn-entangle"],
  "fasten-overhead": ["warn-falling", "warn-overhead"],
  "tighten-pipe": ["warn-pinch"],
  "hammer-work": ["warn-pinch"],
  "saw-work": ["warn-pinch"],
  "cutter-table": ["warn-pinch"],
  "scissors-table": ["warn-pinch"],
  "watering-work": ["warn-slip"],
  "brush-clean": ["warn-slip"],
  "flashlight-inspect": ["warn-overhead"],
  "impact-inspection": ["warn-overhead"],
  "height-check": ["warn-falling"],
  "crane-remote": ["warn-falling"],
  "welding-work": ["warn-hot"],
  lift: ["warn-slip"],
  push: ["warn-slip"],
  "carry-box": ["warn-slip", "warn-overhead"],

  "slip-fall": ["warn-slip"],
  "height-fall": ["warn-falling"],
  "caught-in": ["warn-entangle", "warn-pinch"],
  "falling-object": ["warn-falling"],
  "hand-cut": ["warn-pinch"],
  "burn-contact": ["warn-hot"],
  "electric-shock": ["warn-electric"],
  "back-strain": ["warn-slip"],
  "head-bump": ["warn-overhead"],
  "heat-exhaustion": ["warn-hot"],
  "lying-down": ["warn-oxygen"],
};

const tagHazards: Partial<Record<PresetTag, MarkType[]>> = {
  高所作業: ["warn-falling"],
  工具作業: ["warn-pinch"],
  "機械・設備": ["warn-entangle", "warn-pinch"],
  電気: ["warn-electric"],
  "高温・溶接": ["warn-hot"],
  "運搬・重量物": ["warn-slip"],
  "点検・測定": ["warn-overhead"],
  清掃: ["warn-slip"],
};

/** プリセットに対する推奨マーク（最大4件）。ワンタップで貼れるようにするための候補。 */
export function suggestedMarksFor(presetId: string): MarkType[] {
  const preset = posePresets.find((candidate) => candidate.id === presetId);
  const fromTags = preset ? preset.tags.flatMap((tag) => tagHazards[tag] ?? []) : [];
  return [...new Set([...(presetHazards[presetId] ?? []), ...fromTags])].slice(0, 4);
}
