"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { landmarksToFigure, type DetectedFigure, type Landmark } from "./photo-pose";

// プレビューに骨格を描くための、MediaPipeの点番号のつなぎ方。
const previewConnections: [number, number][] = [
  [0, 11], [0, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

const MAX_PEOPLE = 3;

type Detection = { figure: DetectedFigure; landmarks: Landmark[] };
type Status = "idle" | "loading-model" | "detecting" | "done" | "error";

// 解析器の作成には時間がかかるため、一度作ったらタブを閉じるまで使い回す。
type PoseLandmarkerInstance = { detect: (image: HTMLImageElement) => { landmarks: Landmark[][] } };
let landmarkerPromise: Promise<PoseLandmarkerInstance> | null = null;

async function getLandmarker(): Promise<PoseLandmarkerInstance> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
      const options = {
        baseOptions: { modelAssetPath: "/models/pose_landmarker_lite.task", delegate: "GPU" as const },
        runningMode: "IMAGE" as const,
        numPoses: MAX_PEOPLE,
        minPoseDetectionConfidence: 0.25,
      };
      try {
        return await PoseLandmarker.createFromOptions(fileset, options);
      } catch {
        // GPUが使えない端末ではCPUで動かす（少し遅いが結果は同じ）。
        return await PoseLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: "CPU" as const },
        });
      }
    })().catch((error) => {
      landmarkerPromise = null;
      throw error;
    });
  }
  return landmarkerPromise;
}

export default function PhotoImport({ onApply, onClose }: { onApply: (figure: DetectedFigure, index: number) => void; onClose: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [detections, setDetections] = useState<Detection[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const analyze = useCallback(async (file: File) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = URL.createObjectURL(file);
    objectUrl.current = url;
    setImageUrl(url);
    setDetections([]);
    setActiveIndex(0);
    setStatus("loading-model");
    setMessage("解析の準備をしています（初回のみ少し時間がかかります）");

    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });

      const landmarker = await getLandmarker();
      setStatus("detecting");
      setMessage("姿勢を読み取っています");

      const result = landmarker.detect(image);
      const found: Detection[] = (result.landmarks ?? [])
        .slice(0, MAX_PEOPLE)
        .map((landmarks) => ({ landmarks, figure: landmarksToFigure(landmarks, image.naturalWidth, image.naturalHeight)! }))
        .filter((detection) => detection.figure !== null)
        // 左に写っている人から順に「人物1、2…」と番号を振る。
        .sort((a, b) => a.figure.box.x - b.figure.box.x);

      setDetections(found);
      setStatus(found.length ? "done" : "error");
      setMessage(found.length
        ? `${found.length}人の姿勢を読み取りました。取り込む人物を選んでください。`
        : "人物を検出できませんでした。全身が写っている写真だと成功しやすくなります。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error && error.message.includes("fetch")
        ? "解析用データを読み込めませんでした。通信環境をご確認ください。"
        : "この画像は解析できませんでした。別の写真でお試しください。");
    }
  }, []);

  const busy = status === "loading-model" || status === "detecting";

  return (
    <div className="photo-overlay" role="dialog" aria-modal="true" aria-label="写真から姿勢を読み取る" onClick={onClose}>
      <div className="photo-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="photo-dialog-head">
          <div>
            <p className="eyebrow">PHOTO TO POSE</p>
            <h2>写真から姿勢を読み取る</h2>
          </div>
          <button className="photo-close" onClick={onClose} aria-label="閉じる">✕</button>
        </div>

        <p className="photo-note">
          作業中の写真を選ぶと、写っている人の姿勢を棒人間に写し取ります。最大{MAX_PEOPLE}人まで読み取れます。
          <strong>解析はブラウザ内で行い、写真をサーバーへ送信しません。</strong>
        </p>

        <label className="photo-file">
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) analyze(file);
              event.target.value = "";
            }}
          />
          <span>{imageUrl ? "別の写真を選ぶ" : "写真を選ぶ"}</span>
        </label>

        {message && <p className={`photo-message ${status === "error" ? "is-error" : ""}`}>{busy && <span className="photo-spinner" aria-hidden="true" />}{message}</p>}

        {imageUrl && (
          <div className="photo-preview">
            {/* 端末内で選んだ画像をそのまま表示するため、next/imageではなくimgを使う */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="読み取り対象の写真" />
            {imageSize.width > 0 && detections.length > 0 && (
              <svg viewBox={`0 0 ${imageSize.width} ${imageSize.height}`} aria-hidden="true">
                {detections.map((detection, index) => {
                  const point = (landmarkIndex: number) => ({
                    x: detection.landmarks[landmarkIndex].x * imageSize.width,
                    y: detection.landmarks[landmarkIndex].y * imageSize.height,
                  });
                  const stroke = index === activeIndex ? "#a9c900" : "#ffffff";
                  const scale = Math.max(imageSize.width, imageSize.height) / 220;
                  return (
                    <g key={index} opacity={index === activeIndex ? 1 : 0.55}>
                      {previewConnections.map(([from, to]) => {
                        const a = point(from);
                        const b = point(to);
                        return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={scale} strokeLinecap="round" />;
                      })}
                      <circle cx={detection.figure.box.x * imageSize.width} cy={detection.figure.box.y * imageSize.height} r={scale * 5} fill={stroke} />
                      <text
                        x={detection.figure.box.x * imageSize.width}
                        y={detection.figure.box.y * imageSize.height + scale * 1.8}
                        textAnchor="middle"
                        fontSize={scale * 6}
                        fontWeight="900"
                        fill="#111"
                      >{index + 1}</text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        )}

        {detections.length > 0 && (
          <div className="photo-people">
            {detections.map((detection, index) => (
              <div
                key={index}
                className={`photo-person ${index === activeIndex ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
              >
                <div className="photo-person-info">
                  <strong>人物{index + 1}</strong>
                  <small>{detection.figure.view === "side" ? "横向き" : "正面"}／読み取り精度 {Math.round(detection.figure.confidence * 100)}%</small>
                </div>
                <button className="button primary" onClick={() => onApply(detection.figure, index)}>この姿勢を取り込む</button>
              </div>
            ))}
          </div>
        )}

        <p className="photo-hint">読み取った姿勢はそのまま関節をドラッグして直せます。全身が写り、人が重なっていない写真ほど精度が上がります。</p>
      </div>
    </div>
  );
}
