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

export type PresetItem = { type: ItemType; rotation: number; scale: number };
export type PresetDefaults = {
  helmet?: boolean;
  harness?: boolean;
  leftItem?: PresetItem;
  rightItem?: PresetItem;
  scene?: SceneType;
};

export type PosePreset = {
  id: string;
  name: string;
  category: "基本" | "移動" | "作業" | "注意・合図";
  view: PoseView;
  pose: Pose;
  defaults: PresetDefaults;
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
    pose: Object.fromEntries(
      Object.entries(base).map(([key, point]) => [key, overrides[key as JointName] ?? point]),
    ) as Pose,
  };
}

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
];

export const jointLabels: Record<JointName, string> = {
  head: "頭", neck: "首", shoulderL: "左肩", elbowL: "左肘", wristL: "左手",
  shoulderR: "右肩", elbowR: "右肘", wristR: "右手", hipL: "左腰",
  kneeL: "左膝", ankleL: "左足", hipR: "右腰", kneeR: "右膝", ankleR: "右足",
};

export function clonePose(pose: Pose): Pose {
  return Object.fromEntries(Object.entries(pose).map(([key, point]) => [key, { ...point }])) as Pose;
}
