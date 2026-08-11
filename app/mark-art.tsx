import type { MarkType, MarkTone } from "./pose-data";

/**
 * 注目マークの図形をまとめた描画モジュール。
 *
 * 警告マーク（黄色い三角）は、ISO 7010の図記号を「参考に」した自作の図案。
 * 規格書の図をトレース・転載していない（規格そのものの図はISO／JSAの著作物のため）。
 * 黄三角＝警告という形と配色は現場の掲示物と共通なので、並べても意味が通じることを狙っている。
 *
 * すべて原点中心・半径38程度の座標系で描き、マーク側のtranslate/rotate/scaleで配置する。
 */

const SIGN = {
  yellow: "#f5c400",
  ink: "#17211b",
  white: "#ffffff",
};

/** ギザギザや歯車のような放射状の輪郭を作る。 */
export function burstPath(spikes: number, outer: number, inner: number) {
  const points = Array.from({ length: spikes * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI * index) / spikes - Math.PI / 2;
    return `${(Math.cos(angle) * radius).toFixed(1)} ${(Math.sin(angle) * radius).toFixed(1)}`;
  });
  return `M ${points.join(" L ")} Z`;
}

/* ------------------------------------------------------------------ *
 * 注釈マーク（人物の説明用）
 * ------------------------------------------------------------------ */

/**
 * 注釈マークの図形。halo=trueのときは同じ形を白く太らせ、
 * 人物の上に重ねても輪郭が沈まないようにする。
 */
export function AnnotationShape({ type, label, halo = false }: { type: MarkType; label?: string; halo?: boolean }) {
  const paint = halo ? SIGN.white : "currentColor";
  const w = (value: number) => (halo ? value + 9 : value);
  const round = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (type === "impact") {
    return <path d={burstPath(10, 34, 15)} fill={SIGN.white} stroke={paint} strokeWidth={w(5)} strokeLinejoin="round" />;
  }
  if (type === "circle") {
    return <circle cx="0" cy="0" r="30" fill="none" stroke={paint} strokeWidth={w(6)} />;
  }
  if (type === "frame") {
    return (
      <rect
        x="-32" y="-32" width="64" height="64" rx="5"
        fill="none" stroke={paint} strokeWidth={w(5)}
        strokeDasharray={halo ? undefined : "11 8"}
        strokeLinejoin="round"
      />
    );
  }
  if (type === "arrow") {
    return (
      <g fill={paint} stroke={paint} {...round}>
        <path d="M -36 0 H 10" fill="none" strokeWidth={w(9)} />
        <path d="M 8 -17 L 38 0 L 8 17 Z" strokeWidth={w(3)} />
      </g>
    );
  }
  if (type === "caution") {
    return (
      <g {...round}>
        <path d="M 0 -33 L 32 23 L -32 23 Z" fill={paint} stroke={paint} strokeWidth={w(6)} />
        {!halo && (
          <g stroke={SIGN.white} fill={SIGN.white}>
            <path d="M 0 -12 V 5" strokeWidth="7" strokeLinecap="round" />
            <circle cx="0" cy="15" r="4" stroke="none" />
          </g>
        )}
      </g>
    );
  }
  if (type === "ban") {
    return (
      <g fill="none" stroke={paint} {...round}>
        <circle cx="0" cy="0" r="28" strokeWidth={w(7)} />
        <path d="M -20 20 L 20 -20" strokeWidth={w(7)} />
      </g>
    );
  }
  if (type === "pinch") {
    return (
      <g fill={paint} stroke={paint} {...round}>
        <path d="M -40 0 H -20 M 40 0 H 20" fill="none" strokeWidth={w(8)} />
        <path d="M -20 -14 L -4 0 L -20 14 Z" strokeWidth={w(3)} />
        <path d="M 20 -14 L 4 0 L 20 14 Z" strokeWidth={w(3)} />
      </g>
    );
  }
  if (type === "step") {
    return (
      <g>
        <circle cx="0" cy="0" r="25" fill={paint} stroke={paint} strokeWidth={w(3)} />
        {!halo && (
          // dominant-baselineを解釈しない貼り付け先（PowerPoint等）でもずれないよう、yで中央に寄せる。
          <text
            x="0" y="9.5"
            textAnchor="middle"
            fontFamily="sans-serif" fontSize="29" fontWeight="700" fill={SIGN.white}
          >{label?.slice(0, 2) || "1"}</text>
        )}
      </g>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * 警告マークの部品
 * ------------------------------------------------------------------ */

/** 手のひら。指を上に向けた状態で原点付近に描く。 */
function HandGlyph({ fill }: { fill: string }) {
  return (
    <g fill={fill}>
      <rect x="-11" y="0" width="21" height="19" rx="7" />
      <rect x="-10" y="-13" width="5.5" height="16" rx="2.75" />
      <rect x="-3.2" y="-17" width="5.5" height="20" rx="2.75" />
      <rect x="3.6" y="-14" width="5.5" height="17" rx="2.75" />
      <path d="M 9 6 L 15 -3 q 3 -4 6.5 -1.5 q 3 2.5 0.5 6.5 L 15 14 Z" />
    </g>
  );
}

/** 人のシルエット（上半身）。落下物・吊り荷などで下敷きになる人として使う。 */
function PersonBust({ fill, x = 0, y = 0, scale = 1 }: { fill: string; x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill}>
      <circle cx="0" cy="-9" r="7.5" />
      <path d="M -14 14 q 0 -14 14 -14 q 14 0 14 14 Z" />
    </g>
  );
}

type FrameProps = { mono: boolean; halo: boolean; children?: React.ReactNode };

/** 黄色の三角＝警告（危険源がある）。 */
function WarnFrame({ mono, halo, children }: FrameProps) {
  const outline = "M 0 -35 Q 5 -35 7.5 -30 L 37 21 Q 40 27 33 27 L -33 27 Q -40 27 -37 21 L -7.5 -30 Q -5 -35 0 -35 Z";
  if (halo) return <path d={outline} fill={SIGN.white} stroke={SIGN.white} strokeWidth="15" strokeLinejoin="round" />;
  return (
    <g>
      <path d={outline} fill={mono ? SIGN.white : SIGN.yellow} stroke={SIGN.ink} strokeWidth="6" strokeLinejoin="round" />
      <g transform="translate(0 8) scale(0.75)">{children}</g>
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * 警告マーク本体
 * ------------------------------------------------------------------ */

/** 警告マーク。mono=trueで白黒（モノクロ印刷向け）に切り替える。 */
export function SignShape({ type, mono, halo = false }: { type: MarkType; mono: boolean; halo?: boolean }) {
  const ink = SIGN.ink;
  const warnBg = mono ? SIGN.white : SIGN.yellow;
  const round = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  // ---- 警告（黄三角）：三角形は上へ行くほど狭いので、図案は下寄り・上細りに置く ----
  if (type === "warn-pinch") {
    return (
      <WarnFrame mono={mono} halo={halo}>
        <g fill={ink}>
          <rect x="-16" y="-13" width="32" height="7" rx="2.5" />
          <rect x="-22" y="9" width="44" height="7" rx="2.5" />
        </g>
        <g transform="translate(-3 3) rotate(90) scale(0.5)"><HandGlyph fill={ink} /></g>
      </WarnFrame>
    );
  }
  if (type === "warn-entangle") {
    return (
      <WarnFrame mono={mono} halo={halo}>
        <g transform="translate(-7 0)">
          <path d={burstPath(8, 16, 11)} fill={ink} />
          <circle cx="0" cy="0" r="4.5" fill={warnBg} />
        </g>
        <g transform="translate(13 9) rotate(-35) scale(0.5)"><HandGlyph fill={ink} /></g>
      </WarnFrame>
    );
  }
  if (type === "warn-electric") {
    return (
      <WarnFrame mono={mono} halo={halo}>
        <path d="M 6 -21 L -11 3 H -1 L -6 21 L 12 -4 H 2 Z" fill={ink} />
      </WarnFrame>
    );
  }
  if (type === "warn-hot") {
    return (
      <WarnFrame mono={mono} halo={halo}>
        <g transform="translate(-2 -10) scale(0.5)"><HandGlyph fill={ink} /></g>
        <g fill="none" stroke={ink} strokeWidth="3.4" {...round}>
          <path d="M -12 11 q 5 -5 0 -9 M 0 12 q 5 -5 0 -9 M 12 11 q 5 -5 0 -9" />
        </g>
        <rect x="-21" y="12" width="42" height="6" rx="3" fill={ink} />
      </WarnFrame>
    );
  }
  if (type === "warn-slip") {
    return (
      <WarnFrame mono={mono} halo={halo}>
        <circle cx="1" cy="-16" r="6.5" fill={ink} />
        <g stroke={ink} fill="none" {...round}>
          <path d="M 1 -9 L 4 2" strokeWidth="5.5" />
          <path d="M -9 -4 L 6 -11" strokeWidth="5" />
          <path d="M 4 2 L 17 7 M 4 2 L -9 11" strokeWidth="5.5" />
          <path d="M -20 16 H 21" strokeWidth="4.5" />
          <path d="M 8 11 q 6 -2 11 0" strokeWidth="3" />
        </g>
      </WarnFrame>
    );
  }
  if (type === "warn-overhead") {
    return (
      <WarnFrame mono={mono} halo={halo}>
        <rect x="-16" y="-15" width="32" height="7" rx="2.5" fill={ink} />
        <path d={burstPath(8, 9, 4.5)} transform="translate(0 -1)" fill={ink} />
        <circle cx="0" cy="7" r="6.5" fill={ink} />
        <path d="M -12 17 q 0 -6 12 -6 q 12 0 12 6 Z" fill={ink} />
      </WarnFrame>
    );
  }
  if (type === "warn-falling") {
    return (
      <WarnFrame mono={mono} halo={halo}>
        <path d="M -17 -15 H 2 L -1 -9 H -20 Z" fill={ink} />
        <rect x="2" y="-6" width="11" height="11" rx="2" transform="rotate(18 7 0)" fill={ink} />
        <rect x="11" y="6" width="8" height="8" rx="2" transform="rotate(-14 15 10)" fill={ink} />
        <PersonBust fill={ink} x={-10} y={4} scale={0.85} />
      </WarnFrame>
    );
  }
  if (type === "warn-oxygen") {
    return (
      <WarnFrame mono={mono} halo={halo}>
        <text x="13" y="-6" textAnchor="middle" fontFamily="sans-serif" fontSize="17" fontWeight="700" fill={ink}>O2</text>
        <circle cx="-12" cy="-7" r="6.5" fill={ink} />
        <g stroke={ink} fill="none" {...round}>
          <path d="M -12 0 q -7 7 0 11" strokeWidth="6" />
          <path d="M -11 12 q 9 5 17 0" strokeWidth="6" />
          <path d="M -21 17 H 20" strokeWidth="4.5" />
        </g>
      </WarnFrame>
    );
  }

  return null;
}

/** 警告マークかどうか（注釈マークはtone＝色、警告マークはtone＝標準色／白黒として扱う）。 */
export function isSignMark(type: MarkType) {
  return type.startsWith("warn-");
}

/** 1つのマークの完成形（白フチ＋本体）。キャンバスとパレットの見本で共用する。 */
export function MarkGraphic({
  type,
  tone,
  label,
  halo = true,
}: {
  type: MarkType;
  tone: MarkTone;
  label?: string;
  halo?: boolean;
}) {
  if (isSignMark(type)) {
    const mono = tone === "ink";
    return (
      <>
        {halo && <SignShape type={type} mono={mono} halo />}
        <SignShape type={type} mono={mono} />
      </>
    );
  }
  return (
    <>
      {halo && <AnnotationShape type={type} label={label} halo />}
      <AnnotationShape type={type} label={label} />
    </>
  );
}
