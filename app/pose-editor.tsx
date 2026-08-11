"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clonePose,
  jointLabels,
  markDefaults,
  markGroupOptions,
  markOptions,
  markToneColors,
  markToneOptions,
  signToneOptions,
  suggestedMarksFor,
  posePresets,
  presetTagOrder,
  type PresetTag,
  type JointName,
  type ItemType,
  type MarkGroup,
  type MarkType,
  type MarkTone,
  type Point,
  type Pose,
  type PresetDefaults,
  type PoseView,
  type SceneMark,
  type SceneType,
} from "./pose-data";
import { MarkGraphic, isSignMark } from "./mark-art";
import type { DetectedFigure } from "./photo-pose";

// 解析用のwasmとモデルは10MBを超えるため、写真を読み取るときだけ読み込む。
const PhotoImport = dynamic(() => import("./photo-import"), { ssr: false });

const jointNames = Object.keys(jointLabels) as JointName[];
const categories = ["すべて", "基本", "移動", "作業", "注意・合図", "災害・ケガ", "横向き"] as const;

type FigureStyle = {
  color: string;
  secondaryColor: string;
  colorMode: "two-tone" | "mono";
  strokeWidth: number;
  headRadius: number;
  background: "transparent" | "white";
};

type GloveType = "none" | "leather" | "rubber" | "long";
type HeadgearType = "none" | "helmet" | "cap" | "plastic-cap";
type BodySuitType = "none" | "coverall" | "cleanroom";
type EquipmentFlag = "harness" | "apron" | "safetyShoes" | "goggles" | "dustMask" | "earMuffs" | "vest";

type Equipment = {
  headgear: HeadgearType;
  gloves: GloveType;
  bodysuit: BodySuitType;
  harness: boolean;
  apron: boolean;
  safetyShoes: boolean;
  goggles: boolean;
  dustMask: boolean;
  earMuffs: boolean;
  vest: boolean;
};

const headgearOptions: { id: HeadgearType; label: string }[] = [
  { id: "none", label: "なし" },
  { id: "helmet", label: "ヘルメット" },
  { id: "cap", label: "室内帽" },
  { id: "plastic-cap", label: "プラキャップ" },
];

const gloveOptions: { id: GloveType; label: string }[] = [
  { id: "none", label: "なし" },
  { id: "leather", label: "革手袋" },
  { id: "rubber", label: "ゴム手袋" },
  { id: "long", label: "ロング手袋" },
];

const bodysuitOptions: { id: BodySuitType; label: string }[] = [
  { id: "none", label: "なし" },
  { id: "coverall", label: "全身防護服" },
  { id: "cleanroom", label: "クリーン服" },
];

const equipmentFlagOptions: { key: EquipmentFlag; label: string; icon: string; iconClass?: string; onNote?: string }[] = [
  { key: "harness", label: "墜落制止用器具", icon: "Y", iconClass: "harness-icon" },
  { key: "apron", label: "エプロン", icon: "▽" },
  { key: "safetyShoes", label: "安全靴", icon: "◣", onNote: "表示中（常時着用が基本）" },
  { key: "goggles", label: "ゴーグル", icon: "∞" },
  { key: "dustMask", label: "防塵マスク", icon: "◒" },
  { key: "earMuffs", label: "イヤーマフ", icon: "∩" },
  { key: "vest", label: "反射ベスト", icon: "▥" },
];

/** 保護具は縦一列に並べず、着ける部位ごとにまとめて出す。 */
const equipmentParts: { id: string; label: string; flags: EquipmentFlag[] }[] = [
  { id: "head", label: "頭部・顔", flags: ["goggles", "dustMask", "earMuffs"] },
  { id: "hand", label: "手", flags: [] },
  { id: "body", label: "体", flags: ["apron", "vest", "harness"] },
  { id: "foot", label: "足", flags: ["safetyShoes"] },
];

/** 簡単モードでは触れない装備・道具が付いているか。付いていれば拡張モードで開く。 */
function needsAdvanced(equipment: Equipment, items: HeldItems, scene: SceneType) {
  return (
    items.left.type !== "none" || items.right.type !== "none" || scene !== "none" ||
    equipment.gloves !== "none" || equipment.bodysuit !== "none" ||
    equipment.headgear === "cap" || equipment.headgear === "plastic-cap" ||
    equipment.harness || equipment.apron || equipment.goggles ||
    equipment.dustMask || equipment.earMuffs || equipment.vest
  );
}

type Hand = "left" | "right";
type HeldItem = { type: ItemType; rotation: number; scale: number };
type HeldItems = Record<Hand, HeldItem>;

const itemOptions: { id: ItemType; label: string; short: string }[] = [
  { id: "none", label: "なし", short: "－" },
  { id: "wrench", label: "スパナ", short: "◆" },
  { id: "screwdriver", label: "ドライバー", short: "⊣" },
  { id: "hammer", label: "ハンマー", short: "Ｔ" },
  { id: "drill", label: "電動ドリル", short: "▰" },
  { id: "sprayer", label: "噴霧器", short: "⌁" },
  { id: "hose", label: "散水ノズル", short: "≋" },
  { id: "flashlight", label: "ライト", short: "◖" },
  { id: "pliers", label: "ペンチ", short: "Ｘ" },
  { id: "saw", label: "のこぎり", short: "▱" },
  { id: "brush", label: "ブラシ", short: "▥" },
  { id: "cutter", label: "カッター", short: "▰" },
  { id: "scissors", label: "ハサミ", short: "✂" },
  { id: "remote", label: "操作リモコン", short: "▦" },
  { id: "rag", label: "ウェス", short: "▱" },
  { id: "clipboard", label: "記録ボード", short: "▤" },
  { id: "pen", label: "ペン", short: "╱" },
  { id: "stopwatch", label: "ストップウォッチ", short: "◴" },
  { id: "ruler", label: "定規", short: "▥" },
  { id: "caliper", label: "ノギス", short: "⊢" },
  { id: "welding-torch", label: "溶接トーチ", short: "⚡" },
  { id: "inspection-hammer", label: "点検ハンマー", short: "┬" },
  { id: "box", label: "段ボール箱", short: "□" },
];

type EditorMode = "simple" | "advanced";

type Favorite = {
  id: string;
  name: string;
  pose: Pose;
  view: PoseView;
  equipment: Equipment;
  items: HeldItems;
  scene: SceneType;
  showTable: boolean;
  injuryJoint?: JointName | null;
  marks?: SceneMark[];
};

const simplePresetIds = ["neutral", "walk", "sit"];
const MODE_STORAGE_KEY = "pict-editor-mode";
const COLUMNS_STORAGE_KEY = "pict-columns";
/** 左右のパネル幅（px）。境界線のドラッグで変えられ、ダブルクリックでここへ戻す。 */
const defaultColumns = { left: 320, right: 350 };
const COLUMN_MIN = 230;
const COLUMN_MAX = 560;
const FAVORITES_STORAGE_KEY = "pict-favorites";
const FAVORITES_LIMIT = 24;
/** 1枚に置けるマークの上限。これ以上増やすと図が読めなくなる。 */
const MARKS_LIMIT = 12;

const initialStyle: FigureStyle = {
  color: "#111111",
  secondaryColor: "#7b8480",
  colorMode: "two-tone",
  strokeWidth: 24,
  headRadius: 28,
  background: "transparent",
};

const tableScenes = new Set<SceneType>([
  "cutting-table",
  "scissor-table",
  "wiping-table",
  "measuring-table",
  "welding-table",
]);

function sceneHasTable(scene: SceneType) {
  return tableScenes.has(scene);
}

const emptyEquipment: Equipment = {
  headgear: "none",
  gloves: "none",
  bodysuit: "none",
  harness: false,
  apron: false,
  safetyShoes: false,
  goggles: false,
  dustMask: false,
  earMuffs: false,
  vest: false,
};

const emptyItems: HeldItems = {
  left: { type: "none", rotation: -10, scale: 1 },
  right: { type: "none", rotation: 10, scale: 1 },
};

function defaultsToEquipment(defaults: PresetDefaults): Equipment {
  return {
    headgear: defaults.helmet ? "helmet" : "none",
    gloves: "none",
    bodysuit: "none",
    harness: Boolean(defaults.harness),
    apron: false,
    safetyShoes: true,
    goggles: false,
    dustMask: false,
    earMuffs: false,
    vest: false,
  };
}

function defaultsToItems(defaults: PresetDefaults): HeldItems {
  return {
    left: defaults.leftItem ? { ...defaults.leftItem } : { ...emptyItems.left },
    right: defaults.rightItem ? { ...defaults.rightItem } : { ...emptyItems.right },
  };
}

function defaultsToScene(defaults: PresetDefaults): SceneType {
  return defaults.scene ?? "none";
}

/** 首から頭へのベクトルが真上から何度傾いているか。頭に付く装備の回転角に使う。 */
function headTiltOf(pose: Pose): number {
  const dx = pose.head.x - pose.neck.x;
  const dy = pose.neck.y - pose.head.y;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return 0;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

function clampColumn(width: number) {
  return Math.round(Math.max(COLUMN_MIN, Math.min(COLUMN_MAX, width)));
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function ItemShape({ type }: { type: ItemType }) {
  if (type === "wrench") {
    return (
      <g>
        <path d="M -8 8 L 23 -23" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
        <path d="M 17 -28 Q 24 -41 39 -37 L 30 -28 L 38 -20 Q 26 -15 17 -22 Z" fill="currentColor" />
        <circle cx="-9" cy="9" r="9" fill="currentColor" />
        <circle cx="-9" cy="9" r="4" fill="white" />
      </g>
    );
  }
  if (type === "screwdriver") {
    return (
      <g>
        <path d="M 6 2 L 39 -31" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M 37 -33 L 45 -41 M 39 -39 L 44 -34" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
        <path d="M -12 8 Q -18 2 -12 -5 L -1 -16 Q 4 -21 10 -15 L 18 -7 Q 22 -3 17 3 L 4 16 Q -1 21 -7 15 Z" fill="currentColor" />
        <path d="M -7 1 L 5 13 M -1 -6 L 11 6" stroke="white" strokeWidth="2.5" opacity=".75" />
      </g>
    );
  }
  if (type === "hammer") {
    return (
      <g>
        <path d="M -6 13 L 24 -22" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
        <path d="M 12 -34 L 36 -14 Q 40 -10 36 -6 L 31 -2 L 3 -26 Z" fill="currentColor" />
        <path d="M 30 -11 L 44 -22 L 36 -29 L 24 -17" fill="currentColor" />
        <path d="M -2 8 L 20 -18" stroke="white" strokeWidth="2" opacity=".55" />
      </g>
    );
  }
  if (type === "drill") {
    return (
      <g>
        <path d="M -12 -18 H 20 Q 31 -18 35 -8 L 38 4 H 7 L 3 13 H -12 Q -19 13 -19 5 V -10 Q -19 -18 -12 -18 Z" fill="currentColor" />
        <path d="M 2 9 H 19 L 15 35 H -2 L -7 28 Z" fill="currentColor" />
        <rect x="-6" y="31" width="25" height="9" rx="3" fill="currentColor" />
        <path d="M 38 -5 H 48 L 54 1 L 48 7 H 38 Z" fill="currentColor" />
        <path d="M 53 1 H 75" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M 70 -3 L 78 1 L 70 5" fill="currentColor" />
        <path d="M -6 -11 H 15 M -6 -5 H 10" stroke="white" strokeWidth="3" opacity=".75" />
        <circle cx="25" cy="-4" r="5" fill="white" opacity=".8" />
      </g>
    );
  }
  if (type === "sprayer") {
    return (
      <g>
        <path d="M -12 2 Q -12 -6 -4 -6 H 18 L 24 29 Q 26 39 16 39 H -3 Q -14 39 -13 29 Z" fill="currentColor" />
        <path d="M -5 4 H 17 L 20 28 H -9 Z" fill="white" opacity=".72" />
        <path d="M -3 -8 V -19 H 25 L 35 -13 L 24 -6 H 9" fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
        <path d="M 10 -15 L 29 -4" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M 40 -16 Q 50 -24 60 -22 M 42 -10 Q 54 -14 65 -9 M 41 -4 Q 52 0 61 7" fill="none" stroke="#238dcc" strokeWidth="4" strokeLinecap="round" />
        <circle cx="67" cy="-21" r="3" fill="#238dcc" /><circle cx="72" cy="-8" r="3" fill="#238dcc" /><circle cx="67" cy="8" r="3" fill="#238dcc" />
      </g>
    );
  }
  if (type === "hose") {
    return (
      <g>
        <path d="M -16 24 Q -10 8 4 2" fill="none" stroke="#238dcc" strokeWidth="9" strokeLinecap="round" />
        <path d="M -1 6 L 9 -17 Q 12 -23 19 -20 L 39 -10 L 30 8 L 11 1 L 6 11 Z" fill="currentColor" />
        <path d="M 15 -10 L 28 -4" stroke="white" strokeWidth="4" strokeLinecap="round" opacity=".75" />
        <path d="M 37 -11 L 48 -8 L 44 3 L 32 1 Z" fill="currentColor" />
        <path d="M 48 -6 Q 59 -10 68 -6 M 49 0 Q 61 0 72 5 M 46 6 Q 57 10 66 18" fill="none" stroke="#238dcc" strokeWidth="5" strokeLinecap="round" />
        <circle cx="75" cy="5" r="3.5" fill="#238dcc" /><circle cx="70" cy="20" r="3.5" fill="#238dcc" />
      </g>
    );
  }
  if (type === "flashlight") {
    return (
      <g>
        <path d="M -15 -10 H 15 L 28 -19 V 19 L 15 10 H -15 Q -22 10 -22 3 V -3 Q -22 -10 -15 -10 Z" fill="currentColor" />
        <path d="M -12 -5 H 12 V 5 H -12 Z" fill="white" opacity=".65" />
        <path d="M 30 -17 L 66 -29 L 66 29 L 30 17 Z" fill="#f6d75d" opacity=".45" />
        <path d="M 31 -10 L 56 -16 M 31 10 L 56 16" stroke="#e8b927" strokeWidth="3" />
      </g>
    );
  }
  if (type === "pliers") {
    return (
      <g>
        <path d="M 3 1 L -17 31 M 7 5 L 28 29" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
        <circle cx="5" cy="3" r="8" fill="currentColor" /><circle cx="5" cy="3" r="3" fill="white" />
        <path d="M 1 -2 L -15 -30 L -4 -39 L 8 -12 L 18 -39 L 29 -30 L 10 -1 Z" fill="currentColor" />
        <path d="M -9 -31 L -2 -35 M 22 -31 L 15 -35" stroke="white" strokeWidth="2.5" />
      </g>
    );
  }
  if (type === "saw") {
    return (
      <g>
        <path d="M -18 13 Q -28 4 -18 -7 L -5 -19 Q 4 -27 14 -18 L 22 -10 L 9 3 L 2 -4 L -8 6 L 0 14 Z" fill="currentColor" />
        <path d="M 8 7 L 61 -27 L 70 -18 L 22 22 Z" fill="currentColor" />
        <path d="M 18 19 L 22 28 L 29 20 L 34 24 L 40 15 L 45 18 L 51 8" fill="currentColor" />
        <path d="M -10 -5 Q -2 -13 5 -7 L 10 -2 L 1 7 Z" fill="white" opacity=".8" />
      </g>
    );
  }
  if (type === "brush") {
    return (
      <g>
        <path d="M -13 17 L 30 -25" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
        <path d="M 20 -34 L 42 -13 L 29 1 L 6 -21 Z" fill="currentColor" />
        <path d="M 34 -13 L 47 0 M 29 -8 L 42 5 M 24 -3 L 37 10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M -8 12 L 25 -20" stroke="white" strokeWidth="2" opacity=".55" />
      </g>
    );
  }
  if (type === "cutter") {
    return (
      <g>
        <path d="M -18 -11 H 29 Q 36 -11 36 -4 V 8 Q 36 14 29 14 H -18 Q -25 14 -25 7 V -4 Q -25 -11 -18 -11 Z" fill="currentColor" />
        <path d="M 35 -6 L 75 -3 L 68 8 L 35 10 Z" fill="#b7bdc0" stroke="currentColor" strokeWidth="3" />
        <path d="M 48 -4 L 46 9 M 60 -3 L 57 8" stroke="#737a7d" strokeWidth="2" />
        <rect x="2" y="-7" width="15" height="7" rx="3" fill="white" opacity=".82" />
        <path d="M -16 7 H 25" stroke="white" strokeWidth="3" opacity=".55" />
      </g>
    );
  }
  if (type === "scissors") {
    return (
      <g>
        <circle cx="-15" cy="-12" r="12" fill="none" stroke="currentColor" strokeWidth="7" />
        <circle cx="-15" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="7" />
        <circle cx="7" cy="2" r="7" fill="currentColor" /><circle cx="7" cy="2" r="2.5" fill="white" />
        <path d="M 10 -1 L 65 -24 Q 72 -26 67 -18 L 14 7 Z" fill="#9ea5a8" stroke="currentColor" strokeWidth="3" />
        <path d="M 10 5 L 65 27 Q 72 30 67 21 L 14 -2 Z" fill="#c3c8ca" stroke="currentColor" strokeWidth="3" />
      </g>
    );
  }
  if (type === "remote") {
    return (
      <g>
        <path d="M 0 -30 V -46" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <rect x="-18" y="-31" width="36" height="67" rx="8" fill="currentColor" />
        <rect x="-11" y="-23" width="22" height="12" rx="3" fill="white" opacity=".88" />
        <circle cx="-7" cy="2" r="5" fill="#e44332" /><circle cx="7" cy="2" r="5" fill="#44a45c" />
        <path d="M -7 18 L -7 29 M -12 23 H -2 M 7 29 V 18 M 2 23 H 12" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }
  if (type === "rag") {
    return (
      <g>
        <path d="M -24 -12 Q -8 -23 5 -12 Q 20 -21 32 -8 Q 23 5 31 20 Q 12 28 -1 17 Q -14 28 -28 15 Q -20 1 -24 -12 Z" fill="#aeb5b8" stroke="currentColor" strokeWidth="4" />
        <path d="M -13 -8 Q 0 0 17 -7 M -17 9 Q 1 16 20 7" fill="none" stroke="white" strokeWidth="3" opacity=".75" />
      </g>
    );
  }
  if (type === "clipboard") {
    return (
      <g>
        <rect x="-28" y="-39" width="56" height="78" rx="5" fill="#d9ddda" stroke="currentColor" strokeWidth="5" />
        <rect x="-12" y="-45" width="24" height="13" rx="4" fill="currentColor" />
        <path d="M -16 -20 H 16 M -16 -6 H 16 M -16 8 H 9 M -16 22 H 14" stroke="#707875" strokeWidth="4" strokeLinecap="round" />
        <path d="M -20 -24 L -14 -18 L -6 -28" fill="none" stroke="#318456" strokeWidth="3" />
      </g>
    );
  }
  if (type === "pen") {
    return (
      <g>
        <path d="M -18 16 L 31 -33" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
        <path d="M 31 -33 L 41 -43 L 35 -27 Z" fill="#aeb5b8" stroke="currentColor" strokeWidth="3" />
        <path d="M -19 16 L -26 26 L -12 20 Z" fill="currentColor" />
        <path d="M -9 7 L 21 -23" stroke="white" strokeWidth="2.5" opacity=".7" />
      </g>
    );
  }
  if (type === "stopwatch") {
    return (
      <g>
        <rect x="-9" y="-38" width="18" height="11" rx="3" fill="currentColor" />
        <path d="M 14 -28 L 24 -37 M -14 -28 L -24 -37" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <circle cx="0" cy="0" r="30" fill="white" stroke="currentColor" strokeWidth="7" />
        <circle cx="0" cy="0" r="4" fill="currentColor" />
        <path d="M 0 0 L 0 -19 M 0 0 L 14 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M -18 0 H -23 M 18 0 H 23 M 0 18 V 23" stroke="#727a76" strokeWidth="3" />
      </g>
    );
  }
  if (type === "ruler") {
    return (
      <g>
        <rect x="-48" y="-10" width="96" height="20" rx="3" fill="#f0c94b" stroke="currentColor" strokeWidth="4" />
        <path d="M -36 -9 V 2 M -24 -9 V 6 M -12 -9 V 2 M 0 -9 V 6 M 12 -9 V 2 M 24 -9 V 6 M 36 -9 V 2" stroke="currentColor" strokeWidth="3" />
      </g>
    );
  }
  if (type === "caliper") {
    return (
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -45 0 H 48" strokeWidth="7" />
        <rect x="-8" y="-13" width="28" height="26" rx="3" fill="#b8bec0" strokeWidth="4" />
        <path d="M -40 0 V 27 H -22 M 13 0 V 23 H 30 M -40 0 V -22 H -28 M 13 0 V -18 H 27" strokeWidth="6" />
        <path d="M 22 -5 H 50 M 31 -5 V 7" strokeWidth="4" />
      </g>
    );
  }
  if (type === "welding-torch") {
    return (
      <g>
        <path d="M -28 27 Q -12 10 -5 -5" fill="none" stroke="#3f4744" strokeWidth="9" strokeLinecap="round" />
        <path d="M -8 2 L 8 -27 Q 12 -35 21 -30 L 31 -24 Q 38 -19 33 -11 L 15 17 Z" fill="currentColor" />
        <path d="M 28 -16 L 51 -5" stroke="#777f7b" strokeWidth="7" strokeLinecap="round" />
        <path d="M 51 -5 L 63 -1" stroke="#c8d0d1" strokeWidth="4" strokeLinecap="round" />
        <circle cx="68" cy="1" r="6" fill="#f4c542" /><circle cx="68" cy="1" r="3" fill="white" />
      </g>
    );
  }
  if (type === "inspection-hammer") {
    return (
      <g>
        <path d="M -27 25 L 23 -25" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        <path d="M 12 -35 H 43 Q 50 -35 50 -29 V -22 Q 50 -16 43 -16 H 12 Z" fill="currentColor" />
        <circle cx="50" cy="-25" r="7" fill="#aeb5b8" stroke="currentColor" strokeWidth="3" />
        <path d="M -21 19 L 17 -19" stroke="white" strokeWidth="2" opacity=".65" />
      </g>
    );
  }
  if (type === "box") {
    return (
      <g>
        <rect x="-58" y="-44" width="116" height="88" rx="4" fill="#c89454" stroke="currentColor" strokeWidth="6" />
        <path d="M 0 -43 V 44 M -58 -12 H 58" stroke="#936736" strokeWidth="4" />
        <path d="M -21 -43 L -9 -12 H 9 L 21 -43" fill="#deb376" stroke="#936736" strokeWidth="3" />
        <path d="M 25 14 H 46 M 25 24 H 42" stroke="#6f4c2b" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  return null;
}

function SceneLayer({ scene, pose, items, showTable }: { scene: SceneType; pose: Pose; items: HeldItems; showTable: boolean }) {
  if (scene === "none") return null;
  if (!showTable && sceneHasTable(scene)) return null;
  const toolHand: Hand = items.right.type !== "none" ? "right" : "left";
  const wrist = toolHand === "right" ? pose.wristR : pose.wristL;
  const tableX = Math.max(20, Math.min(210, wrist.x - 75));
  const tableY = Math.min(285, wrist.y + 24);

  if (scene === "overhead-crane") {
    const hipMid = midpoint(pose.hipL, pose.hipR);
    const facingRight = pose.head.x >= hipMid.x;
    const hookX = facingRight ? 338 : 62;
    return (
      <g className="scene-layer" fill="none" stroke="#59615d" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 24 34 H 376" strokeWidth="10" />
        <rect x={hookX - 24} y="29" width="48" height="19" rx="4" fill="#59615d" stroke="none" />
        <circle cx={hookX - 11} cy="50" r="5" fill="#111" stroke="none" /><circle cx={hookX + 11} cy="50" r="5" fill="#111" stroke="none" />
        <path d={`M ${hookX} 48 V 106`} strokeWidth="5" />
        <path d={`M ${hookX} 105 V 119 Q ${hookX} 139 ${hookX + (facingRight ? -18 : 18)} 139 Q ${hookX + (facingRight ? -31 : 31)} 139 ${hookX + (facingRight ? -31 : 31)} 125`} stroke="#111" strokeWidth="8" />
        <path d={`M ${hookX + (facingRight ? -44 : 44)} 96 L ${hookX + (facingRight ? -57 : 57)} 87 M ${hookX + (facingRight ? -46 : 46)} 108 L ${hookX + (facingRight ? -62 : 62)} 108`} stroke="#9aa0a3" strokeWidth="4" />
      </g>
    );
  }

  if (scene === "measuring-table") {
    return (
      <g className="scene-layer" strokeLinecap="round" strokeLinejoin="round">
        <rect x={tableX} y={tableY} width="170" height="13" rx="4" fill="#555d59" />
        <path d={`M ${tableX + 18} ${tableY + 12} V 402 M ${tableX + 152} ${tableY + 12} V 402`} stroke="#555d59" strokeWidth="10" />
        <rect x={tableX + 24} y={tableY - 20} width="124" height="20" rx="3" fill="#c1c7c3" stroke="#59615d" strokeWidth="3" />
        <path d={`M ${tableX + 26} ${tableY - 31} H ${tableX + 146} M ${tableX + 26} ${tableY - 37} V ${tableY - 25} M ${tableX + 146} ${tableY - 37} V ${tableY - 25}`} fill="none" stroke="#2f7f61" strokeWidth="3" />
        <path d={`M ${tableX + 26} ${tableY - 31} l 9 -5 v 10 z M ${tableX + 146} ${tableY - 31} l -9 -5 v 10 z`} fill="#2f7f61" />
      </g>
    );
  }

  if (scene === "welding-table") {
    return (
      <g className="scene-layer" strokeLinecap="round" strokeLinejoin="round">
        <rect x={tableX} y={tableY} width="170" height="14" rx="3" fill="#555d59" />
        <path d={`M ${tableX + 18} ${tableY + 12} V 402 M ${tableX + 152} ${tableY + 12} V 402`} stroke="#555d59" strokeWidth="10" />
        <path d={`M ${tableX + 28} ${tableY - 8} H ${tableX + 144} M ${tableX + 86} ${tableY - 8} V ${tableY - 42}`} stroke="#7a8280" strokeWidth="10" />
        <circle cx={wrist.x + 70} cy={wrist.y + 3} r="7" fill="#fff3a8" stroke="#f0ad25" strokeWidth="4" />
        <path d={`M ${wrist.x + 71} ${wrist.y - 9} L ${wrist.x + 77} ${wrist.y - 24} M ${wrist.x + 82} ${wrist.y - 3} L ${wrist.x + 98} ${wrist.y - 12} M ${wrist.x + 83} ${wrist.y + 8} L ${wrist.x + 99} ${wrist.y + 18} M ${wrist.x + 70} ${wrist.y + 14} L ${wrist.x + 75} ${wrist.y + 30}`} stroke="#f0ad25" strokeWidth="4" fill="none" />
      </g>
    );
  }

  if (scene === "impact-inspection") {
    const targetX = Math.min(360, wrist.x + 54);
    return (
      <g className="scene-layer" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${targetX} 105 V 326 Q ${targetX} 342 ${targetX - 16} 342 H ${targetX - 38}`} fill="none" stroke="#737b78" strokeWidth="14" />
        <path d={`M ${targetX - 12} 127 H ${targetX + 8} M ${targetX - 12} 305 H ${targetX + 8}`} stroke="#aeb5b2" strokeWidth="5" />
        <circle cx={targetX - 6} cy={wrist.y} r="7" fill="#f0ad25" />
        <path d={`M ${targetX + 5} ${wrist.y - 14} Q ${targetX + 22} ${wrist.y} ${targetX + 5} ${wrist.y + 14} M ${targetX + 16} ${wrist.y - 24} Q ${targetX + 43} ${wrist.y} ${targetX + 16} ${wrist.y + 24}`} fill="none" stroke="#6f8b9b" strokeWidth="4" />
      </g>
    );
  }

  if (scene === "box-carry") return null;

  const isScissors = scene === "scissor-table";
  const isWiping = scene === "wiping-table";
  return (
    <g className="scene-layer" strokeLinecap="round" strokeLinejoin="round">
      <rect x={tableX} y={tableY} width="170" height="13" rx="4" fill="#555d59" />
      <path d={`M ${tableX + 18} ${tableY + 12} V 402 M ${tableX + 152} ${tableY + 12} V 402`} stroke="#555d59" strokeWidth="10" />
      {!isWiping && (
        <g>
          <path
            d={isScissors
              ? `M ${tableX + 25} ${tableY - 13} H ${tableX + 140} L ${tableX + 128} ${tableY} H ${tableX + 25} Z`
              : `M ${tableX + 25} ${tableY - 15} H ${tableX + 145} V ${tableY} H ${tableX + 25} Z`}
            fill="#c1c7c3" stroke="#59615d" strokeWidth="3"
          />
          <path d={`M ${wrist.x + 18} ${tableY - 15} V ${tableY + 1}`} stroke="#d94b3d" strokeWidth="3" strokeDasharray="4 4" />
        </g>
      )}
      {isWiping && (
        <g fill="none" stroke="#87908b">
          <path d={`M ${tableX + 32} ${tableY - 7} Q ${tableX + 50} ${tableY - 17} ${tableX + 69} ${tableY - 7}`} strokeWidth="4" strokeDasharray="5 6" />
          <path d={`M ${wrist.x - 30} ${wrist.y - 18} Q ${wrist.x} ${wrist.y - 35} ${wrist.x + 30} ${wrist.y - 18}`} strokeWidth="4" />
          <path d={`M ${wrist.x - 18} ${wrist.y - 27} L ${wrist.x - 27} ${wrist.y - 17} M ${wrist.x + 18} ${wrist.y - 27} L ${wrist.x + 27} ${wrist.y - 17}`} strokeWidth="4" />
        </g>
      )}
    </g>
  );
}

function SceneForeground({ scene, pose }: { scene: SceneType; pose: Pose }) {
  if (scene === "box-carry") {
    const center = midpoint(pose.wristL, pose.wristR);
    return (
      <g className="scene-layer">
        <rect x={center.x - 68} y={center.y - 50} width="136" height="100" rx="5" fill="#c89454" stroke="#5d4228" strokeWidth="6" />
        <path d={`M ${center.x} ${center.y - 49} V ${center.y + 50} M ${center.x - 68} ${center.y - 14} H ${center.x + 68}`} stroke="#936736" strokeWidth="4" />
        <path d={`M ${center.x - 24} ${center.y - 49} L ${center.x - 10} ${center.y - 14} H ${center.x + 10} L ${center.x + 24} ${center.y - 49}`} fill="#deb376" stroke="#936736" strokeWidth="3" />
        <path d={`M ${center.x + 28} ${center.y + 15} H ${center.x + 52} M ${center.x + 28} ${center.y + 27} H ${center.x + 47}`} stroke="#6f4c2b" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  return null;
}

function SceneSafetyOverlay({ scene, pose }: { scene: SceneType; pose: Pose }) {
  if (scene !== "welding-table") return null;
  const { head } = pose;
  return (
    <g className="scene-layer figure-attached" transform={`rotate(${headTiltOf(pose).toFixed(1)} ${head.x} ${head.y}) translate(${head.x + 9} ${head.y - 1}) rotate(8)`}>
      <path d="M -29 -31 Q 3 -42 31 -24 L 28 27 Q 6 43 -25 28 Z" fill="#252b29" stroke="#111" strokeWidth="5" />
      <rect x="-5" y="-18" width="31" height="20" rx="3" fill="#86a6ae" stroke="#111" strokeWidth="4" />
      <path d="M 0 -13 H 21" stroke="white" strokeWidth="3" opacity=".65" />
    </g>
  );
}

function HeldItemLayer({ pose, items }: { pose: Pose; items: HeldItems }) {
  return (
    <>
      {(["left", "right"] as Hand[]).map((hand) => {
        const item = items[hand];
        if (item.type === "none") return null;
        const wrist = hand === "left" ? pose.wristL : pose.wristR;
        return (
          <g className="held-item-layer"
            key={hand}
            color="var(--primary-color)"
            transform={`translate(${wrist.x} ${wrist.y}) rotate(${item.rotation}) scale(${item.scale})`}
          >
            <ItemShape type={item.type} />
          </g>
        );
      })}
    </>
  );
}

function EquipmentLayer({ pose, style, equipment, view = "front" }: { pose: Pose; style: FigureStyle; equipment: Equipment; view?: PoseView }) {
  const shoulderMid = midpoint(pose.shoulderL, pose.shoulderR);
  const hipMid = midpoint(pose.hipL, pose.hipR);
  const head = pose.head;
  const headR = style.headRadius;
  const isSide = view === "side";
  const rearOpacity = isSide ? 0.38 : 1;
  const facing = head.x >= hipMid.x ? 1 : -1;
  // 首から頭へのベクトルを頭の向きとみなし、ヘルメットや面体をその角度で傾ける。
  const headTilt = headTiltOf(pose);
  const headTransform = `rotate(${headTilt.toFixed(1)} ${head.x} ${head.y})`;
  const torsoPath = `M ${pose.shoulderL.x} ${pose.shoulderL.y} Q ${shoulderMid.x} ${shoulderMid.y - 5} ${pose.shoulderR.x} ${pose.shoulderR.y} L ${pose.hipR.x} ${pose.hipR.y} Q ${hipMid.x} ${hipMid.y + 4} ${pose.hipL.x} ${pose.hipL.y} Z`;
  const limbPath = (a: Point, b: Point, c: Point) => `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}`;
  const clean = equipment.bodysuit === "cleanroom";

  const arms = [
    { elbow: pose.elbowL, wrist: pose.wristL, opacity: rearOpacity },
    { elbow: pose.elbowR, wrist: pose.wristR, opacity: 1 },
  ];
  const legs = [
    { ankle: pose.ankleL, opacity: rearOpacity },
    { ankle: pose.ankleR, opacity: 1 },
  ];
  const suitLimbs = [
    { d: limbPath(pose.shoulderL, pose.elbowL, pose.wristL), opacity: rearOpacity },
    { d: limbPath(pose.hipL, pose.kneeL, pose.ankleL), opacity: rearOpacity },
    { d: limbPath(pose.shoulderR, pose.elbowR, pose.wristR), opacity: 1 },
    { d: limbPath(pose.hipR, pose.kneeR, pose.ankleR), opacity: 1 },
  ];
  const cuffStart = equipment.gloves === "long" ? 0.04 : equipment.gloves === "rubber" ? 0.5 : 0.76;
  const shoeW = Math.max(26, style.strokeWidth * 1.5);
  const shoeH = Math.max(12, style.strokeWidth * 0.62);
  const apronTopHalf = Math.max(16, Math.abs(pose.shoulderR.x - pose.shoulderL.x) * 0.3);
  const apronBottomHalf = Math.abs(pose.hipR.x - pose.hipL.x) / 2 + 15;
  const apronTopY = shoulderMid.y + 15;
  const apronBottomY = hipMid.y + 44;

  return (
    <>
      {equipment.bodysuit !== "none" && (
        <g className="equipment-layer bodysuit-layer" strokeLinecap="round" strokeLinejoin="round">
          {suitLimbs.map((limb, index) => (
            <g key={index} opacity={limb.opacity}>
              <path d={limb.d} fill="none" stroke="var(--secondary-color)" strokeWidth={clean ? style.strokeWidth + 5 : style.strokeWidth} />
              {clean && <path d={limb.d} fill="none" stroke="white" strokeWidth={Math.max(6, style.strokeWidth - 4)} />}
            </g>
          ))}
          <path d={torsoPath} fill={clean ? "white" : "var(--secondary-color)"} stroke="var(--secondary-color)" strokeWidth={clean ? 5 : style.strokeWidth * 0.72} />
          <circle cx={head.x} cy={head.y} r={headR + 7} fill="none" stroke="var(--secondary-color)" strokeWidth={clean ? 11 : 8} />
          {clean && <circle cx={head.x} cy={head.y} r={headR + 7} fill="none" stroke="white" strokeWidth="5" />}
        </g>
      )}
      {equipment.vest && (
        <g className="equipment-layer vest-layer" fill="none" strokeLinecap="round">
          {[0.3, 0.7].map((t) => {
            const top = lerp(pose.shoulderL, pose.shoulderR, t);
            const bottom = lerp(pose.hipL, pose.hipR, t);
            return (
              <g key={t}>
                <path d={`M ${top.x} ${top.y + 6} L ${bottom.x} ${bottom.y - 6}`} stroke="var(--secondary-color)" strokeWidth="9" />
                <path d={`M ${top.x} ${top.y + 6} L ${bottom.x} ${bottom.y - 6}`} stroke="white" strokeWidth="5" opacity=".92" />
              </g>
            );
          })}
          <path d={`M ${lerp(pose.hipL, pose.hipR, 0.06).x} ${lerp(pose.hipL, pose.hipR, 0.06).y - 16} L ${lerp(pose.hipL, pose.hipR, 0.94).x} ${lerp(pose.hipL, pose.hipR, 0.94).y - 16}`} stroke="white" strokeWidth="5" opacity=".92" />
        </g>
      )}
      {equipment.apron && (
        <g className="equipment-layer apron-layer" strokeLinejoin="round">
          <path d={`M ${shoulderMid.x - apronTopHalf} ${apronTopY} Q ${pose.neck.x} ${pose.neck.y} ${shoulderMid.x + apronTopHalf} ${apronTopY}`} fill="none" stroke="var(--secondary-color)" strokeWidth="5" />
          <path
            d={`M ${shoulderMid.x - apronTopHalf} ${apronTopY} L ${shoulderMid.x + apronTopHalf} ${apronTopY} L ${hipMid.x + apronBottomHalf} ${apronBottomY} L ${hipMid.x - apronBottomHalf} ${apronBottomY} Z`}
            fill="var(--secondary-color)" stroke="var(--primary-color)" strokeWidth="3"
          />
          <path d={`M ${hipMid.x - apronBottomHalf + 6} ${hipMid.y - 6} L ${hipMid.x + apronBottomHalf - 6} ${hipMid.y - 6}`} fill="none" stroke="white" strokeWidth="3" opacity=".6" />
        </g>
      )}
      {equipment.harness && (
        <g className="equipment-layer harness-layer" fill="none" stroke="var(--secondary-color)" strokeWidth={Math.max(6, style.strokeWidth * 0.32)} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M ${pose.shoulderL.x} ${pose.shoulderL.y + 5} L ${hipMid.x + 11} ${hipMid.y - 4} L ${pose.shoulderR.x} ${pose.shoulderR.y + 5}`} />
          <path d={`M ${pose.shoulderR.x} ${pose.shoulderR.y + 5} L ${hipMid.x - 11} ${hipMid.y - 4} L ${pose.shoulderL.x} ${pose.shoulderL.y + 5}`} />
          <path d={`M ${pose.hipL.x - 3} ${pose.hipL.y - 8} L ${pose.hipR.x + 3} ${pose.hipR.y - 8}`} />
          <path d={`M ${pose.hipL.x} ${pose.hipL.y - 4} Q ${pose.hipL.x - 13} ${pose.hipL.y + 24} ${pose.hipL.x + 3} ${pose.hipL.y + 36}`} />
          <path d={`M ${pose.hipR.x} ${pose.hipR.y - 4} Q ${pose.hipR.x + 13} ${pose.hipR.y + 24} ${pose.hipR.x - 3} ${pose.hipR.y + 36}`} />
          <circle cx={shoulderMid.x} cy={(shoulderMid.y + hipMid.y) / 2} r="5" fill="var(--secondary-color)" stroke="var(--primary-color)" strokeWidth="2" />
        </g>
      )}
      {equipment.gloves !== "none" && (
        <g className="equipment-layer glove-layer">
          {arms.map((arm, index) => {
            const start = lerp(arm.elbow, arm.wrist, cuffStart);
            const dx = arm.wrist.x - start.x;
            const dy = arm.wrist.y - start.y;
            const len = Math.hypot(dx, dy) || 1;
            const cuffBar = Math.max(9, style.strokeWidth * 0.72);
            const nx = (-dy / len) * cuffBar;
            const ny = (dx / len) * cuffBar;
            return (
              <g key={index} opacity={arm.opacity}>
                <path d={`M ${start.x} ${start.y} L ${arm.wrist.x} ${arm.wrist.y}`} fill="none" stroke="var(--secondary-color)" strokeWidth={style.strokeWidth * 1.14} strokeLinecap="round" />
                {equipment.gloves !== "leather" && (
                  <path d={`M ${start.x - nx} ${start.y - ny} L ${start.x + nx} ${start.y + ny}`} fill="none" stroke="var(--secondary-color)" strokeWidth="6" strokeLinecap="round" />
                )}
                <circle cx={arm.wrist.x} cy={arm.wrist.y} r={style.strokeWidth * 0.68} fill="var(--secondary-color)" stroke="var(--primary-color)" strokeWidth="2.5" />
              </g>
            );
          })}
        </g>
      )}
      {equipment.safetyShoes && (
        <g className="equipment-layer shoe-layer">
          {legs.map((leg, index) => (
            <rect
              key={index}
              x={leg.ankle.x - shoeW / 2 + (isSide ? facing * 5 : 0)}
              y={leg.ankle.y - shoeH * 0.4}
              width={shoeW}
              height={shoeH}
              rx={shoeH / 2}
              fill="var(--secondary-color)"
              stroke="var(--primary-color)"
              strokeWidth="3"
              opacity={leg.opacity}
            />
          ))}
        </g>
      )}
      {equipment.headgear === "helmet" && (
        <g className="equipment-layer helmet-layer" transform={headTransform} stroke="var(--primary-color)" strokeWidth="4" strokeLinejoin="round">
          <path
            d={`M ${head.x - style.headRadius - 3} ${head.y - 8} Q ${head.x - style.headRadius + 1} ${head.y - style.headRadius - 23} ${head.x} ${head.y - style.headRadius - 25} Q ${head.x + style.headRadius - 2} ${head.y - style.headRadius - 21} ${head.x + style.headRadius + 3} ${head.y - 8} Z`}
            fill="var(--primary-color)"
          />
          <rect x={head.x - style.headRadius - 12} y={head.y - 10} width={style.headRadius * 2 + 27} height="9" rx="4.5" fill="var(--primary-color)" stroke="none" />
          <path d={`M ${head.x - 2} ${head.y - style.headRadius - 24} V ${head.y - style.headRadius - 10}`} fill="none" stroke="white" strokeWidth="3" opacity=".75" />
          <path d={`M ${head.x - style.headRadius + 3} ${head.y - 10} Q ${head.x} ${head.y - 16} ${head.x + style.headRadius - 3} ${head.y - 10}`} fill="none" stroke="white" strokeWidth="3" opacity=".72" />
        </g>
      )}
      {equipment.headgear === "cap" && (
        <g className="equipment-layer cap-layer" transform={headTransform} strokeLinejoin="round" strokeLinecap="round">
          <path
            d={`M ${head.x - headR + 3} ${head.y - 8} Q ${head.x - headR + 2} ${head.y - headR - 11} ${head.x} ${head.y - headR - 11} Q ${head.x + headR - 2} ${head.y - headR - 11} ${head.x + headR - 3} ${head.y - 8} Z`}
            fill="var(--secondary-color)" stroke="var(--primary-color)" strokeWidth="3"
          />
          {isSide ? (
            <path d={`M ${head.x + (headR - 7) * facing} ${head.y - 9} Q ${head.x + (headR + 12) * facing} ${head.y - 10} ${head.x + (headR + 14) * facing} ${head.y - 4}`} fill="none" stroke="var(--secondary-color)" strokeWidth="6" />
          ) : (
            <path d={`M ${head.x - headR - 5} ${head.y - 8} L ${head.x + headR + 5} ${head.y - 8}`} fill="none" stroke="var(--secondary-color)" strokeWidth="6" />
          )}
        </g>
      )}
      {equipment.headgear === "plastic-cap" && (
        <g className="equipment-layer plastic-cap-layer" transform={headTransform} strokeLinejoin="round" strokeLinecap="round">
          <path
            d={`M ${head.x - headR - 4} ${head.y - 1} Q ${head.x - headR - 5} ${head.y - headR - 13} ${head.x} ${head.y - headR - 13} Q ${head.x + headR + 5} ${head.y - headR - 13} ${head.x + headR + 4} ${head.y - 1} Z`}
            fill="white" opacity=".94" stroke="var(--secondary-color)" strokeWidth="4"
          />
          <path d={`M ${head.x - headR - 2} ${head.y - 1} L ${head.x + headR + 2} ${head.y - 1}`} fill="none" stroke="var(--secondary-color)" strokeWidth="3" strokeDasharray="5 4" />
        </g>
      )}
      {equipment.goggles && (
        <g className="equipment-layer goggle-layer" transform={headTransform} strokeLinejoin="round" strokeLinecap="round">
          <path d={`M ${head.x - headR - 4} ${head.y - 5} L ${head.x + headR + 4} ${head.y - 5}`} fill="none" stroke="var(--secondary-color)" strokeWidth="5" />
          <rect
            x={head.x - headR * 0.62 + (isSide ? facing * headR * 0.28 : 0)}
            y={head.y - 13}
            width={headR * 1.24}
            height="16"
            rx="8"
            fill="white" opacity=".95" stroke="var(--secondary-color)" strokeWidth="4"
          />
        </g>
      )}
      {equipment.dustMask && (
        <g className="equipment-layer mask-layer" transform={headTransform} strokeLinejoin="round" strokeLinecap="round">
          <path d={`M ${head.x - headR} ${head.y + 2} L ${head.x - headR * 0.5} ${head.y + headR * 0.4} M ${head.x + headR} ${head.y + 2} L ${head.x + headR * 0.5} ${head.y + headR * 0.4}`} fill="none" stroke="var(--secondary-color)" strokeWidth="3.5" />
          <ellipse
            cx={head.x + (isSide ? facing * headR * 0.3 : 0)}
            cy={head.y + headR * 0.42}
            rx={headR * 0.62}
            ry={headR * 0.46}
            fill="white" opacity=".96" stroke="var(--secondary-color)" strokeWidth="4"
          />
          <circle cx={head.x + (isSide ? facing * headR * 0.3 : 0)} cy={head.y + headR * 0.5} r="4" fill="var(--secondary-color)" />
        </g>
      )}
      {equipment.earMuffs && (
        <g className="equipment-layer earmuff-layer" transform={headTransform} strokeLinecap="round">
          <path d={`M ${head.x - headR * 0.86} ${head.y} Q ${head.x} ${head.y - headR - 12} ${head.x + headR * 0.86} ${head.y}`} fill="none" stroke="var(--secondary-color)" strokeWidth="5.5" />
          <circle cx={head.x - headR * 0.86} cy={head.y + 3} r="9" fill="var(--secondary-color)" stroke="var(--primary-color)" strokeWidth="2.5" />
          <circle cx={head.x + headR * 0.86} cy={head.y + 3} r="9" fill="var(--secondary-color)" stroke="var(--primary-color)" strokeWidth="2.5" />
        </g>
      )}
    </>
  );
}

function MarkLayer({ marks }: { marks: SceneMark[] }) {
  if (!marks.length) return null;
  return (
    <g className="mark-layer">
      {marks.map((mark) => (
        <g
          key={mark.id}
          color={markToneColors[mark.tone]}
          transform={`translate(${mark.x} ${mark.y}) rotate(${mark.rotation}) scale(${mark.scale})`}
        >
          <MarkGraphic type={mark.type} tone={mark.tone} label={mark.label} />
        </g>
      ))}
    </g>
  );
}

/** 労災報告で「どこを負傷したか」を示すための、関節に付ける衝撃マーク。 */
function InjuryMarkLayer({ pose, joint }: { pose: Pose; joint: JointName | null }) {
  if (!joint) return null;
  const center = pose[joint];
  const spikes = 12;
  const outline = Array.from({ length: spikes * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? 27 : 15;
    const angle = (Math.PI * index) / spikes - Math.PI / 2;
    return `${(center.x + Math.cos(angle) * radius).toFixed(1)} ${(center.y + Math.sin(angle) * radius).toFixed(1)}`;
  }).join(" L ");
  const path = `M ${outline} Z`;
  return (
    <g className="injury-layer" strokeLinejoin="round">
      <path d={path} fill="white" stroke="white" strokeWidth="7" />
      <path d={path} fill="var(--secondary-color)" stroke="var(--primary-color)" strokeWidth="2.5" />
    </g>
  );
}

function FloorGridLayer() {
  // 30°勾配（dy70 / dx121）の2方向ラインでアイソメ風の床帯を描く
  const xs = Array.from({ length: 13 }, (_, i) => -140 + i * 44);
  return (
    <g className="floor-layer" fill="none" stroke="var(--secondary-color)" strokeWidth="1.5" opacity="0.45">
      {xs.map((x) => (
        <path key={`a${x}`} d={`M ${x} 435 L ${x + 121} 365`} />
      ))}
      {xs.map((x) => (
        <path key={`b${x}`} d={`M ${x} 365 L ${x + 121} 435`} />
      ))}
    </g>
  );
}

function GroundShadowLayer({ pose }: { pose: Pose }) {
  const cx = (pose.ankleL.x + pose.ankleR.x) / 2;
  const cy = Math.min(430, Math.max(pose.ankleL.y, pose.ankleR.y) + 13);
  const rx = Math.max(46, Math.min(150, Math.abs(pose.ankleL.x - pose.ankleR.x) / 2 + 30));
  return <ellipse className="shadow-layer" cx={cx} cy={cy} rx={rx} ry="11" fill="var(--secondary-color)" opacity="0.3" />;
}

function Figure({
  pose,
  style,
  view = "front",
  equipment = emptyEquipment,
  items = emptyItems,
  scene = "none",
  showTable = true,
  groundShadow = false,
  floorGrid = false,
  editable = false,
  selected,
  injuryJoint = null,
  marks = [],
  selectedMark = null,
  onJointPointerDown,
  onMarkPointerDown,
}: {
  pose: Pose;
  style: FigureStyle;
  view?: PoseView;
  equipment?: Equipment;
  items?: HeldItems;
  scene?: SceneType;
  showTable?: boolean;
  groundShadow?: boolean;
  floorGrid?: boolean;
  editable?: boolean;
  selected?: JointName | null;
  injuryJoint?: JointName | null;
  marks?: SceneMark[];
  selectedMark?: string | null;
  onJointPointerDown?: (joint: JointName, event: ReactPointerEvent<SVGCircleElement>) => void;
  onMarkPointerDown?: (id: string, event: ReactPointerEvent<SVGCircleElement>) => void;
}) {
  const shoulderMid = midpoint(pose.shoulderL, pose.shoulderR);
  const hipMid = midpoint(pose.hipL, pose.hipR);
  const limbProps = {
    fill: "none",
    stroke: style.color,
    strokeWidth: style.strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const rearOpacity = view === "side" ? 0.38 : 1;
  const secondaryColor = style.colorMode === "mono" ? style.color : style.secondaryColor;
  const figureVariables = {
    "--primary-color": style.color,
    "--secondary-color": secondaryColor,
  } as CSSProperties;

  return (
    <g className="figure-root" style={figureVariables}>
      {floorGrid && <FloorGridLayer />}
      <SceneLayer scene={scene} pose={pose} items={items} showTable={showTable} />
      {groundShadow && <GroundShadowLayer pose={pose} />}
      <path opacity={rearOpacity} d={`M ${pose.shoulderL.x} ${pose.shoulderL.y} L ${pose.elbowL.x} ${pose.elbowL.y} L ${pose.wristL.x} ${pose.wristL.y}`} {...limbProps} />
      <path opacity={rearOpacity} d={`M ${pose.hipL.x} ${pose.hipL.y} L ${pose.kneeL.x} ${pose.kneeL.y} L ${pose.ankleL.x} ${pose.ankleL.y}`} {...limbProps} />
      <path d={`M ${pose.shoulderR.x} ${pose.shoulderR.y} L ${pose.elbowR.x} ${pose.elbowR.y} L ${pose.wristR.x} ${pose.wristR.y}`} {...limbProps} />
      <path d={`M ${pose.hipR.x} ${pose.hipR.y} L ${pose.kneeR.x} ${pose.kneeR.y} L ${pose.ankleR.x} ${pose.ankleR.y}`} {...limbProps} />
      <path
        d={`M ${pose.shoulderL.x} ${pose.shoulderL.y} Q ${shoulderMid.x} ${shoulderMid.y - 5} ${pose.shoulderR.x} ${pose.shoulderR.y} L ${pose.hipR.x} ${pose.hipR.y} Q ${hipMid.x} ${hipMid.y + 4} ${pose.hipL.x} ${pose.hipL.y} Z`}
        fill={style.color}
        stroke={style.color}
        strokeWidth={style.strokeWidth * 0.72}
        strokeLinejoin="round"
      />
      <path d={`M ${pose.neck.x} ${pose.neck.y} L ${shoulderMid.x} ${shoulderMid.y + 3}`} {...limbProps} />
      <SceneForeground scene={scene} pose={pose} />
      <circle cx={pose.wristL.x} cy={pose.wristL.y} r={style.strokeWidth * 0.58} fill={style.color} opacity={rearOpacity} />
      <circle cx={pose.wristR.x} cy={pose.wristR.y} r={style.strokeWidth * 0.58} fill={style.color} />
      <circle cx={pose.head.x} cy={pose.head.y} r={style.headRadius} fill={style.color} />
      <EquipmentLayer pose={pose} style={style} equipment={equipment} view={view} />
      <SceneSafetyOverlay scene={scene} pose={pose} />
      <HeldItemLayer pose={pose} items={items} />
      <InjuryMarkLayer pose={pose} joint={injuryJoint} />
      <MarkLayer marks={marks} />

      {editable && jointNames.map((joint) => (
        <g key={joint} className="editor-only">
          <circle
            cx={pose[joint].x}
            cy={pose[joint].y}
            r={16}
            className="joint-hit-area"
            onPointerDown={(event) => onJointPointerDown?.(joint, event)}
            role="button"
            aria-label={`${jointLabels[joint]}を移動`}
          />
          <circle
            cx={pose[joint].x}
            cy={pose[joint].y}
            r={selected === joint ? 10 : 8}
            className={`joint-handle ${selected === joint ? "is-selected" : ""}`}
          />
        </g>
      ))}

      {editable && marks.map((mark) => (
        <g key={mark.id} className="editor-only">
          <circle
            cx={mark.x}
            cy={mark.y}
            r={Math.max(16, 22 * mark.scale)}
            className="joint-hit-area"
            onPointerDown={(event) => onMarkPointerDown?.(mark.id, event)}
            role="button"
            aria-label={`${markOptions.find((option) => option.id === mark.type)?.label ?? "マーク"}を移動`}
          />
          <circle
            cx={mark.x}
            cy={mark.y}
            r={selectedMark === mark.id ? 8 : 6}
            className={`mark-handle ${selectedMark === mark.id ? "is-selected" : ""}`}
          />
        </g>
      ))}
    </g>
  );
}

type ExportScope = "full" | "figure";

function serializeSvg(source: SVGSVGElement, style: FigureStyle, pose: Pose, scope: ExportScope) {
  const root = source.cloneNode(true) as SVGSVGElement;
  root.querySelectorAll(".editor-only").forEach((node) => node.remove());
  if (scope === "figure") {
    root.querySelectorAll(".scene-layer:not(.figure-attached), .floor-layer").forEach((node) => node.remove());
  }
  root.classList.remove("editor-canvas");
  root.removeAttribute("style");
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  root.setAttribute("viewBox", "0 0 400 440");
  root.setAttribute("width", "400");
  root.setAttribute("height", "440");
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", "編集したピクトグラム");
  const anchor = (point: Point) => `${Math.round(point.x)},${Math.round(point.y)}`;
  root.setAttribute("data-floor-y", "398");
  root.setAttribute("data-anchor-head", anchor(pose.head));
  root.setAttribute("data-anchor-wrist-left", anchor(pose.wristL));
  root.setAttribute("data-anchor-wrist-right", anchor(pose.wristR));
  root.setAttribute("data-anchor-hip-center", anchor(midpoint(pose.hipL, pose.hipR)));
  const secondaryColor = style.colorMode === "mono" ? style.color : style.secondaryColor;
  root.querySelectorAll<SVGElement>(".scene-layer, .scene-layer *").forEach((node) => {
    const fill = node.getAttribute("fill");
    const stroke = node.getAttribute("stroke");
    if (fill && fill !== "none" && fill !== "white") node.setAttribute("fill", secondaryColor);
    if (stroke && stroke !== "none" && stroke !== "white") node.setAttribute("stroke", secondaryColor);
  });
  root.querySelectorAll<SVGElement>('.held-item-layer [fill^="#"]').forEach((node) => node.setAttribute("fill", secondaryColor));
  root.querySelectorAll<SVGElement>('.held-item-layer [stroke^="#"]').forEach((node) => node.setAttribute("stroke", secondaryColor));
  if (style.background === "white") {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "400");
    rect.setAttribute("height", "440");
    rect.setAttribute("fill", "white");
    root.insertBefore(rect, root.firstChild);
  }
  return new XMLSerializer().serializeToString(root);
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function PoseEditor() {
  const [presetId, setPresetId] = useState("neutral");
  const [pose, setPose] = useState<Pose>(() => clonePose(posePresets[0].pose));
  const [view, setView] = useState<PoseView>(posePresets[0].view);
  const [figureStyle, setFigureStyle] = useState(initialStyle);
  const [equipment, setEquipment] = useState<Equipment>(() => defaultsToEquipment(posePresets[0].defaults));
  const [items, setItems] = useState<HeldItems>(() => defaultsToItems(posePresets[0].defaults));
  const [scene, setScene] = useState<SceneType>(() => defaultsToScene(posePresets[0].defaults));
  const [showTable, setShowTable] = useState(true);
  const [groundShadow, setGroundShadow] = useState(false);
  const [floorGrid, setFloorGrid] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>("full");
  const [activeHand, setActiveHand] = useState<Hand>("right");
  const [category, setCategory] = useState<(typeof categories)[number]>("すべて");
  const [tagFilter, setTagFilter] = useState<PresetTag | null>(null);
  const [selectedJoint, setSelectedJoint] = useState<JointName | null>(null);
  const [injuryJoint, setInjuryJoint] = useState<JointName | null>(null);
  const [marks, setMarks] = useState<SceneMark[]>([]);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);
  const [markGroup, setMarkGroup] = useState<MarkGroup>("annotation");
  const [history, setHistory] = useState<Pose[]>([]);
  const [future, setFuture] = useState<Pose[]>([]);
  const [notice, setNotice] = useState("関節の丸をドラッグして姿勢を調整");
  const [mode, setMode] = useState<EditorMode>("simple");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [columns, setColumns] = useState(defaultColumns);
  const svgRef = useRef<SVGSVGElement>(null);
  // 描画ごとに変わらない連番でマークIDを作る（描画中の Date.now は不安定なため）。
  const markSeq = useRef(0);
  const columnDrag = useRef<{ side: "left" | "right"; startX: number; startWidth: number } | null>(null);
  const dragging = useRef<
    | { kind: "joint"; joint: JointName; before: Pose }
    | { kind: "mark"; id: string }
    | null
  >(null);

  useEffect(() => {
    // 静的書き出しではサーバー側にlocalStorageがないため、マウント後に復元する
    try {
      const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storedMode === "simple" || storedMode === "advanced") setMode(storedMode);
      const storedColumns = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (storedColumns) {
        const parsed: unknown = JSON.parse(storedColumns);
        if (parsed && typeof parsed === "object") {
          const { left, right } = parsed as Partial<typeof defaultColumns>;
          setColumns({
            left: clampColumn(left ?? defaultColumns.left),
            right: clampColumn(right ?? defaultColumns.right),
          });
        }
      }
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
         
        if (Array.isArray(parsed)) setFavorites(parsed as Favorite[]);
      }
    } catch {
      // 端末保存が使えない環境（プライベートモード等）では既定値のまま
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
    } catch { /* 保存できなくても動作は継続 */ }
  }, [columns]);

  const startColumnDrag = (side: "left" | "right", event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch { /* ポインターが無効な環境でも掴めるようにする */ }
    columnDrag.current = { side, startX: event.clientX, startWidth: columns[side] };
  };

  const moveColumnDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = columnDrag.current;
    if (!drag) return;
    const delta = event.clientX - drag.startX;
    const width = clampColumn(drag.side === "left" ? drag.startWidth + delta : drag.startWidth - delta);
    setColumns((current) => ({ ...current, [drag.side]: width }));
  };

  const endColumnDrag = () => {
    columnDrag.current = null;
  };

  const nudgeColumn = (side: "left" | "right", event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    const step = (event.key === "ArrowLeft" ? -16 : 16) * (side === "left" ? 1 : -1);
    setColumns((current) => ({ ...current, [side]: clampColumn(current[side] + step) }));
  };

  const changeMode = (next: EditorMode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch { /* 保存できなくても動作は継続 */ }
    if (next === "simple") {
      setCategory("すべて");
      setTagFilter(null);
    }
    setNotice(next === "simple" ? "簡単モード: 基本3ポーズ＋ヘルメット・安全靴のみ" : "拡張モード: すべてのプリセットと装備を表示");
  };

  const persistFavorites = (next: Favorite[]) => {
    setFavorites(next);
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      setNotice("この端末ではお気に入りを保存できませんでした");
    }
  };

  const saveFavorite = () => {
    const favorite: Favorite = {
      id: `fav-${Date.now()}`,
      name: `お気に入り${favorites.length + 1}`,
      pose: clonePose(pose),
      view,
      equipment: { ...equipment },
      items: { left: { ...items.left }, right: { ...items.right } },
      scene,
      showTable,
      injuryJoint,
      marks: marks.map((mark) => ({ ...mark })),
    };
    persistFavorites([...favorites, favorite].slice(-FAVORITES_LIMIT));
    setNotice(`「${favorite.name}」として保存しました（この端末のみ）`);
  };

  const loadFavorite = (id: string) => {
    const favorite = favorites.find((candidate) => candidate.id === id);
    if (!favorite) return;
    const favoriteEquipment = { ...emptyEquipment, ...favorite.equipment };
    const favoriteItems = {
      left: { ...emptyItems.left, ...favorite.items?.left },
      right: { ...emptyItems.right, ...favorite.items?.right },
    };
    const favoriteScene = favorite.scene ?? "none";
    // 簡単モードの画面には無い装備・道具が入っていたら、操作できるよう拡張モードで開く。
    const openAsAdvanced = mode === "simple" && needsAdvanced(favoriteEquipment, favoriteItems, favoriteScene);
    if (openAsAdvanced) changeMode("advanced");
    setHistory((current) => [...current.slice(-29), clonePose(pose)]);
    setFuture([]);
    setPose(clonePose(favorite.pose));
    setView(favorite.view);
    setEquipment(favoriteEquipment);
    setItems(favoriteItems);
    setScene(favoriteScene);
    setShowTable(favorite.showTable ?? true);
    setSelectedJoint(null);
    setInjuryJoint(favorite.injuryJoint ?? null);
    setMarks((favorite.marks ?? []).map((mark) => ({ ...mark, id: nextMarkId() })));
    setSelectedMarkId(null);
    setNotice(openAsAdvanced
      ? `「${favorite.name}」を読み込みました（道具や装備を含むため拡張モードにしました）`
      : `「${favorite.name}」を読み込みました`);
  };

  const applyDetectedFigure = (figure: DetectedFigure, index: number) => {
    setHistory((current) => [...current.slice(-29), clonePose(pose)]);
    setFuture([]);
    setPose(clonePose(figure.pose));
    setView(figure.view);
    setSelectedJoint(null);
    setInjuryJoint(null);
    setMarks([]);
    setSelectedMarkId(null);
    setPhotoOpen(false);
    setNotice(`写真の人物${index + 1}の姿勢を取り込みました。関節をドラッグして微調整できます`);
  };

  const deleteFavorite = (id: string) => {
    const favorite = favorites.find((candidate) => candidate.id === id);
    persistFavorites(favorites.filter((candidate) => candidate.id !== id));
    setNotice(favorite ? `「${favorite.name}」を削除しました` : "お気に入りを削除しました");
  };

  const visiblePresets = useMemo(
    () => posePresets
      .filter((preset) => {
        if (mode === "simple") return simplePresetIds.includes(preset.id);
        if (tagFilter && !preset.tags.includes(tagFilter)) return false;
        if (category === "すべて") return true;
        if (category === "横向き") return preset.view === "side";
        return preset.category === category;
      })
      // 数が多いので、資料でよく使う順に前へ出す（同順位は元の並び）。
      .sort((a, b) => a.rank - b.rank),
    [category, mode, tagFilter],
  );

  // 選んだカテゴリの中に該当が1つもないタグは押せないようにする。
  const tagsInCategory = useMemo(() => {
    const inCategory = posePresets.filter((preset) => {
      if (category === "すべて") return true;
      if (category === "横向き") return preset.view === "side";
      return preset.category === category;
    });
    return new Set(inCategory.flatMap((preset) => preset.tags));
  }, [category]);

  const chooseTag = (tag: PresetTag | null) => {
    setTagFilter(tag);
    setNotice(tag ? `タグ「${tag}」で絞り込みました` : "タグの絞り込みを解除しました");
  };

  const loadPreset = (id: string) => {
    const preset = posePresets.find((candidate) => candidate.id === id);
    if (!preset) return;
    setHistory((current) => [...current.slice(-29), clonePose(pose)]);
    setFuture([]);
    setPresetId(id);
    setPose(clonePose(preset.pose));
    setView(preset.view);
    setEquipment(defaultsToEquipment(preset.defaults));
    setItems(defaultsToItems(preset.defaults));
    setScene(defaultsToScene(preset.defaults));
    setShowTable(true);
    setSelectedJoint(null);
    setInjuryJoint(null);
    setMarks([]);
    setSelectedMarkId(null);
    setNotice(`「${preset.name}」を選択しました`);
  };

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.max(10, Math.min(390, ((clientX - rect.left) / rect.width) * 400)),
      y: Math.max(10, Math.min(430, ((clientY - rect.top) / rect.height) * 440)),
    };
  }, []);

  const onJointPointerDown = (joint: JointName, event: ReactPointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 一部のモバイルブラウザではタッチ終了後にポインターが無効になり例外を投げる
    }
    dragging.current = { kind: "joint", joint, before: clonePose(pose) };
    setSelectedJoint(joint);
    setNotice(`${jointLabels[joint]}を調整中`);
  };

  const onMarkPointerDown = (id: string, event: ReactPointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 一部のモバイルブラウザではタッチ終了後にポインターが無効になり例外を投げる
    }
    dragging.current = { kind: "mark", id };
    setSelectedMarkId(id);
    setNotice(`${markLabelOf(id)}を調整中`);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const target = dragging.current;
    if (!target) return;
    const point = clientToSvg(event.clientX, event.clientY);
    if (!point) return;
    if (target.kind === "mark") {
      setMarks((current) => current.map((mark) => (mark.id === target.id ? { ...mark, ...point } : mark)));
      return;
    }
    setPose((current) => ({ ...current, [target.joint]: point }));
  };

  const finishDrag = () => {
    const finished = dragging.current;
    if (!finished) return;
    dragging.current = null;
    if (finished.kind === "mark") {
      setNotice(`${markLabelOf(finished.id)}を移動しました`);
      return;
    }
    setHistory((current) => [...current.slice(-29), finished.before]);
    setFuture([]);
    setNotice(`${jointLabels[finished.joint]}を移動しました`);
  };

  const undo = useCallback(() => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    setFuture((current) => [clonePose(pose), ...current].slice(0, 30));
    setPose(clonePose(previous));
    setNotice("1つ前に戻しました");
  }, [history, pose]);

  const redo = useCallback(() => {
    const next = future[0];
    if (!next) return;
    setFuture((current) => current.slice(1));
    setHistory((current) => [...current, clonePose(pose)].slice(-30));
    setPose(clonePose(next));
    setNotice("やり直しました");
  }, [future, pose]);

  const mirror = () => {
    const swapPairs: [JointName, JointName][] = [
      ["shoulderL", "shoulderR"], ["elbowL", "elbowR"], ["wristL", "wristR"],
      ["hipL", "hipR"], ["kneeL", "kneeR"], ["ankleL", "ankleR"],
    ];
    const next = clonePose(pose);
    next.head.x = 400 - pose.head.x;
    next.neck.x = 400 - pose.neck.x;
    swapPairs.forEach(([left, right]) => {
      next[left] = { x: 400 - pose[right].x, y: pose[right].y };
      next[right] = { x: 400 - pose[left].x, y: pose[left].y };
    });
    setHistory((current) => [...current.slice(-29), clonePose(pose)]);
    setFuture([]);
    setPose(next);
    setItems({
      left: { ...items.right, rotation: -items.right.rotation },
      right: { ...items.left, rotation: -items.left.rotation },
    });
    setNotice("人物・道具を左右反転しました");
  };

  const updateActiveItem = (patch: Partial<HeldItem>) => {
    setItems((current) => ({ ...current, [activeHand]: { ...current[activeHand], ...patch } }));
  };

  const chooseItem = (type: ItemType) => {
    updateActiveItem({ type });
    const label = itemOptions.find((item) => item.id === type)?.label ?? "道具";
    setNotice(`${activeHand === "left" ? "左手" : "右手"}の道具を「${label}」にしました`);
  };

  const chooseHeadgear = (headgear: HeadgearType) => {
    setEquipment((current) => ({ ...current, headgear }));
    const label = headgearOptions.find((option) => option.id === headgear)?.label ?? "なし";
    setNotice(headgear === "none" ? "頭部の保護具を外しました" : `頭部の保護具を「${label}」にしました`);
  };

  const chooseGloves = (gloves: GloveType) => {
    setEquipment((current) => ({ ...current, gloves }));
    const label = gloveOptions.find((option) => option.id === gloves)?.label ?? "なし";
    setNotice(gloves === "none" ? "手袋を外しました" : `手袋を「${label}」にしました`);
  };

  const chooseBodysuit = (bodysuit: BodySuitType) => {
    setEquipment((current) => ({ ...current, bodysuit }));
    const label = bodysuitOptions.find((option) => option.id === bodysuit)?.label ?? "なし";
    setNotice(bodysuit === "none" ? "全身の保護服を外しました" : `全身の保護服を「${label}」にしました`);
  };

  const toggleInjuryMark = () => {
    if (!selectedJoint) return;
    const next = injuryJoint === selectedJoint ? null : selectedJoint;
    setInjuryJoint(next);
    setNotice(next ? `${jointLabels[next]}に受傷部位マークを付けました` : "受傷部位マークを外しました");
  };

  const nextMarkId = () => {
    markSeq.current += 1;
    return `mark-${markSeq.current}`;
  };

  const addMark = (type: MarkType) => {
    if (marks.length >= MARKS_LIMIT) {
      setNotice(`マークは1枚に${MARKS_LIMIT}個までです。不要なマークを削除してください`);
      return;
    }
    const option = markOptions.find((candidate) => candidate.id === type);
    const anchor = selectedJoint ? pose[selectedJoint] : { x: 200, y: 150 };
    // 同じ場所に重ねて置いても掴めるよう、2個目以降は少しずらす。
    const stacked = marks.filter((mark) => Math.hypot(mark.x - anchor.x, mark.y - anchor.y) < 6).length;
    const stepNumbers = marks.filter((mark) => mark.type === "step").length + 1;
    const mark: SceneMark = {
      id: nextMarkId(),
      type,
      x: Math.min(390, anchor.x + stacked * 16),
      y: Math.min(430, anchor.y + stacked * 16),
      label: type === "step" ? String(stepNumbers) : undefined,
      ...markDefaults[type],
    };
    setMarks((current) => [...current, mark]);
    setSelectedMarkId(mark.id);
    setNotice(
      selectedJoint
        ? `${jointLabels[selectedJoint]}に「${option?.label ?? "マーク"}」を置きました。ドラッグで移動できます`
        : `「${option?.label ?? "マーク"}」を置きました。ドラッグで移動できます`,
    );
  };

  const selectedMark = marks.find((mark) => mark.id === selectedMarkId) ?? null;

  const markLabelOf = (id: string) => {
    const mark = marks.find((candidate) => candidate.id === id);
    return markOptions.find((option) => option.id === mark?.type)?.label ?? "マーク";
  };

  const updateSelectedMark = (patch: Partial<SceneMark>) => {
    if (!selectedMarkId) return;
    setMarks((current) => current.map((mark) => (mark.id === selectedMarkId ? { ...mark, ...patch } : mark)));
  };

  const deleteSelectedMark = () => {
    if (!selectedMarkId) return;
    const label = markLabelOf(selectedMarkId);
    setMarks((current) => current.filter((mark) => mark.id !== selectedMarkId));
    setSelectedMarkId(null);
    setNotice(`「${label}」を削除しました`);
  };

  const clearMarks = () => {
    if (!marks.length) return;
    setMarks([]);
    setSelectedMarkId(null);
    setNotice("マークをすべて削除しました");
  };

  const toggleEquipmentFlag = (key: EquipmentFlag) => {
    const label = equipmentFlagOptions.find((option) => option.key === key)?.label ?? "装備";
    setNotice(`${label}を${equipment[key] ? "非表示" : "表示"}にしました`);
    setEquipment((current) => ({ ...current, [key]: !current[key] }));
  };

  const reset = () => loadPreset(presetId);

  const getSvg = () => svgRef.current ? serializeSvg(svgRef.current, figureStyle, pose, exportScope) : null;

  const exportSuffix = exportScope === "figure" ? "-figure" : "";

  const downloadSvg = () => {
    const svg = getSvg();
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `pictogram-${presetId}${exportSuffix}.svg`);
    setNotice(exportScope === "figure" ? "人物のみのSVGをダウンロードしました（アンカー座標つき）" : "保護具・道具を含むSVGをダウンロードしました");
  };

  const downloadPng = () => {
    const svg = getSvg();
    if (!svg) return;
    const image = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1320;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob && downloadBlob(blob, `pictogram-${presetId}${exportSuffix}.png`), "image/png");
      URL.revokeObjectURL(url);
      setNotice("保護具・道具を含む高解像度PNGをダウンロードしました");
    };
    image.src = url;
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (!selectedJoint || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const amount = event.shiftKey ? 10 : 1;
      const delta = {
        ArrowUp: { x: 0, y: -amount }, ArrowDown: { x: 0, y: amount },
        ArrowLeft: { x: -amount, y: 0 }, ArrowRight: { x: amount, y: 0 },
      }[event.key]!;
      setHistory((current) => [...current.slice(-29), clonePose(pose)]);
      setFuture([]);
      setPose((current) => ({
        ...current,
        [selectedJoint]: {
          x: Math.max(10, Math.min(390, current[selectedJoint].x + delta.x)),
          y: Math.max(10, Math.min(430, current[selectedJoint].y + delta.y)),
        },
      }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pose, redo, selectedJoint, undo]);

  const activeItem = items[activeHand];
  // 簡単モードなのに拡張モードの装備・道具が残っている状態を、画面から気づけるようにする。
  const hiddenAdvanced = mode === "simple" && needsAdvanced(equipment, items, scene);
  const suggestedMarks = useMemo(() => suggestedMarksFor(presetId), [presetId]);
  const selectedMarkOption = selectedMark ? markOptions.find((option) => option.id === selectedMark.type) : null;

  const groupOption = markGroupOptions.find((option) => option.id === markGroup);
  const groupMarks = markOptions.filter((option) => option.group === markGroup);
  const selectedIsSign = selectedMark ? isSignMark(selectedMark.type) : false;
  const toneChoices = selectedIsSign ? signToneOptions : markToneOptions;

  const markButton = (type: MarkType, key?: string) => {
    const option = markOptions.find((candidate) => candidate.id === type);
    if (!option) return null;
    return (
      <button
        key={key ?? type}
        className="item-button mark-button"
        onClick={() => addMark(type)}
        title={`${option.label}：${option.hint}`}
      >
        <svg viewBox="-46 -46 92 92" aria-hidden="true" className="mark-thumb">
          <g color={markToneColors[markDefaults[type].tone]}>
            <MarkGraphic type={type} tone={markDefaults[type].tone} halo={false} />
          </g>
        </svg>
        {option.label}
      </button>
    );
  };

  const markSection = (
    <div className="setting-group mark-group">
      <label>注目マーク <strong>絵に足す説明記号</strong></label>
      <p className="mark-hint">ボタンを押すと絵の中に置きます（関節を選んでいればその位置に）。キャンバス上でドラッグして移動、タップで選び直せます。</p>
      {suggestedMarks.length > 0 && (
        <div className="mark-suggest">
          <span className="mark-suggest-label">この作業でよく使う</span>
          <div className="item-grid mark-grid">
            {suggestedMarks.map((type) => markButton(type, `suggest-${type}`))}
          </div>
        </div>
      )}
      <div className="segmented mark-group-tabs" role="group" aria-label="マークの種類">
        {markGroupOptions.map((option) => (
          <button
            key={option.id}
            className={markGroup === option.id ? "active" : ""}
            onClick={() => setMarkGroup(option.id)}
            aria-pressed={markGroup === option.id}
          >{option.label}</button>
        ))}
      </div>
      <p className="mark-hint">{groupOption?.note}</p>
      <div className="item-grid mark-grid">
        {groupMarks.map((option) => markButton(option.id))}
      </div>
      {selectedMark ? (
        <div className="item-adjust">
          <label>選択中のマーク <strong>{selectedMarkOption?.label ?? "マーク"}</strong></label>
          <div className={`segmented ${selectedIsSign ? "" : "cols-3"}`}>
            {toneChoices.map((tone) => (
              <button
                key={tone.id}
                className={selectedMark.tone === tone.id ? "active" : ""}
                onClick={() => updateSelectedMark({ tone: tone.id as MarkTone })}
                aria-pressed={selectedMark.tone === tone.id}
              >{tone.label}</button>
            ))}
          </div>
          <label htmlFor="mark-scale">大きさ <strong>{Math.round(selectedMark.scale * 100)}%</strong></label>
          <input
            id="mark-scale" type="range" min="0.5" max="2.4" step="0.1"
            value={selectedMark.scale}
            onChange={(event) => updateSelectedMark({ scale: Number(event.target.value) })}
          />
          {selectedMarkOption?.rotatable && (
            <>
              <label htmlFor="mark-rotation">向き <strong>{selectedMark.rotation}°</strong></label>
              <input
                id="mark-rotation" type="range" min="-180" max="180" step="15"
                value={selectedMark.rotation}
                onChange={(event) => updateSelectedMark({ rotation: Number(event.target.value) })}
              />
            </>
          )}
          {selectedMark.type === "step" && (
            <>
              <label htmlFor="mark-label">番号・記号 <strong>2文字まで</strong></label>
              <input
                id="mark-label" className="mark-text" type="text" maxLength={2} inputMode="numeric"
                value={selectedMark.label ?? ""}
                onChange={(event) => updateSelectedMark({ label: event.target.value })}
              />
            </>
          )}
          <div className="mark-actions">
            <button onClick={deleteSelectedMark}>このマークを削除</button>
            <button onClick={clearMarks}>すべて削除（{marks.length}）</button>
          </div>
        </div>
      ) : (
        <p className="mark-hint">
          {marks.length
            ? `${marks.length}個のマークを配置中。キャンバス上のマークをタップすると色・大きさを変えられます。`
            : `まだマークはありません（1枚に${MARKS_LIMIT}個まで）。`}
        </p>
      )}
    </div>
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><i /></div>
          <div><p className="eyebrow">MANUAL FIGURE STUDIO</p><h1>ピクトポーズ</h1></div>
        </div>
        <p className="header-copy">姿勢・保護具・道具を組み合わせ、作業マニュアル用の人物図を保存。</p>
        <div className="export-actions">
          <div className="segmented mode-switch" role="group" aria-label="編集モード">
            <button className={mode === "simple" ? "active" : ""} onClick={() => changeMode("simple")} aria-pressed={mode === "simple"}>簡単</button>
            <button className={mode === "advanced" ? "active" : ""} onClick={() => changeMode("advanced")} aria-pressed={mode === "advanced"}>拡張</button>
          </div>
          <Link className="button secondary nav-link" href="/about">About</Link>
          <button className="button secondary" onClick={downloadPng}>PNG保存</button>
          <button className="button primary" onClick={downloadSvg}>SVGを保存</button>
        </div>
      </header>

      <section
        className="workspace"
        aria-label="ピクトグラム編集画面"
        style={{ "--col-left": `${columns.left}px`, "--col-right": `${columns.right}px` } as CSSProperties}
      >
        <aside className="preset-panel panel">
          <button
            className="col-resizer left"
            role="separator"
            aria-orientation="vertical"
            aria-label="姿勢パネルの幅を変える（矢印キーでも調整、ダブルクリックで既定に戻す）"
            onPointerDown={(event) => startColumnDrag("left", event)}
            onPointerMove={moveColumnDrag}
            onPointerUp={endColumnDrag}
            onPointerCancel={endColumnDrag}
            onKeyDown={(event) => nudgeColumn("left", event)}
            onDoubleClick={() => setColumns(defaultColumns)}
          />
          <div className="panel-heading">
            <div><span className="step">01</span><h2>姿勢を選ぶ</h2></div>
            <span className="count">{visiblePresets.length} POSES</span>
          </div>
          {mode === "advanced" && (
            <>
              <div className="category-tabs" aria-label="姿勢カテゴリ">
                {categories.map((item) => (
                  <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
                ))}
              </div>
              <div className="tag-tabs" aria-label="用途タグで絞り込み">
                <span className="tag-tabs-label">用途</span>
                <button className={tagFilter === null ? "active" : ""} onClick={() => chooseTag(null)}>指定なし</button>
                {presetTagOrder.map((tag) => (
                  <button
                    key={tag}
                    className={tagFilter === tag ? "active" : ""}
                    onClick={() => chooseTag(tagFilter === tag ? null : tag)}
                    disabled={!tagsInCategory.has(tag)}
                    aria-pressed={tagFilter === tag}
                  >{tag}</button>
                ))}
              </div>
            </>
          )}
          {mode === "simple" && <p className="mode-hint">基本の3ポーズから選び、関節をドラッグして自由に調整。もっとプリセットが欲しいときは右上の「拡張」へ。</p>}
          <div className="preset-grid">
            {visiblePresets.map((preset) => (
              <button
                key={preset.id}
                className={`preset-card ${presetId === preset.id ? "active" : ""}`}
                onClick={() => loadPreset(preset.id)}
                aria-pressed={presetId === preset.id}
                title={preset.tags.length ? `${preset.name}（${preset.tags.join(" / ")}）` : preset.name}
              >
                <svg viewBox="0 0 400 440" aria-hidden="true">
                  <Figure
                    pose={preset.pose}
                    view={preset.view}
                    style={{ ...initialStyle, strokeWidth: 25, headRadius: 30 }}
                    equipment={defaultsToEquipment(preset.defaults)}
                    items={defaultsToItems(preset.defaults)}
                    scene={defaultsToScene(preset.defaults)}
                  />
                </svg>
                <span>{preset.name}</span>
                {mode === "advanced" && preset.rank === 1 && <b className="preset-rank">よく使う</b>}
                {mode === "advanced" && preset.tags.length > 0 && (
                  <em className="preset-tags">{preset.tags.join("・")}</em>
                )}
              </button>
            ))}
          </div>
          {visiblePresets.length === 0 && (
            <p className="mode-hint">この組み合わせに当てはまる姿勢がありません。カテゴリか用途タグを変えてください。</p>
          )}

          <div className="panel-heading favorites-heading">
            <div><span className="step">★</span><h2>お気に入り</h2></div>
            <span className="count">{favorites.length} SAVED</span>
          </div>
          {favorites.length === 0 ? (
            <p className="favorites-empty">編集画面の「☆ 保存」で現在の姿勢・装備・道具をこの端末（ブラウザ）に保存できます。</p>
          ) : (
            <div className="preset-grid">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="preset-card favorite-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => loadFavorite(favorite.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      loadFavorite(favorite.id);
                    }
                  }}
                >
                  <svg viewBox="0 0 400 440" aria-hidden="true">
                    <Figure
                      pose={favorite.pose}
                      view={favorite.view}
                      style={{ ...initialStyle, strokeWidth: 25, headRadius: 30 }}
                      equipment={{ ...emptyEquipment, ...favorite.equipment }}
                      items={{ left: { ...emptyItems.left, ...favorite.items?.left }, right: { ...emptyItems.right, ...favorite.items?.right } }}
                      scene={favorite.scene ?? "none"}
                      showTable={favorite.showTable ?? true}
                      injuryJoint={favorite.injuryJoint ?? null}
                      marks={favorite.marks ?? []}
                    />
                  </svg>
                  <span>{favorite.name}</span>
                  <button className="favorite-delete" aria-label={`${favorite.name}を削除`} onClick={(event) => { event.stopPropagation(); deleteFavorite(favorite.id); }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="editor-panel panel">
          <div className="panel-heading editor-heading">
            <div><span className="step">02</span><h2>ドラッグで調整</h2></div>
            <div className="history-actions">
              <button onClick={undo} disabled={!history.length} aria-label="元に戻す">↶</button>
              <button onClick={redo} disabled={!future.length} aria-label="やり直す">↷</button>
              <button onClick={mirror}>左右反転</button>
              <button onClick={reset}>姿勢リセット</button>
              <button onClick={saveFavorite} aria-label="現在の状態をお気に入りに保存">☆ 保存</button>
              <button className="photo-open" onClick={() => setPhotoOpen(true)}>写真から読み取る</button>
            </div>
          </div>
          <div className={`canvas-wrap ${figureStyle.background === "white" ? "white" : "transparent"}`}>
            <span className="view-badge">{view === "side" ? "SIDE / 横向き" : "FRONT / 正面"}</span>
            <svg ref={svgRef} className="editor-canvas" viewBox="0 0 400 440" onPointerMove={onPointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} aria-label="関節をドラッグして編集するピクトグラム">
              <Figure pose={pose} view={view} style={figureStyle} equipment={equipment} items={items} scene={scene} showTable={showTable} groundShadow={groundShadow} floorGrid={floorGrid} editable selected={selectedJoint} injuryJoint={injuryJoint} marks={marks} selectedMark={selectedMarkId} onJointPointerDown={onJointPointerDown} onMarkPointerDown={onMarkPointerDown} />
            </svg>
            <div className="canvas-status" role="status"><span className="status-dot" />{notice}</div>
          </div>
          <div className="shortcut-note"><kbd>↑ ↓ ← →</kbd> 1px移動　<kbd>Shift</kbd> + 矢印 10px移動　<kbd>Ctrl Z</kbd> 戻す</div>
        </section>

        <aside className="settings-panel panel">
          <button
            className="col-resizer right"
            role="separator"
            aria-orientation="vertical"
            aria-label="装備パネルの幅を変える（矢印キーでも調整、ダブルクリックで既定に戻す）"
            onPointerDown={(event) => startColumnDrag("right", event)}
            onPointerMove={moveColumnDrag}
            onPointerUp={endColumnDrag}
            onPointerCancel={endColumnDrag}
            onKeyDown={(event) => nudgeColumn("right", event)}
            onDoubleClick={() => setColumns(defaultColumns)}
          />
          <div className="panel-heading"><div><span className="step">03</span><h2>装備と見た目</h2></div></div>
          {mode === "simple" ? (
            <>
            {hiddenAdvanced && (
              <div className="mode-banner">
                <p>いま表示中の図には、簡単モードでは触れない装備や道具が含まれています。</p>
                <button onClick={() => changeMode("advanced")}>拡張モードで開く</button>
              </div>
            )}
            <div className="setting-group equipment-group">
              <label>安全装備 <strong>基本の2つ</strong></label>
              <div className="option-stack">
                <button className={equipment.headgear === "helmet" ? "option-toggle active" : "option-toggle"} onClick={() => chooseHeadgear(equipment.headgear === "helmet" ? "none" : "helmet")} aria-pressed={equipment.headgear === "helmet"}>
                  <span className="option-icon helmet-icon" aria-hidden="true" />
                  <span><strong>ヘルメット</strong><small>{equipment.headgear === "helmet" ? "表示中" : "非表示"}</small></span>
                  <i>{equipment.headgear === "helmet" ? "ON" : "OFF"}</i>
                </button>
                <button className={equipment.safetyShoes ? "option-toggle active" : "option-toggle"} onClick={() => toggleEquipmentFlag("safetyShoes")} aria-pressed={equipment.safetyShoes}>
                  <span className="option-icon glyph-icon" aria-hidden="true">◣</span>
                  <span><strong>安全靴</strong><small>{equipment.safetyShoes ? "表示中（常時着用が基本）" : "非表示"}</small></span>
                  <i>{equipment.safetyShoes ? "ON" : "OFF"}</i>
                </button>
              </div>
              <p className="mode-hint">手袋・防護服・道具・配色は右上の「拡張」モードで設定できます。</p>
            </div>
            {markSection}
            </>
          ) : (
            <>
          <div className="setting-group equipment-group">
            <label>保護具 <strong>着ける部位ごとに</strong></label>
            {equipmentParts.map((part) => (
              <div className="equip-block" key={part.id}>
                <span className="equip-block-label">{part.label}</span>
                {part.id === "head" && (
                  <div className="segmented cols-4">
                    {headgearOptions.map((option) => (
                      <button key={option.id} className={equipment.headgear === option.id ? "active" : ""} onClick={() => chooseHeadgear(option.id)} aria-pressed={equipment.headgear === option.id}>{option.label}</button>
                    ))}
                  </div>
                )}
                {part.id === "hand" && (
                  <div className="segmented cols-4">
                    {gloveOptions.map((option) => (
                      <button key={option.id} className={equipment.gloves === option.id ? "active" : ""} onClick={() => chooseGloves(option.id)} aria-pressed={equipment.gloves === option.id}>{option.label}</button>
                    ))}
                  </div>
                )}
                {part.id === "body" && (
                  <div className="segmented cols-3">
                    {bodysuitOptions.map((option) => (
                      <button key={option.id} className={equipment.bodysuit === option.id ? "active" : ""} onClick={() => chooseBodysuit(option.id)} aria-pressed={equipment.bodysuit === option.id}>{option.label}</button>
                    ))}
                  </div>
                )}
                {part.flags.length > 0 && (
                  <div className="chip-grid">
                    {part.flags.map((key) => {
                      const flag = equipmentFlagOptions.find((option) => option.key === key)!;
                      return (
                        <button
                          key={key}
                          className={equipment[key] ? "equip-chip active" : "equip-chip"}
                          onClick={() => toggleEquipmentFlag(key)}
                          aria-pressed={equipment[key]}
                          title={equipment[key] ? (flag.onNote ?? `${flag.label}を表示中`) : `${flag.label}は非表示`}
                        >
                          <span className={`chip-icon ${flag.iconClass ?? "glyph-icon"}`} aria-hidden="true">{flag.icon}</span>
                          {flag.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="setting-group depth-group">
            <label>奥行き表現 <strong>アイソメ合成用</strong></label>
            <div className="option-stack">
              <button className={groundShadow ? "option-toggle active" : "option-toggle"} onClick={() => setGroundShadow((current) => !current)} aria-pressed={groundShadow}>
                <span className="option-icon shadow-icon" aria-hidden="true" />
                <span><strong>接地影</strong><small>{groundShadow ? "表示中" : "非表示"}</small></span>
                <i>{groundShadow ? "ON" : "OFF"}</i>
              </button>
              <button className={floorGrid ? "option-toggle active" : "option-toggle"} onClick={() => setFloorGrid((current) => !current)} aria-pressed={floorGrid}>
                <span className="option-icon grid-icon" aria-hidden="true" />
                <span><strong>床グリッド</strong><small>{floorGrid ? "表示中（アイソメ風）" : "非表示"}</small></span>
                <i>{floorGrid ? "ON" : "OFF"}</i>
              </button>
              <button
                className={showTable && sceneHasTable(scene) ? "option-toggle active" : "option-toggle"}
                onClick={() => setShowTable((current) => !current)}
                aria-pressed={showTable}
                disabled={!sceneHasTable(scene)}
              >
                <span className="option-icon table-icon" aria-hidden="true" />
                <span><strong>作業台</strong><small>{sceneHasTable(scene) ? (showTable ? "表示中" : "非表示") : "このプリセットにはありません"}</small></span>
                <i>{showTable && sceneHasTable(scene) ? "ON" : "OFF"}</i>
              </button>
            </div>
            <a className="template-link" href="/work-template-iso.svg" download>ワーク用アイソメテンプレSVGをダウンロード</a>
          </div>

          <div className="setting-group item-group">
            <label>手に持つアイテム <strong>左右別々</strong></label>
            <div className="segmented hand-select">
              <button className={activeHand === "left" ? "active" : ""} onClick={() => setActiveHand("left")}>左手</button>
              <button className={activeHand === "right" ? "active" : ""} onClick={() => setActiveHand("right")}>右手</button>
            </div>
            <div className="item-grid">
              {itemOptions.map((item) => (
                <button key={item.id} className={activeItem.type === item.id ? "item-button active" : "item-button"} onClick={() => chooseItem(item.id)} title={item.label}>
                  <span aria-hidden="true">{item.short}</span>{item.label}
                </button>
              ))}
            </div>
            {activeItem.type !== "none" && (
              <div className="item-adjust">
                <label htmlFor="item-rotation">角度 <strong>{activeItem.rotation}°</strong></label>
                <input id="item-rotation" type="range" min="-180" max="180" step="5" value={activeItem.rotation} onChange={(event) => updateActiveItem({ rotation: Number(event.target.value) })} />
                <label htmlFor="item-scale">大きさ <strong>{Math.round(activeItem.scale * 100)}%</strong></label>
                <input id="item-scale" type="range" min="0.6" max="1.8" step="0.1" value={activeItem.scale} onChange={(event) => updateActiveItem({ scale: Number(event.target.value) })} />
              </div>
            )}
          </div>

          {markSection}

          <div className="setting-group compact-style-group">
            <label>配色モード <strong>原則2色</strong></label>
            <div className="segmented">
              <button className={figureStyle.colorMode === "two-tone" ? "active" : ""} onClick={() => setFigureStyle((current) => ({ ...current, colorMode: "two-tone" }))}>2色</button>
              <button className={figureStyle.colorMode === "mono" ? "active" : ""} onClick={() => setFigureStyle((current) => ({ ...current, colorMode: "mono" }))}>単色</button>
            </div>
            <label>主色</label>
            <div className="color-row">
              {["#111111", "#263238", "#334155", "#0f172a"].map((color) => (
                <button key={color} aria-label={`色 ${color}`} className={figureStyle.color === color ? "swatch active" : "swatch"} style={{ background: color }} onClick={() => setFigureStyle((current) => ({ ...current, color }))} />
              ))}
              <input type="color" value={figureStyle.color} onChange={(event) => setFigureStyle((current) => ({ ...current, color: event.target.value }))} aria-label="任意の色を選択" />
            </div>
            {figureStyle.colorMode === "two-tone" && (
              <>
                <label>補助色</label>
                <div className="color-row">
                  {["#7b8480", "#64748b", "#8b6f47", "#477b72"].map((color) => (
                    <button key={color} aria-label={`補助色 ${color}`} className={figureStyle.secondaryColor === color ? "swatch active" : "swatch"} style={{ background: color }} onClick={() => setFigureStyle((current) => ({ ...current, secondaryColor: color }))} />
                  ))}
                  <input type="color" value={figureStyle.secondaryColor} onChange={(event) => setFigureStyle((current) => ({ ...current, secondaryColor: event.target.value }))} aria-label="任意の補助色を選択" />
                </div>
              </>
            )}
            <label htmlFor="stroke">手足の太さ <strong>{figureStyle.strokeWidth}px</strong></label>
            <input id="stroke" type="range" min="10" max="34" value={figureStyle.strokeWidth} onChange={(event) => setFigureStyle((current) => ({ ...current, strokeWidth: Number(event.target.value) }))} />
            <label htmlFor="head">頭の大きさ <strong>{figureStyle.headRadius}px</strong></label>
            <input id="head" type="range" min="20" max="40" value={figureStyle.headRadius} onChange={(event) => setFigureStyle((current) => ({ ...current, headRadius: Number(event.target.value) }))} />
            <label>背景</label>
            <div className="segmented">
              <button className={figureStyle.background === "transparent" ? "active" : ""} onClick={() => setFigureStyle((current) => ({ ...current, background: "transparent" }))}>透明</button>
              <button className={figureStyle.background === "white" ? "active" : ""} onClick={() => setFigureStyle((current) => ({ ...current, background: "white" }))}>白</button>
            </div>
            <label>書き出し範囲 <strong>ワーク自作時は人物のみ</strong></label>
            <div className="segmented">
              <button className={exportScope === "full" ? "active" : ""} onClick={() => setExportScope("full")}>全体</button>
              <button className={exportScope === "figure" ? "active" : ""} onClick={() => setExportScope("figure")}>人物のみ</button>
            </div>
          </div>
          </>
          )}

          <div className="selected-joint">
            <p>選択中の関節</p>
            <strong>{selectedJoint ? jointLabels[selectedJoint] : "未選択"}</strong>
            <span>{selectedJoint ? `X ${Math.round(pose[selectedJoint].x)} / Y ${Math.round(pose[selectedJoint].y)}` : "キャンバス上の丸を選択"}</span>
            <button
              className={injuryJoint ? "injury-button active" : "injury-button"}
              onClick={toggleInjuryMark}
              disabled={!selectedJoint}
              aria-pressed={Boolean(injuryJoint)}
            >
              {injuryJoint === selectedJoint && selectedJoint
                ? "受傷部位マークを外す"
                : injuryJoint
                  ? `受傷部位マークをここへ移す（現在：${jointLabels[injuryJoint]}）`
                  : "受傷部位マークを付ける"}
            </button>
            <small className="injury-note">労災報告書で「どこを負傷したか」を示すときに使います。</small>
          </div>
          <div className="privacy-note">
            <span aria-hidden="true">✓</span>
            <p><strong>データは端末内だけ</strong>姿勢・装備・道具をサーバーへ送信しません。</p>
          </div>
        </aside>
      </section>

      {photoOpen && <PhotoImport onApply={applyDetectedFigure} onClose={() => setPhotoOpen(false)} />}

      <footer>
        <p><Link href="/about">About・商用利用について</Link>　<a href="mailto:nandemokarute.ch@gmail.com">機能要望</a></p>
        <p>© 2026 ZEALBOOTCAMP. All rights reserved.</p>
      </footer>
    </main>
  );
}
