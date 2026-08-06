"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clonePose,
  jointLabels,
  posePresets,
  type JointName,
  type Point,
  type Pose,
  type PoseView,
} from "./pose-data";

const jointNames = Object.keys(jointLabels) as JointName[];
const categories = ["すべて", "基本", "移動", "作業", "注意・合図", "横向き"] as const;

type FigureStyle = {
  color: string;
  strokeWidth: number;
  headRadius: number;
  background: "transparent" | "white";
};

type Equipment = {
  helmet: boolean;
  harness: boolean;
};

type ItemType = "none" | "wrench" | "screwdriver" | "hammer" | "drill" | "sprayer" | "hose";
type Hand = "left" | "right";
type HeldItem = { type: ItemType; rotation: number; scale: number };
type HeldItems = Record<Hand, HeldItem>;

const itemOptions: { id: ItemType; label: string; short: string }[] = [
  { id: "none", label: "なし", short: "－" },
  { id: "wrench", label: "スパナ", short: "🔧" },
  { id: "screwdriver", label: "ドライバー", short: "⊣" },
  { id: "hammer", label: "ハンマー", short: "Ｔ" },
  { id: "drill", label: "電動ドリル", short: "▰" },
  { id: "sprayer", label: "スプレー", short: "⌁" },
  { id: "hose", label: "散水ノズル", short: "≋" },
];

const initialStyle: FigureStyle = {
  color: "#111111",
  strokeWidth: 20,
  headRadius: 28,
  background: "transparent",
};

const emptyItems: HeldItems = {
  left: { type: "none", rotation: -10, scale: 1 },
  right: { type: "none", rotation: 10, scale: 1 },
};

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function ItemShape({ type }: { type: ItemType }) {
  if (type === "wrench") {
    return (
      <g>
        <path d="M -3 7 L 25 -21" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
        <path d="M 18 -27 L 29 -35 L 35 -25 L 29 -20 Z" fill="currentColor" />
        <circle cx="-6" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="5" />
      </g>
    );
  }
  if (type === "screwdriver") {
    return (
      <g>
        <path d="M 0 5 L 33 -28" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <path d="M 31 -31 L 39 -39" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
        <rect x="-12" y="-1" width="23" height="14" rx="7" transform="rotate(-45)" fill="#f05a28" stroke="currentColor" strokeWidth="3" />
      </g>
    );
  }
  if (type === "hammer") {
    return (
      <g>
        <path d="M -2 7 L 25 -24" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
        <path d="M 15 -34 L 37 -16" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
      </g>
    );
  }
  if (type === "drill") {
    return (
      <g>
        <path d="M -5 -12 H 23 Q 33 -12 33 -2 V 9 H 3 Q -5 9 -5 1 Z" fill="currentColor" />
        <path d="M 6 7 L 17 7 L 12 29 L 1 29 Z" fill="currentColor" />
        <path d="M 33 -3 H 47" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      </g>
    );
  }
  if (type === "sprayer") {
    return (
      <g>
        <path d="M -7 3 Q -7 -5 1 -5 H 18 L 22 26 Q 23 34 14 34 H -2 Q -10 34 -9 26 Z" fill="#5aa9e6" stroke="currentColor" strokeWidth="4" />
        <path d="M 0 -6 V -15 H 27 L 34 -10 L 22 -5" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
        <circle cx="43" cy="-12" r="2.8" fill="#3699dd" />
        <circle cx="50" cy="-18" r="2.3" fill="#3699dd" />
        <circle cx="52" cy="-8" r="2.5" fill="#3699dd" />
      </g>
    );
  }
  if (type === "hose") {
    return (
      <g>
        <path d="M -8 12 Q 4 0 13 -11" fill="none" stroke="#2486c5" strokeWidth="10" strokeLinecap="round" />
        <path d="M 10 -15 L 29 -31" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
        <path d="M 31 -34 L 39 -40" stroke="#2486c5" strokeWidth="6" strokeLinecap="round" />
        <path d="M 44 -43 L 60 -50 M 47 -37 L 65 -39 M 44 -31 L 60 -26" stroke="#5ab9ee" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  return null;
}

function HeldItemLayer({ pose, items }: { pose: Pose; items: HeldItems }) {
  return (
    <>
      {(["left", "right"] as Hand[]).map((hand) => {
        const item = items[hand];
        if (item.type === "none") return null;
        const wrist = hand === "left" ? pose.wristL : pose.wristR;
        return (
          <g
            key={hand}
            color="#26352d"
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
        <g className="equipment-layer" fill="none" stroke="#f05a28" strokeWidth={Math.max(5, style.strokeWidth * 0.3)} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M ${pose.shoulderL.x} ${pose.shoulderL.y + 5} L ${hipMid.x + 11} ${hipMid.y - 4} L ${pose.shoulderR.x} ${pose.shoulderR.y + 5}`} />
          <path d={`M ${pose.shoulderR.x} ${pose.shoulderR.y + 5} L ${hipMid.x - 11} ${hipMid.y - 4} L ${pose.shoulderL.x} ${pose.shoulderL.y + 5}`} />
          <path d={`M ${pose.hipL.x - 3} ${pose.hipL.y - 8} L ${pose.hipR.x + 3} ${pose.hipR.y - 8}`} />
          <path d={`M ${pose.hipL.x} ${pose.hipL.y - 4} Q ${pose.hipL.x - 13} ${pose.hipL.y + 24} ${pose.hipL.x + 3} ${pose.hipL.y + 36}`} />
          <path d={`M ${pose.hipR.x} ${pose.hipR.y - 4} Q ${pose.hipR.x + 13} ${pose.hipR.y + 24} ${pose.hipR.x - 3} ${pose.hipR.y + 36}`} />
          <circle cx={shoulderMid.x} cy={(shoulderMid.y + hipMid.y) / 2} r="5" fill="#f05a28" />
        </g>
      )}
      {equipment.helmet && (
        <g className="equipment-layer" stroke="#26352d" strokeWidth="4" strokeLinejoin="round">
          <path
            d={`M ${head.x - style.headRadius - 4} ${head.y - 4} Q ${head.x - style.headRadius + 2} ${head.y - style.headRadius - 27} ${head.x} ${head.y - style.headRadius - 29} Q ${head.x + style.headRadius - 1} ${head.y - style.headRadius - 24} ${head.x + style.headRadius + 4} ${head.y - 2} Z`}
            fill="#f6c945"
          />
          <path d={`M ${head.x - style.headRadius - 11} ${head.y - 2} H ${head.x + style.headRadius + 13}`} strokeLinecap="round" />
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
  editable = false,
  selected,
  onJointPointerDown,
}: {
  pose: Pose;
  style: FigureStyle;
  view?: PoseView;
  equipment?: Equipment;
  items?: HeldItems;
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

  return (
    <>
      <path opacity={rearOpacity} d={`M ${pose.shoulderL.x} ${pose.shoulderL.y} L ${pose.elbowL.x} ${pose.elbowL.y} L ${pose.wristL.x} ${pose.wristL.y}`} {...limbProps} />
      <path opacity={rearOpacity} d={`M ${pose.hipL.x} ${pose.hipL.y} L ${pose.kneeL.x} ${pose.kneeL.y} L ${pose.ankleL.x} ${pose.ankleL.y}`} {...limbProps} />
      <path d={`M ${pose.shoulderR.x} ${pose.shoulderR.y} L ${pose.elbowR.x} ${pose.elbowR.y} L ${pose.wristR.x} ${pose.wristR.y}`} {...limbProps} />
      <path d={`M ${pose.hipR.x} ${pose.hipR.y} L ${pose.kneeR.x} ${pose.kneeR.y} L ${pose.ankleR.x} ${pose.ankleR.y}`} {...limbProps} />
      <path
        d={`M ${pose.shoulderL.x} ${pose.shoulderL.y} Q ${shoulderMid.x} ${shoulderMid.y - 5} ${pose.shoulderR.x} ${pose.shoulderR.y} L ${pose.hipR.x} ${pose.hipR.y} Q ${hipMid.x} ${hipMid.y + 4} ${pose.hipL.x} ${pose.hipL.y} Z`}
        fill={style.color}
        stroke={style.color}
        strokeLinejoin="round"
      />
      <path d={`M ${pose.neck.x} ${pose.neck.y} L ${shoulderMid.x} ${shoulderMid.y + 3}`} {...limbProps} />
      <circle cx={pose.wristL.x} cy={pose.wristL.y} r={style.strokeWidth * 0.58} fill={style.color} opacity={rearOpacity} />
      <circle cx={pose.wristR.x} cy={pose.wristR.y} r={style.strokeWidth * 0.58} fill={style.color} />
      <circle cx={pose.head.x} cy={pose.head.y} r={style.headRadius} fill={style.color} />
      <EquipmentLayer pose={pose} style={style} equipment={equipment} />
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
    </>
  );
}

function serializeSvg(source: SVGSVGElement, background: FigureStyle["background"]) {
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
  if (background === "white") {
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
  const [equipment, setEquipment] = useState<Equipment>({ helmet: false, harness: false });
  const [items, setItems] = useState<HeldItems>(emptyItems);
  const [activeHand, setActiveHand] = useState<Hand>("right");
  const [category, setCategory] = useState<(typeof categories)[number]>("すべて");
  const [selectedJoint, setSelectedJoint] = useState<JointName | null>(null);
  const [history, setHistory] = useState<Pose[]>([]);
  const [future, setFuture] = useState<Pose[]>([]);
  const [notice, setNotice] = useState("関節の丸をドラッグして姿勢を調整");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<{ joint: JointName; before: Pose } | null>(null);

  const visiblePresets = useMemo(
    () => posePresets.filter((preset) => category === "すべて" || preset.category === category),
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

  const getSvg = () => svgRef.current ? serializeSvg(svgRef.current, figureStyle.background) : null;

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
                  <Figure pose={preset.pose} view={preset.view} style={{ ...initialStyle, strokeWidth: 25, headRadius: 30 }} />
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
              <Figure pose={pose} view={view} style={figureStyle} equipment={equipment} items={items} editable selected={selectedJoint} onJointPointerDown={onJointPointerDown} />
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
            <label>人物の色</label>
            <div className="color-row">
              {["#111111", "#005EB8", "#F05A28", "#138A5B"].map((color) => (
                <button key={color} aria-label={`色 ${color}`} className={figureStyle.color === color ? "swatch active" : "swatch"} style={{ background: color }} onClick={() => setFigureStyle((current) => ({ ...current, color }))} />
              ))}
              <input type="color" value={figureStyle.color} onChange={(event) => setFigureStyle((current) => ({ ...current, color: event.target.value }))} aria-label="任意の色を選択" />
            </div>
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
        <p>作業マニュアル・安全資料・手順書向けの人物素材</p>
        <p>正面 / 横向き・安全装備・工具・散水器具に対応</p>
      </footer>
    </main>
  );
}
