"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clonePose,
  jointLabels,
  posePresets,
  type JointName,
  type ItemType,
  type Point,
  type Pose,
  type PresetDefaults,
  type PoseView,
  type SceneType,
} from "./pose-data";

const jointNames = Object.keys(jointLabels) as JointName[];
const categories = ["すべて", "基本", "移動", "作業", "注意・合図", "横向き"] as const;

type FigureStyle = {
  color: string;
  secondaryColor: string;
  colorMode: "two-tone" | "mono";
  strokeWidth: number;
  headRadius: number;
  background: "transparent" | "white";
};

type Equipment = {
  helmet: boolean;
  harness: boolean;
};

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

const emptyItems: HeldItems = {
  left: { type: "none", rotation: -10, scale: 1 },
  right: { type: "none", rotation: 10, scale: 1 },
};

function defaultsToEquipment(defaults: PresetDefaults): Equipment {
  return { helmet: Boolean(defaults.helmet), harness: Boolean(defaults.harness) };
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

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
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
    <g className="scene-layer" transform={`translate(${head.x + 9} ${head.y - 1}) rotate(8)`}>
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

function EquipmentLayer({ pose, style, equipment }: { pose: Pose; style: FigureStyle; equipment: Equipment }) {
  const shoulderMid = midpoint(pose.shoulderL, pose.shoulderR);
  const hipMid = midpoint(pose.hipL, pose.hipR);
  const head = pose.head;
  return (
    <>
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
      {equipment.helmet && (
        <g className="equipment-layer helmet-layer" stroke="var(--primary-color)" strokeWidth="4" strokeLinejoin="round">
          <path
            d={`M ${head.x - style.headRadius - 3} ${head.y - 8} Q ${head.x - style.headRadius + 1} ${head.y - style.headRadius - 23} ${head.x} ${head.y - style.headRadius - 25} Q ${head.x + style.headRadius - 2} ${head.y - style.headRadius - 21} ${head.x + style.headRadius + 3} ${head.y - 8} Z`}
            fill="var(--primary-color)"
          />
          <rect x={head.x - style.headRadius - 12} y={head.y - 10} width={style.headRadius * 2 + 27} height="9" rx="4.5" fill="var(--primary-color)" stroke="none" />
          <path d={`M ${head.x - 2} ${head.y - style.headRadius - 24} V ${head.y - style.headRadius - 10}`} fill="none" stroke="white" strokeWidth="3" opacity=".75" />
          <path d={`M ${head.x - style.headRadius + 3} ${head.y - 10} Q ${head.x} ${head.y - 16} ${head.x + style.headRadius - 3} ${head.y - 10}`} fill="none" stroke="white" strokeWidth="3" opacity=".72" />
        </g>
      )}
    </>
  );
}

function Figure({
  pose,
  style,
  view = "front",
  equipment = { helmet: false, harness: false },
  items = emptyItems,
  scene = "none",
  showTable = true,
  editable = false,
  selected,
  onJointPointerDown,
}: {
  pose: Pose;
  style: FigureStyle;
  view?: PoseView;
  equipment?: Equipment;
  items?: HeldItems;
  scene?: SceneType;
  showTable?: boolean;
  editable?: boolean;
  selected?: JointName | null;
  onJointPointerDown?: (joint: JointName, event: ReactPointerEvent<SVGCircleElement>) => void;
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
      <SceneLayer scene={scene} pose={pose} items={items} showTable={showTable} />
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
      <EquipmentLayer pose={pose} style={style} equipment={equipment} />
      <SceneSafetyOverlay scene={scene} pose={pose} />
      <HeldItemLayer pose={pose} items={items} />

      {editable && jointNames.map((joint) => (
        <circle
          key={joint}
          cx={pose[joint].x}
          cy={pose[joint].y}
          r={selected === joint ? 10 : 8}
          className={`joint-handle editor-only ${selected === joint ? "is-selected" : ""}`}
          onPointerDown={(event) => onJointPointerDown?.(joint, event)}
          role="button"
          aria-label={`${jointLabels[joint]}を移動`}
        />
      ))}
    </g>
  );
}

function serializeSvg(source: SVGSVGElement, style: FigureStyle) {
  const root = source.cloneNode(true) as SVGSVGElement;
  root.querySelectorAll(".editor-only").forEach((node) => node.remove());
  root.classList.remove("editor-canvas");
  root.removeAttribute("style");
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  root.setAttribute("viewBox", "0 0 400 440");
  root.setAttribute("width", "400");
  root.setAttribute("height", "440");
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", "編集したピクトグラム");
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
  const [activeHand, setActiveHand] = useState<Hand>("right");
  const [category, setCategory] = useState<(typeof categories)[number]>("すべて");
  const [selectedJoint, setSelectedJoint] = useState<JointName | null>(null);
  const [history, setHistory] = useState<Pose[]>([]);
  const [future, setFuture] = useState<Pose[]>([]);
  const [notice, setNotice] = useState("関節の丸をドラッグして姿勢を調整");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<{ joint: JointName; before: Pose } | null>(null);

  const visiblePresets = useMemo(
    () => posePresets.filter((preset) => {
      if (category === "すべて") return true;
      if (category === "横向き") return preset.view === "side";
      return preset.category === category;
    }),
    [category],
  );

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
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = { joint, before: clonePose(pose) };
    setSelectedJoint(joint);
    setNotice(`${jointLabels[joint]}を調整中`);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const point = clientToSvg(event.clientX, event.clientY);
    if (!point) return;
    setPose((current) => ({ ...current, [dragging.current!.joint]: point }));
  };

  const finishDrag = () => {
    const finished = dragging.current;
    if (!finished) return;
    dragging.current = null;
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

  const reset = () => loadPreset(presetId);

  const getSvg = () => svgRef.current ? serializeSvg(svgRef.current, figureStyle) : null;

  const downloadSvg = () => {
    const svg = getSvg();
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `pictogram-${presetId}.svg`);
    setNotice("保護具・道具を含むSVGをダウンロードしました");
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
      canvas.toBlob((blob) => blob && downloadBlob(blob, `pictogram-${presetId}.png`), "image/png");
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><i /></div>
          <div><p className="eyebrow">MANUAL FIGURE STUDIO</p><h1>ピクトポーズ</h1></div>
        </div>
        <p className="header-copy">姿勢・保護具・道具を組み合わせ、作業マニュアル用の人物図を保存。</p>
        <div className="export-actions">
          <Link className="button secondary nav-link" href="/about">About</Link>
          <button className="button secondary" onClick={downloadPng}>PNG保存</button>
          <button className="button primary" onClick={downloadSvg}>SVGを保存</button>
        </div>
      </header>

      <section className="workspace" aria-label="ピクトグラム編集画面">
        <aside className="preset-panel panel">
          <div className="panel-heading">
            <div><span className="step">01</span><h2>姿勢を選ぶ</h2></div>
            <span className="count">{posePresets.length} POSES</span>
          </div>
          <div className="category-tabs" aria-label="姿勢カテゴリ">
            {categories.map((item) => (
              <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
          <div className="preset-grid">
            {visiblePresets.map((preset) => (
              <button key={preset.id} className={`preset-card ${presetId === preset.id ? "active" : ""}`} onClick={() => loadPreset(preset.id)} aria-pressed={presetId === preset.id}>
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
              </button>
            ))}
          </div>
        </aside>

        <section className="editor-panel panel">
          <div className="panel-heading editor-heading">
            <div><span className="step">02</span><h2>ドラッグで調整</h2></div>
            <div className="history-actions">
              <button onClick={undo} disabled={!history.length} aria-label="元に戻す">↶</button>
              <button onClick={redo} disabled={!future.length} aria-label="やり直す">↷</button>
              <button onClick={mirror}>左右反転</button>
              <button onClick={reset}>姿勢リセット</button>
            </div>
          </div>
          <div className={`canvas-wrap ${figureStyle.background === "white" ? "white" : "transparent"}`}>
            <span className="view-badge">{view === "side" ? "SIDE / 横向き" : "FRONT / 正面"}</span>
            <svg ref={svgRef} className="editor-canvas" viewBox="0 0 400 440" onPointerMove={onPointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} aria-label="関節をドラッグして編集するピクトグラム">
              <Figure pose={pose} view={view} style={figureStyle} equipment={equipment} items={items} scene={scene} showTable={showTable} editable selected={selectedJoint} onJointPointerDown={onJointPointerDown} />
            </svg>
            <div className="canvas-status" role="status"><span className="status-dot" />{notice}</div>
          </div>
          <div className="shortcut-note"><kbd>↑ ↓ ← →</kbd> 1px移動　<kbd>Shift</kbd> + 矢印 10px移動　<kbd>Ctrl Z</kbd> 戻す</div>
        </section>

        <aside className="settings-panel panel">
          <div className="panel-heading"><div><span className="step">03</span><h2>装備と見た目</h2></div></div>
          <div className="setting-group equipment-group">
            <label>安全装備 <strong>個別にON / OFF</strong></label>
            <div className="option-stack">
              <button className={equipment.helmet ? "option-toggle active" : "option-toggle"} onClick={() => setEquipment((current) => ({ ...current, helmet: !current.helmet }))} aria-pressed={equipment.helmet}>
                <span className="option-icon helmet-icon" aria-hidden="true" />
                <span><strong>ヘルメット</strong><small>{equipment.helmet ? "表示中" : "非表示"}</small></span>
                <i>{equipment.helmet ? "ON" : "OFF"}</i>
              </button>
              <button className={equipment.harness ? "option-toggle active" : "option-toggle"} onClick={() => setEquipment((current) => ({ ...current, harness: !current.harness }))} aria-pressed={equipment.harness}>
                <span className="option-icon harness-icon" aria-hidden="true">Y</span>
                <span><strong>墜落制止用器具</strong><small>{equipment.harness ? "表示中" : "非表示"}</small></span>
                <i>{equipment.harness ? "ON" : "OFF"}</i>
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
          </div>

          <div className="selected-joint">
            <p>選択中の関節</p>
            <strong>{selectedJoint ? jointLabels[selectedJoint] : "未選択"}</strong>
            <span>{selectedJoint ? `X ${Math.round(pose[selectedJoint].x)} / Y ${Math.round(pose[selectedJoint].y)}` : "キャンバス上の丸を選択"}</span>
          </div>
          <div className="privacy-note">
            <span aria-hidden="true">✓</span>
            <p><strong>データは端末内だけ</strong>姿勢・装備・道具をサーバーへ送信しません。</p>
          </div>
        </aside>
      </section>

      <footer>
        <p><Link href="/about">About・商用利用について</Link>　<a href="mailto:nandemokarute.ch@gmail.com">機能要望</a></p>
        <p>© 2026 ZEALBOOTCAMP. All rights reserved.</p>
      </footer>
    </main>
  );
}
