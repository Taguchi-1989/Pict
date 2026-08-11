import {
  MARK_CORNER,
  MARK_SIZE,
  MARK_STROKE,
  brandColors,
  markHands,
  markHead,
  markLimbOrder,
  markPaths,
} from "./brand-geometry";

/**
 * ヘッダーなどに置くロゴマーク。図形の定義は app/brand-geometry.ts にある。
 * ファビコンやアプリアイコンも同じ図形から作っている（scripts/generate-brand-assets.mjs）。
 */
export function BrandMark({ size = 43, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}
      role="img"
      aria-label="ピクトポーズ"
    >
      <defs>
        <linearGradient id="brand-mark-ink" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={brandColors.inkLight} />
          <stop offset="1" stopColor={brandColors.inkDark} />
        </linearGradient>
      </defs>
      <rect width={MARK_SIZE} height={MARK_SIZE} rx={MARK_CORNER} fill="url(#brand-mark-ink)" />
      <g
        fill="none"
        stroke={brandColors.accent}
        strokeWidth={MARK_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {markLimbOrder.map((d) => <path key={d} d={d} />)}
        <path d={markPaths.neck} />
      </g>
      <path
        d={markPaths.torso}
        fill={brandColors.accent}
        stroke={brandColors.accent}
        strokeWidth={MARK_STROKE * 0.72}
        strokeLinejoin="round"
      />
      {markHands.map((hand) => (
        <circle key={`${hand.cx}-${hand.cy}`} cx={hand.cx} cy={hand.cy} r={MARK_STROKE * 0.58} fill={brandColors.accent} />
      ))}
      <circle cx={markHead.cx} cy={markHead.cy} r={markHead.r} fill={brandColors.accent} />
    </svg>
  );
}
