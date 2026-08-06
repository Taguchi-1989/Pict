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
} from "./pose-data";

const SVG_NS = "http://www.w3.org/2000/svg";
const jointNames = Object.keys(jointLabels) as JointName[];
const categories = ["すべて", "基本", "移動", "作業", "注意・合図"] as const;

type FigureStyle = {
  color: string;
  strokeWidth: number;
  headRadius: number;
  background: "transparent" | "white";
};

const initialStyle: FigureStyle = {
  color: "#111111",
  strokeWidth: 20,
  headRadius: 28,
  background: "transparent",
};

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function Figure({
  pose,
  style,
  editable = false,
  selected,
  onJointPointerDown,
}: {
  pose: Pose;
  style: FigureStyle;
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

  return (
    <>
      <path d={`M ${pose.shoulderL.x} ${pose.shoulderL.y} L ${pose.elbowL.x} ${pose.elbowL.y} L ${pose.wristL.x} ${pose.wristL.y}`} {...limbProps} />
      <path d={`M ${pose.shoulderR.x} ${pose.shoulderR.y} L ${pose.elbowR.x} ${pose.elbowR.y} L ${pose.wristR.x} ${pose.wristR.y}`} {...limbProps} />
      <path d={`M ${pose.hipL.x} ${pose.hipL.y} L ${pose.kneeL.x} ${pose.kneeL.y} L ${pose.ankleL.x} ${pose.ankleL.y}`} {...limbProps} />
      <path d={`M ${pose.hipR.x} ${pose.hipR.y} L ${pose.kneeR.x} ${pose.kneeR.y} L ${pose.ankleR.x} ${pose.ankleR.y}`} {...limbProps} />
      <path
        d={`M ${pose.shoulderL.x} ${pose.shoulderL.y} Q ${shoulderMid.x} ${shoulderMid.y - 5} ${pose.shoulderR.x} ${pose.shoulderR.y} L ${pose.hipR.x} ${pose.hipR.y} Q ${hipMid.x} ${hipMid.y + 4} ${pose.hipL.x} ${pose.hipL.y} Z`}
        fill={style.color}
        stroke={style.color}
        strokeLinejoin="round"
      />
      <path d={`M ${pose.neck.x} ${pose.neck.y} L ${shoulderMid.x} ${shoulderMid.y + 3}`} {...limbProps} />
      <circle cx={pose.wristL.x} cy={pose.wristL.y} r={style.strokeWidth * 0.58} fill={style.color} />
      <circle cx={pose.wristR.x} cy={pose.wristR.y} r={style.strokeWidth * 0.58} fill={style.color} />
      <circle cx={pose.head.x} cy={pose.head.y} r={style.headRadius} fill={style.color} />

      {editable && jointNames.map((joint) => (
        <circle
          key={joint}
          cx={pose[joint].x}
          cy={pose[joint].y}
          r={selected === joint ? 10 : 8}
          className={`joint-handle ${selected === joint ? "is-selected" : ""}`}
          onPointerDown={(event) => onJointPointerDown?.(joint, event)}
          role="button"
          aria-label={`${jointLabels[joint]}を移動`}
        />
      ))}
    </>
  );
}

function serializeSvg(pose: Pose, style: FigureStyle) {
  const root = document.createElementNS(SVG_NS, "svg");
  root.setAttribute("xmlns", SVG_NS);
  root.setAttribute("viewBox", "0 0 400 440");
  root.setAttribute("width", "400");
  root.setAttribute("height", "440");
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", "編集したピクトグラム");
  if (style.background === "white") {
    const background = document.createElementNS(SVG_NS, "rect");
    background.setAttribute("width", "400");
    background.setAttribute("height", "440");
    background.setAttribute("fill", "white");
    root.appendChild(background);
  }

  const shoulderMid = midpoint(pose.shoulderL, pose.shoulderR);
  const hipMid = midpoint(pose.hipL, pose.hipR);
  const addPath = (d: string, filled = false) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    if (filled) {
      path.setAttribute("fill", style.color);
      path.setAttribute("stroke", style.color);
      path.setAttribute("stroke-linejoin", "round");
    } else {
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", style.color);
      path.setAttribute("stroke-width", String(style.strokeWidth));
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
    }
    root.appendChild(path);
  };

  addPath(`M ${pose.shoulderL.x} ${pose.shoulderL.y} L ${pose.elbowL.x} ${pose.elbowL.y} L ${pose.wristL.x} ${pose.wristL.y}`);
  addPath(`M ${pose.shoulderR.x} ${pose.shoulderR.y} L ${pose.elbowR.x} ${pose.elbowR.y} L ${pose.wristR.x} ${pose.wristR.y}`);
  addPath(`M ${pose.hipL.x} ${pose.hipL.y} L ${pose.kneeL.x} ${pose.kneeL.y} L ${pose.ankleL.x} ${pose.ankleL.y}`);
  addPath(`M ${pose.hipR.x} ${pose.hipR.y} L ${pose.kneeR.x} ${pose.kneeR.y} L ${pose.ankleR.x} ${pose.ankleR.y}`);
  addPath(`M ${pose.shoulderL.x} ${pose.shoulderL.y} Q ${shoulderMid.x} ${shoulderMid.y - 5} ${pose.shoulderR.x} ${pose.shoulderR.y} L ${pose.hipR.x} ${pose.hipR.y} Q ${hipMid.x} ${hipMid.y + 4} ${pose.hipL.x} ${pose.hipL.y} Z`, true);
  addPath(`M ${pose.neck.x} ${pose.neck.y} L ${shoulderMid.x} ${shoulderMid.y + 3}`);
  [pose.wristL, pose.wristR].forEach((wrist) => {
    const hand = document.createElementNS(SVG_NS, "circle");
    hand.setAttribute("cx", String(wrist.x));
    hand.setAttribute("cy", String(wrist.y));
    hand.setAttribute("r", String(style.strokeWidth * 0.58));
    hand.setAttribute("fill", style.color);
    root.appendChild(hand);
  });
  const head = document.createElementNS(SVG_NS, "circle");
  head.setAttribute("cx", String(pose.head.x));
  head.setAttribute("cy", String(pose.head.y));
  head.setAttribute("r", String(style.headRadius));
  head.setAttribute("fill", style.color);
  root.appendChild(head);
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
  const [figureStyle, setFigureStyle] = useState(initialStyle);
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
    setHistory((items) => [...items.slice(-29), clonePose(pose)]);
    setFuture([]);
    setPresetId(id);
    setPose(clonePose(preset.pose));
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
    const joint = dragging.current.joint;
    setPose((current) => ({ ...current, [joint]: point }));
  };

  const finishDrag = () => {
    const finished = dragging.current;
    if (!finished) return;
    dragging.current = null;
    setHistory((items) => [...items.slice(-29), finished.before]);
    setFuture([]);
    setNotice(`${jointLabels[finished.joint]}を移動しました`);
  };

  const undo = useCallback(() => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((items) => items.slice(0, -1));
    setFuture((items) => [clonePose(pose), ...items].slice(0, 30));
    setPose(clonePose(previous));
    setNotice("1つ前に戻しました");
  }, [history, pose]);

  const redo = useCallback(() => {
    const next = future[0];
    if (!next) return;
    setFuture((items) => items.slice(1));
    setHistory((items) => [...items, clonePose(pose)].slice(-30));
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
    setHistory((items) => [...items.slice(-29), clonePose(pose)]);
    setFuture([]);
    setPose(next);
    setNotice("左右を反転しました");
  };

  const reset = () => loadPreset(presetId);

  const downloadSvg = () => {
    const svg = serializeSvg(pose, figureStyle);
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `pictogram-${presetId}.svg`);
    setNotice("SVGをダウンロードしました");
  };

  const downloadPng = () => {
    const svg = serializeSvg(pose, figureStyle);
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
      setNotice("高解像度PNGをダウンロードしました");
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
      setHistory((items) => [...items.slice(-29), clonePose(pose)]);
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><i /></div>
          <div>
            <p className="eyebrow">MANUAL FIGURE STUDIO</p>
            <h1>ピクトポーズ</h1>
          </div>
        </div>
        <p className="header-copy">作業マニュアルの人物図を、選んで・動かして・そのまま保存。</p>
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
              <button
                key={preset.id}
                className={`preset-card ${presetId === preset.id ? "active" : ""}`}
                onClick={() => loadPreset(preset.id)}
                aria-pressed={presetId === preset.id}
              >
                <svg viewBox="0 0 400 440" aria-hidden="true">
                  <Figure pose={preset.pose} style={{ ...initialStyle, strokeWidth: 25, headRadius: 30 }} />
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
              <button onClick={reset}>リセット</button>
            </div>
          </div>
          <div className={`canvas-wrap ${figureStyle.background === "white" ? "white" : "transparent"}`}>
            <svg
              ref={svgRef}
              className="editor-canvas"
              viewBox="0 0 400 440"
              onPointerMove={onPointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              aria-label="関節をドラッグして編集するピクトグラム"
            >
              <Figure pose={pose} style={figureStyle} editable selected={selectedJoint} onJointPointerDown={onJointPointerDown} />
            </svg>
            <div className="canvas-status" role="status"><span className="status-dot" />{notice}</div>
          </div>
          <div className="shortcut-note"><kbd>↑ ↓ ← →</kbd> 1px移動　<kbd>Shift</kbd> + 矢印 10px移動　<kbd>Ctrl Z</kbd> 戻す</div>
        </section>

        <aside className="settings-panel panel">
          <div className="panel-heading"><div><span className="step">03</span><h2>見た目を整える</h2></div></div>
          <div className="setting-group">
            <label>色</label>
            <div className="color-row">
              {["#111111", "#005EB8", "#F05A28", "#138A5B"].map((color) => (
                <button
                  key={color}
                  aria-label={`色 ${color}`}
                  className={figureStyle.color === color ? "swatch active" : "swatch"}
                  style={{ background: color }}
                  onClick={() => setFigureStyle((current) => ({ ...current, color }))}
                />
              ))}
              <input
                type="color"
                value={figureStyle.color}
                onChange={(event) => setFigureStyle((current) => ({ ...current, color: event.target.value }))}
                aria-label="任意の色を選択"
              />
            </div>
          </div>
          <div className="setting-group">
            <label htmlFor="stroke">手足の太さ <strong>{figureStyle.strokeWidth}px</strong></label>
            <input id="stroke" type="range" min="10" max="34" value={figureStyle.strokeWidth} onChange={(event) => setFigureStyle((current) => ({ ...current, strokeWidth: Number(event.target.value) }))} />
          </div>
          <div className="setting-group">
            <label htmlFor="head">頭の大きさ <strong>{figureStyle.headRadius}px</strong></label>
            <input id="head" type="range" min="20" max="40" value={figureStyle.headRadius} onChange={(event) => setFigureStyle((current) => ({ ...current, headRadius: Number(event.target.value) }))} />
          </div>
          <div className="setting-group">
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
            <p><strong>データは端末内だけ</strong>姿勢編集・書き出しで画像をサーバー送信しません。</p>
          </div>
        </aside>
      </section>

      <footer>
        <p>作業マニュアル・安全資料・手順書向けのシンプルな人物素材</p>
        <p>MVP — 道具パーツと文章からの自動生成は次フェーズ</p>
      </footer>
    </main>
  );
}
