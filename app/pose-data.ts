export type JointName =
  | "head"
  | "neck"
  | "shoulderL"
  | "elbowL"
  | "wristL"
  | "shoulderR"
  | "elbowR"
  | "wristR"
  | "hipL"
  | "kneeL"
  | "ankleL"
  | "hipR"
  | "kneeR"
  | "ankleR";

export type Point = { x: number; y: number };
export type Pose = Record<JointName, Point>;
export type PoseView = "front" | "side";

export type PosePreset = {
  id: string;
  name: string;
  category: "基本" | "移動" | "作業" | "注意・合図" | "横向き";
  view: PoseView;
  pose: Pose;
};

const base: Pose = {
  head: { x: 200, y: 72 },
  neck: { x: 200, y: 112 },
  shoulderL: { x: 165, y: 120 },
  elbowL: { x: 148, y: 180 },
  wristL: { x: 140, y: 238 },
  shoulderR: { x: 235, y: 120 },
  elbowR: { x: 252, y: 180 },
  wristR: { x: 260, y: 238 },
  hipL: { x: 181, y: 240 },
  kneeL: { x: 178, y: 322 },
  ankleL: { x: 176, y: 398 },
  hipR: { x: 219, y: 240 },
  kneeR: { x: 222, y: 322 },
  ankleR: { x: 224, y: 398 },
};

function make(
  id: string,
  name: string,
  category: PosePreset["category"],
  overrides: Partial<Record<JointName, Point>> = {},
  view: PoseView = "front",
): PosePreset {
  return {
    id,
    name,
    category,
    view,
    pose: Object.fromEntries(
      Object.entries(base).map(([key, point]) => [
        key,
        overrides[key as JointName] ?? point,
      ]),
    ) as Pose,
  };
}

export const posePresets: PosePreset[] = [
  make("neutral", "直立", "基本"),
  make("hands-waist", "腰に手", "基本", {
    elbowL: { x: 140, y: 165 }, wristL: { x: 176, y: 205 },
    elbowR: { x: 260, y: 165 }, wristR: { x: 224, y: 205 },
  }),
  make("arms-open", "両手を開く", "基本", {
    elbowL: { x: 118, y: 150 }, wristL: { x: 72, y: 118 },
    elbowR: { x: 282, y: 150 }, wristR: { x: 328, y: 118 },
  }),
  make("one-up", "片手を上げる", "注意・合図", {
    elbowR: { x: 250, y: 78 }, wristR: { x: 250, y: 28 },
  }),
  make("both-up", "両手を上げる", "注意・合図", {
    elbowL: { x: 140, y: 78 }, wristL: { x: 128, y: 28 },
    elbowR: { x: 260, y: 78 }, wristR: { x: 272, y: 28 },
  }),
  make("point-right", "右を指す", "注意・合図", {
    elbowR: { x: 295, y: 122 }, wristR: { x: 358, y: 120 },
    elbowL: { x: 160, y: 168 }, wristL: { x: 178, y: 212 },
  }),
  make("point-left", "左を指す", "注意・合図", {
    elbowL: { x: 105, y: 122 }, wristL: { x: 42, y: 120 },
    elbowR: { x: 240, y: 168 }, wristR: { x: 222, y: 212 },
  }),
  make("walk", "歩く", "移動", {
    head: { x: 212, y: 78 }, neck: { x: 205, y: 116 },
    shoulderL: { x: 172, y: 124 }, shoulderR: { x: 238, y: 118 },
    elbowL: { x: 130, y: 164 }, wristL: { x: 96, y: 205 },
    elbowR: { x: 268, y: 168 }, wristR: { x: 300, y: 210 },
    hipL: { x: 188, y: 242 }, hipR: { x: 224, y: 240 },
    kneeL: { x: 148, y: 318 }, ankleL: { x: 92, y: 378 },
    kneeR: { x: 256, y: 314 }, ankleR: { x: 306, y: 386 },
  }),
  make("run", "走る", "移動", {
    head: { x: 230, y: 84 }, neck: { x: 214, y: 120 },
    shoulderL: { x: 180, y: 126 }, shoulderR: { x: 247, y: 115 },
    elbowL: { x: 142, y: 165 }, wristL: { x: 184, y: 186 },
    elbowR: { x: 286, y: 151 }, wristR: { x: 328, y: 128 },
    hipL: { x: 200, y: 244 }, hipR: { x: 236, y: 237 },
    kneeL: { x: 144, y: 294 }, ankleL: { x: 92, y: 352 },
    kneeR: { x: 278, y: 285 }, ankleR: { x: 334, y: 260 },
  }),
  make("step-up", "段差を上がる", "移動", {
    head: { x: 218, y: 78 }, neck: { x: 210, y: 116 },
    shoulderL: { x: 175, y: 124 }, shoulderR: { x: 242, y: 118 },
    elbowL: { x: 145, y: 170 }, wristL: { x: 118, y: 212 },
    elbowR: { x: 272, y: 160 }, wristR: { x: 302, y: 200 },
    hipL: { x: 190, y: 240 }, hipR: { x: 228, y: 240 },
    kneeL: { x: 144, y: 292 }, ankleL: { x: 100, y: 292 },
    kneeR: { x: 240, y: 324 }, ankleR: { x: 244, y: 398 },
  }),
  make("crouch", "かがむ", "作業", {
    head: { x: 226, y: 132 }, neck: { x: 208, y: 166 },
    shoulderL: { x: 176, y: 166 }, shoulderR: { x: 238, y: 152 },
    elbowL: { x: 150, y: 210 }, wristL: { x: 166, y: 250 },
    elbowR: { x: 260, y: 198 }, wristR: { x: 282, y: 238 },
    hipL: { x: 190, y: 270 }, hipR: { x: 226, y: 263 },
    kneeL: { x: 140, y: 320 }, ankleL: { x: 110, y: 385 },
    kneeR: { x: 268, y: 320 }, ankleR: { x: 300, y: 385 },
  }),
  make("squat", "しゃがむ", "作業", {
    head: { x: 200, y: 128 }, neck: { x: 200, y: 165 },
    shoulderL: { x: 167, y: 170 }, shoulderR: { x: 233, y: 170 },
    elbowL: { x: 145, y: 222 }, wristL: { x: 174, y: 254 },
    elbowR: { x: 255, y: 222 }, wristR: { x: 226, y: 254 },
    hipL: { x: 182, y: 274 }, hipR: { x: 218, y: 274 },
    kneeL: { x: 130, y: 324 }, ankleL: { x: 102, y: 392 },
    kneeR: { x: 270, y: 324 }, ankleR: { x: 298, y: 392 },
  }),
  make("kneel", "片膝をつく", "作業", {
    hipL: { x: 185, y: 245 }, hipR: { x: 220, y: 245 },
    kneeL: { x: 156, y: 325 }, ankleL: { x: 110, y: 390 },
    kneeR: { x: 242, y: 330 }, ankleR: { x: 318, y: 388 },
    elbowL: { x: 148, y: 180 }, wristL: { x: 165, y: 240 },
    elbowR: { x: 252, y: 180 }, wristR: { x: 238, y: 242 },
  }),
  make("knee-stand", "膝立ち", "作業", {
    head: { x: 200, y: 92 }, neck: { x: 200, y: 130 },
    shoulderL: { x: 165, y: 138 }, shoulderR: { x: 235, y: 138 },
    elbowL: { x: 146, y: 196 }, wristL: { x: 158, y: 248 },
    elbowR: { x: 254, y: 196 }, wristR: { x: 242, y: 248 },
    hipL: { x: 180, y: 266 }, hipR: { x: 220, y: 266 },
    kneeL: { x: 174, y: 350 }, ankleL: { x: 126, y: 392 },
    kneeR: { x: 226, y: 350 }, ankleR: { x: 274, y: 392 },
  }),
  make("sit", "座る", "基本", {
    head: { x: 188, y: 88 }, neck: { x: 190, y: 126 },
    shoulderL: { x: 158, y: 130 }, shoulderR: { x: 224, y: 126 },
    elbowL: { x: 150, y: 190 }, wristL: { x: 176, y: 238 },
    elbowR: { x: 235, y: 187 }, wristR: { x: 214, y: 238 },
    hipL: { x: 176, y: 252 }, hipR: { x: 214, y: 252 },
    kneeL: { x: 250, y: 270 }, ankleL: { x: 252, y: 368 },
    kneeR: { x: 286, y: 278 }, ankleR: { x: 288, y: 368 },
  }),
  make("reach", "手を伸ばす", "作業", {
    head: { x: 218, y: 74 }, neck: { x: 210, y: 112 },
    shoulderL: { x: 176, y: 122 }, shoulderR: { x: 242, y: 112 },
    elbowR: { x: 282, y: 72 }, wristR: { x: 320, y: 30 },
    elbowL: { x: 148, y: 170 }, wristL: { x: 130, y: 220 },
  }),
  make("inspect", "点検する", "作業", {
    head: { x: 220, y: 90 }, neck: { x: 208, y: 125 },
    shoulderL: { x: 176, y: 132 }, shoulderR: { x: 240, y: 120 },
    elbowL: { x: 145, y: 175 }, wristL: { x: 130, y: 222 },
    elbowR: { x: 262, y: 154 }, wristR: { x: 235, y: 108 },
    hipL: { x: 188, y: 247 }, hipR: { x: 224, y: 240 },
  }),
  make("look-down", "下を見る", "作業", {
    head: { x: 218, y: 100 }, neck: { x: 207, y: 134 },
    shoulderL: { x: 174, y: 139 }, shoulderR: { x: 238, y: 130 },
    elbowL: { x: 146, y: 190 }, wristL: { x: 136, y: 240 },
    elbowR: { x: 262, y: 185 }, wristR: { x: 270, y: 237 },
    hipL: { x: 187, y: 250 }, hipR: { x: 224, y: 245 },
  }),
  make("peek", "横から覗く", "作業", {
    head: { x: 252, y: 94 }, neck: { x: 220, y: 124 },
    shoulderL: { x: 188, y: 124 }, shoulderR: { x: 248, y: 142 },
    elbowL: { x: 168, y: 180 }, wristL: { x: 176, y: 232 },
    elbowR: { x: 286, y: 138 }, wristR: { x: 320, y: 112 },
    hipL: { x: 190, y: 244 }, hipR: { x: 226, y: 250 },
    kneeL: { x: 182, y: 325 }, ankleL: { x: 176, y: 400 },
    kneeR: { x: 230, y: 328 }, ankleR: { x: 236, y: 400 },
  }),
  make("lift", "持ち上げる", "作業", {
    head: { x: 200, y: 102 }, neck: { x: 200, y: 140 },
    shoulderL: { x: 166, y: 144 }, shoulderR: { x: 234, y: 144 },
    elbowL: { x: 150, y: 205 }, wristL: { x: 175, y: 252 },
    elbowR: { x: 250, y: 205 }, wristR: { x: 225, y: 252 },
    hipL: { x: 180, y: 266 }, hipR: { x: 220, y: 266 },
    kneeL: { x: 146, y: 328 }, ankleL: { x: 120, y: 395 },
    kneeR: { x: 254, y: 328 }, ankleR: { x: 280, y: 395 },
  }),
  make("carry", "運ぶ", "作業", {
    head: { x: 210, y: 78 }, neck: { x: 205, y: 116 },
    shoulderL: { x: 172, y: 122 }, shoulderR: { x: 238, y: 118 },
    elbowL: { x: 145, y: 170 }, wristL: { x: 170, y: 220 },
    elbowR: { x: 264, y: 168 }, wristR: { x: 232, y: 220 },
    hipL: { x: 185, y: 240 }, hipR: { x: 222, y: 240 },
    kneeL: { x: 160, y: 320 }, ankleL: { x: 128, y: 395 },
    kneeR: { x: 244, y: 316 }, ankleR: { x: 278, y: 390 },
  }),
  make("push", "押す", "作業", {
    head: { x: 220, y: 82 }, neck: { x: 208, y: 118 },
    shoulderL: { x: 176, y: 125 }, shoulderR: { x: 242, y: 115 },
    elbowL: { x: 236, y: 150 }, wristL: { x: 302, y: 150 },
    elbowR: { x: 274, y: 134 }, wristR: { x: 332, y: 134 },
    hipL: { x: 190, y: 242 }, hipR: { x: 227, y: 236 },
    kneeL: { x: 152, y: 318 }, ankleL: { x: 112, y: 390 },
    kneeR: { x: 253, y: 315 }, ankleR: { x: 287, y: 390 },
  }),
  make("pull", "引く", "作業", {
    head: { x: 188, y: 80 }, neck: { x: 198, y: 118 },
    shoulderL: { x: 164, y: 114 }, shoulderR: { x: 230, y: 126 },
    elbowL: { x: 220, y: 150 }, wristL: { x: 278, y: 145 },
    elbowR: { x: 266, y: 160 }, wristR: { x: 320, y: 150 },
    hipL: { x: 178, y: 236 }, hipR: { x: 216, y: 243 },
    kneeL: { x: 142, y: 315 }, ankleL: { x: 110, y: 392 },
    kneeR: { x: 246, y: 318 }, ankleR: { x: 282, y: 392 },
  }),
  make("bow", "お辞儀", "基本", {
    head: { x: 254, y: 108 }, neck: { x: 220, y: 124 },
    shoulderL: { x: 186, y: 120 }, shoulderR: { x: 248, y: 139 },
    elbowL: { x: 168, y: 180 }, wristL: { x: 178, y: 235 },
    elbowR: { x: 260, y: 196 }, wristR: { x: 246, y: 244 },
    hipL: { x: 190, y: 242 }, hipR: { x: 226, y: 247 },
  }),
  make("stop", "停止の合図", "注意・合図", {
    elbowL: { x: 118, y: 145 }, wristL: { x: 70, y: 110 },
    elbowR: { x: 272, y: 142 }, wristR: { x: 324, y: 112 },
  }),
  make("side-stand", "横向き・直立", "横向き", {
    head: { x: 214, y: 72 }, neck: { x: 202, y: 112 },
    shoulderL: { x: 194, y: 120 }, shoulderR: { x: 208, y: 120 },
    elbowL: { x: 184, y: 181 }, wristL: { x: 180, y: 238 },
    elbowR: { x: 220, y: 180 }, wristR: { x: 224, y: 238 },
    hipL: { x: 194, y: 241 }, hipR: { x: 209, y: 240 },
    kneeL: { x: 190, y: 323 }, ankleL: { x: 186, y: 399 },
    kneeR: { x: 215, y: 322 }, ankleR: { x: 220, y: 398 },
  }, "side"),
  make("side-walk", "横向き・歩く", "横向き", {
    head: { x: 226, y: 76 }, neck: { x: 210, y: 113 },
    shoulderL: { x: 200, y: 122 }, shoulderR: { x: 216, y: 118 },
    elbowL: { x: 166, y: 166 }, wristL: { x: 132, y: 208 },
    elbowR: { x: 252, y: 162 }, wristR: { x: 286, y: 204 },
    hipL: { x: 202, y: 242 }, hipR: { x: 218, y: 239 },
    kneeL: { x: 166, y: 320 }, ankleL: { x: 112, y: 386 },
    kneeR: { x: 254, y: 315 }, ankleR: { x: 310, y: 386 },
  }, "side"),
  make("side-crouch", "横向き・かがむ", "横向き", {
    head: { x: 258, y: 124 }, neck: { x: 226, y: 152 },
    shoulderL: { x: 213, y: 159 }, shoulderR: { x: 229, y: 153 },
    elbowL: { x: 192, y: 208 }, wristL: { x: 215, y: 248 },
    elbowR: { x: 268, y: 191 }, wristR: { x: 302, y: 226 },
    hipL: { x: 197, y: 268 }, hipR: { x: 214, y: 264 },
    kneeL: { x: 150, y: 323 }, ankleL: { x: 118, y: 389 },
    kneeR: { x: 258, y: 318 }, ankleR: { x: 296, y: 386 },
  }, "side"),
  make("side-kneel", "横向き・片膝", "横向き", {
    head: { x: 222, y: 86 }, neck: { x: 208, y: 124 },
    shoulderL: { x: 199, y: 132 }, shoulderR: { x: 216, y: 128 },
    elbowL: { x: 177, y: 185 }, wristL: { x: 190, y: 236 },
    elbowR: { x: 242, y: 181 }, wristR: { x: 230, y: 238 },
    hipL: { x: 197, y: 251 }, hipR: { x: 215, y: 249 },
    kneeL: { x: 167, y: 332 }, ankleL: { x: 118, y: 392 },
    kneeR: { x: 242, y: 335 }, ankleR: { x: 321, y: 390 },
  }, "side"),
  make("side-reach", "横向き・手を伸ばす", "横向き", {
    head: { x: 225, y: 74 }, neck: { x: 209, y: 112 },
    shoulderL: { x: 198, y: 121 }, shoulderR: { x: 216, y: 116 },
    elbowL: { x: 178, y: 176 }, wristL: { x: 168, y: 229 },
    elbowR: { x: 267, y: 108 }, wristR: { x: 326, y: 91 },
    hipL: { x: 196, y: 242 }, hipR: { x: 214, y: 239 },
    kneeL: { x: 191, y: 323 }, ankleL: { x: 187, y: 399 },
    kneeR: { x: 220, y: 321 }, ankleR: { x: 226, y: 397 },
  }, "side"),
  make("side-spray", "横向き・散水", "横向き", {
    head: { x: 226, y: 82 }, neck: { x: 211, y: 119 },
    shoulderL: { x: 200, y: 128 }, shoulderR: { x: 218, y: 122 },
    elbowL: { x: 177, y: 181 }, wristL: { x: 193, y: 224 },
    elbowR: { x: 260, y: 155 }, wristR: { x: 305, y: 180 },
    hipL: { x: 198, y: 247 }, hipR: { x: 216, y: 244 },
    kneeL: { x: 174, y: 326 }, ankleL: { x: 148, y: 399 },
    kneeR: { x: 236, y: 322 }, ankleR: { x: 270, y: 396 },
  }, "side"),
];

export const jointLabels: Record<JointName, string> = {
  head: "頭", neck: "首", shoulderL: "左肩", elbowL: "左肘", wristL: "左手",
  shoulderR: "右肩", elbowR: "右肘", wristR: "右手", hipL: "左腰",
  kneeL: "左膝", ankleL: "左足", hipR: "右腰", kneeR: "右膝", ankleR: "右足",
};

export function clonePose(pose: Pose): Pose {
  return Object.fromEntries(
    Object.entries(pose).map(([key, point]) => [key, { ...point }]),
  ) as Pose;
}
