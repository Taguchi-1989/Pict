import type { JointName, Point, Pose, PoseView } from "./pose-data";

/** MediaPipe Pose Landmarker が返す正規化座標（0〜1）。 */
export type Landmark = { x: number; y: number; z: number; visibility?: number };

export type DetectedFigure = {
  pose: Pose;
  view: PoseView;
  /** 採用した関節の推定信頼度の平均（0〜1）。低いものは並べ替えで後ろに回す。 */
  confidence: number;
  /** 元画像の正規化座標での外接矩形。プレビューの枠表示に使う。 */
  box: { x: number; y: number; width: number; height: number };
};

// MediaPipe Poseの33点のうち、本アプリで使う点の番号。
const NOSE = 0;
const EAR_L = 7;
const EAR_R = 8;

// MediaPipeの「left/right」は被写体から見た左右。正面向きの人は被写体の左が画面の右に写るため、
// 見た目の位置が変わらないよう、被写体の左を本アプリの「R（画面右）」に対応させる。
const limbPairs: { subjectLeft: number; subjectRight: number; jointL: JointName; jointR: JointName }[] = [
  { subjectLeft: 11, subjectRight: 12, jointL: "shoulderR", jointR: "shoulderL" },
  { subjectLeft: 13, subjectRight: 14, jointL: "elbowR", jointR: "elbowL" },
  { subjectLeft: 15, subjectRight: 16, jointL: "wristR", jointR: "wristL" },
  { subjectLeft: 23, subjectRight: 24, jointL: "hipR", jointR: "hipL" },
  { subjectLeft: 25, subjectRight: 26, jointL: "kneeR", jointR: "kneeL" },
  { subjectLeft: 27, subjectRight: 28, jointL: "ankleR", jointR: "ankleL" },
];

// 画面座標系（400×440）での基準値。既定の直立ポーズに合わせている。
const CANVAS_W = 400;
const CANVAS_H = 440;
const FLOOR_Y = 398;
// 既定の直立ポーズ（肩中央(200,120)・腰中央(200,240)・首(200,112)・頭(200,72)）から得た基準値。
// 実際の人体は頭と肩の間隔が本アプリの絵柄より狭いため、頭と首は向きだけ写真から取り、
// 肩からの距離はこの基準に合わせて描き直す。
const SHOULDER_HIP_REFERENCE = 120;
const HEAD_OFFSET = 48;
const NECK_OFFSET = 8;
const HEAD_MARGIN = 34; // 頭の円がはみ出さないための余白
const SIDE_VIEW_RATIO = 0.33; // 肩幅÷胴長がこれ未満なら横向きとみなす

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function visibilityOf(landmark: Landmark | undefined) {
  if (!landmark) return 0;
  return landmark.visibility ?? 1;
}

/**
 * 1人分のランドマークを、本アプリの14関節ポーズへ変換する。
 * 必要な点が欠けている場合はnullを返す。
 */
export function landmarksToFigure(landmarks: Landmark[], imageWidth: number, imageHeight: number): DetectedFigure | null {
  if (!landmarks || landmarks.length < 29) return null;

  // 縦横比を保つため、いったん画像のピクセル座標へ戻す。
  const toPixel = (index: number): Point | null => {
    const landmark = landmarks[index];
    if (!landmark) return null;
    return { x: landmark.x * imageWidth, y: landmark.y * imageHeight };
  };

  const raw: Partial<Record<JointName, Point>> = {};
  const scores: number[] = [];

  for (const pair of limbPairs) {
    const left = toPixel(pair.subjectLeft);
    const right = toPixel(pair.subjectRight);
    if (!left || !right) return null;
    raw[pair.jointL] = left;
    raw[pair.jointR] = right;
    scores.push(visibilityOf(landmarks[pair.subjectLeft]), visibilityOf(landmarks[pair.subjectRight]));
  }

  // 頭の中心は両耳の中点。横向きで片耳しか見えないときは鼻で代用する。
  const earL = toPixel(EAR_L);
  const earR = toPixel(EAR_R);
  const nose = toPixel(NOSE);
  const earsVisible = visibilityOf(landmarks[EAR_L]) > 0.5 && visibilityOf(landmarks[EAR_R]) > 0.5;
  const head = earsVisible && earL && earR ? mid(earL, earR) : (nose ?? earL ?? earR);
  if (!head) return null;
  raw.head = head;
  scores.push(visibilityOf(landmarks[NOSE]));

  const shoulderMid = mid(raw.shoulderL!, raw.shoulderR!);
  const hipMid = mid(raw.hipL!, raw.hipR!);
  raw.neck = shoulderMid; // 実際の位置は縮尺をかけるときに引き直す

  // 姿勢が変わっても人物の大きさが揃うよう、肩から腰までの長さを基準に拡大率を決める。
  const torso = distance(shoulderMid, hipMid);
  if (!Number.isFinite(torso) || torso < 1) return null;
  let scale = SHOULDER_HIP_REFERENCE / torso;

  // 頭の向き（うつむき・見上げ・傾き）は写真から受け継ぐ。
  const headVector = { x: head.x - shoulderMid.x, y: head.y - shoulderMid.y };
  const headLength = Math.hypot(headVector.x, headVector.y);
  const headDirection = headLength > 1
    ? { x: headVector.x / headLength, y: headVector.y / headLength }
    : { x: 0, y: -1 };

  const joints = Object.keys(raw) as JointName[];
  const scaled = () => joints.map((joint) => {
    // 頭と首だけは肩中央からの距離を既定ポーズに合わせ直す。
    if (joint === "head" || joint === "neck") {
      const offset = joint === "head" ? HEAD_OFFSET : NECK_OFFSET;
      return {
        x: shoulderMid.x * scale + headDirection.x * offset,
        y: shoulderMid.y * scale + headDirection.y * offset,
      };
    }
    return { x: raw[joint]!.x * scale, y: raw[joint]!.y * scale };
  });

  // 手を上げるなど大きく広がる姿勢では、画面に収まるところまで縮める。
  let points = scaled();
  let minX = Math.min(...points.map((point) => point.x));
  let maxX = Math.max(...points.map((point) => point.x));
  let minY = Math.min(...points.map((point) => point.y));
  let maxY = Math.max(...points.map((point) => point.y));
  const usableW = CANVAS_W - 40;
  const usableH = CANVAS_H - HEAD_MARGIN - 30;
  const overflow = Math.max((maxX - minX) / usableW, (maxY - minY + HEAD_MARGIN) / usableH);
  if (overflow > 1) {
    scale /= overflow;
    points = scaled();
    minX = Math.min(...points.map((point) => point.x));
    maxX = Math.max(...points.map((point) => point.x));
    minY = Math.min(...points.map((point) => point.y));
    maxY = Math.max(...points.map((point) => point.y));
  }

  // 横は中央そろえ、縦はいちばん下の点を床に合わせる。頭が切れる場合は下へずらす。
  const offsetX = CANVAS_W / 2 - (minX + maxX) / 2;
  let offsetY = FLOOR_Y - maxY;
  if (minY + offsetY < HEAD_MARGIN) offsetY = HEAD_MARGIN - minY;

  const pose = {} as Pose;
  joints.forEach((joint, index) => {
    pose[joint] = {
      x: Math.round(Math.max(10, Math.min(390, points[index].x + offsetX))),
      y: Math.round(Math.max(10, Math.min(430, points[index].y + offsetY))),
    };
  });

  // 肩幅が胴長に対して極端に狭ければ、横を向いていると判断する。
  const shoulderWidth = Math.abs(pose.shoulderL.x - pose.shoulderR.x);
  const torsoHeight = distance(mid(pose.shoulderL, pose.shoulderR), mid(pose.hipL, pose.hipR));
  const view: PoseView = torsoHeight > 0 && shoulderWidth / torsoHeight < SIDE_VIEW_RATIO ? "side" : "front";

  const used = landmarks.slice(0, 29);
  const boxX = Math.min(...used.map((landmark) => landmark.x));
  const boxY = Math.min(...used.map((landmark) => landmark.y));

  return {
    pose,
    view,
    confidence: scores.reduce((total, score) => total + score, 0) / scores.length,
    box: {
      x: boxX,
      y: boxY,
      width: Math.max(...used.map((landmark) => landmark.x)) - boxX,
      height: Math.max(...used.map((landmark) => landmark.y)) - boxY,
    },
  };
}

/** プレビューに骨格を描くための線のつなぎ方（画面左右に合わせた関節名）。 */
export const previewBones: [JointName, JointName][] = [
  ["head", "neck"],
  ["neck", "shoulderL"], ["neck", "shoulderR"],
  ["shoulderL", "elbowL"], ["elbowL", "wristL"],
  ["shoulderR", "elbowR"], ["elbowR", "wristR"],
  ["shoulderL", "hipL"], ["shoulderR", "hipR"], ["hipL", "hipR"],
  ["hipL", "kneeL"], ["kneeL", "ankleL"],
  ["hipR", "kneeR"], ["kneeR", "ankleR"],
];
