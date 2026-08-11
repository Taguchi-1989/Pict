import type { MarkType, MarkTone } from "./pose-data";

/**
 * 注目マークの図形をまとめた描画モジュール。
 *
 * 標識マーク（警告・禁止・指示・GHS）は、ISO 7010やGHSの図記号を「参考に」した自作の図案。
 * 規格書の図をトレース・転載していない（規格そのものの図はISO／JSAの著作物のため）。
 * 形・配色の考え方（黄三角＝警告、赤丸斜線＝禁止、青丸＝指示、赤枠ひし形＝GHS）は共通なので、
 * 実際の掲示物と並べても意味が通じることを狙っている。
 *
 * すべて原点中心・半径38程度の座標系で描き、マーク側のtranslate/rotate/scaleで配置する。
 */

const SIGN = {
  yellow: "#f5c400",
  red: "#d0161c",
  blue: "#1258a8",
  ink: "#17211b",
  white: "#ffffff",
  orange: "#ef6c1a",
  orangeDark: "#c2500f",
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
 * 標識マークの部品
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

/** 炎。火気厳禁と引火性で共用する。 */
function FlameGlyph({ fill, y = 0 }: { fill: string; y?: number }) {
  return (
    <path
      transform={`translate(0 ${y})`}
      d="M 3 -25 C 11 -13 18 -6 15 5 C 12 15 4 21 -3 21 C -13 21 -19 13 -17 3 C -15 -5 -9 -8 -7 -15 C -4 -8 -2 -6 0 -11 C 2 -16 3 -21 3 -25 Z"
      fill={fill}
    />
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

/** 赤い丸に斜線＝禁止（してはいけない）。 */
function ProhibitFrame({ mono, halo, children }: FrameProps) {
  const ring = mono ? SIGN.ink : SIGN.red;
  if (halo) return <circle cx="0" cy="0" r="35" fill={SIGN.white} stroke={SIGN.white} strokeWidth="8" />;
  return (
    <g>
      <circle cx="0" cy="0" r="30" fill={SIGN.white} stroke={ring} strokeWidth="7.5" />
      {children}
      <path d="M -20.5 20.5 L 20.5 -20.5" stroke={ring} strokeWidth="7.5" strokeLinecap="butt" />
    </g>
  );
}

/** 青い丸＝指示（着用しなければならない）。 */
function MandateFrame({ mono, halo, children }: FrameProps) {
  if (halo) return <circle cx="0" cy="0" r="35" fill={SIGN.white} stroke={SIGN.white} strokeWidth="8" />;
  return (
    <g>
      <circle
        cx="0" cy="0" r="30"
        fill={mono ? SIGN.white : SIGN.blue}
        stroke={mono ? SIGN.ink : "none"}
        strokeWidth="5"
      />
      {children}
    </g>
  );
}

/** 白地に赤枠のひし形＝GHS（化学品の危険有害性）。 */
function GhsFrame({ mono, halo, children }: FrameProps) {
  const outline = "M 0 -36 L 36 0 L 0 36 L -36 0 Z";
  if (halo) return <path d={outline} fill={SIGN.white} stroke={SIGN.white} strokeWidth="14" strokeLinejoin="round" />;
  return (
    <g>
      <path d={outline} fill={SIGN.white} stroke={mono ? SIGN.ink : SIGN.red} strokeWidth="7" strokeLinejoin="round" />
      {children}
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * 標識マーク本体
 * ------------------------------------------------------------------ */

/** 標識マーク。mono=trueで白黒（モノクロ印刷向け）に切り替える。 */
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

  // ---- 禁止（赤丸斜線） ----
  if (type === "ban-entry") {
    return (
      <ProhibitFrame mono={mono} halo={halo}>
        <g fill={ink} transform="scale(0.92)">
          <circle cx="-1" cy="-15" r="6.5" />
          <path d="M -8 -7 h 12 l 5 12 -5 2 -3 -7 v 6 l 6 12 -5 3 -7 -13 -6 9 -5 -3 7 -12 z" />
        </g>
      </ProhibitFrame>
    );
  }
  if (type === "ban-fire") {
    return (
      <ProhibitFrame mono={mono} halo={halo}>
        <g transform="translate(0 2) scale(0.95)"><FlameGlyph fill={ink} /></g>
      </ProhibitFrame>
    );
  }
  if (type === "ban-touch") {
    return (
      <ProhibitFrame mono={mono} halo={halo}>
        <g transform="translate(-2 -1) scale(0.95)"><HandGlyph fill={ink} /></g>
      </ProhibitFrame>
    );
  }
  if (type === "ban-underload") {
    return (
      <ProhibitFrame mono={mono} halo={halo}>
        <g fill={ink}>
          <path d="M 0 -25 V -18" stroke={ink} strokeWidth="3.5" />
          <path d="M -3.5 -19 h 7 l 3.5 6 h -14 z" />
          <rect x="-17" y="-13" width="34" height="13" rx="2" />
          <PersonBust fill={ink} x={0} y={11} scale={0.95} />
        </g>
      </ProhibitFrame>
    );
  }

  // ---- 指示（青丸）：白い図案の中に、地色で隙間を入れて形を分ける ----
  const mandatePaint = mono ? SIGN.ink : SIGN.white;
  const mandateBg = mono ? SIGN.white : SIGN.blue;
  if (type === "must-helmet") {
    return (
      <MandateFrame mono={mono} halo={halo}>
        <circle cx="0" cy="14" r="11.5" fill={mandatePaint} />
        <path d="M -19 -2 q 2 -19 19 -19 q 17 0 19 19 Z" fill={mandatePaint} />
        <rect x="-23" y="-3" width="46" height="7" rx="3.5" fill={mandatePaint} />
        <path d="M -22 5.5 H 22" stroke={mandateBg} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 0 -20 V -6" stroke={mandateBg} strokeWidth="3" strokeLinecap="round" />
      </MandateFrame>
    );
  }
  if (type === "must-goggles") {
    return (
      <MandateFrame mono={mono} halo={halo}>
        <circle cx="0" cy="1" r="17.5" fill={mandatePaint} />
        <g fill={mandateBg}>
          <rect x="-17" y="-6" width="15" height="11" rx="4.5" />
          <rect x="2" y="-6" width="15" height="11" rx="4.5" />
          <rect x="-4" y="-4" width="8" height="4" rx="2" />
          <rect x="-25" y="-5" width="9" height="4.5" rx="2" />
          <rect x="16" y="-5" width="9" height="4.5" rx="2" />
        </g>
      </MandateFrame>
    );
  }
  if (type === "must-gloves") {
    return (
      <MandateFrame mono={mono} halo={halo}>
        <g stroke={mandateBg} strokeWidth="5" strokeLinejoin="round" fill={mandateBg}>
          <g transform="translate(-13 1) scale(0.78)"><HandGlyph fill={mandateBg} /></g>
          <g transform="translate(13 3) scale(-0.78 0.78)"><HandGlyph fill={mandateBg} /></g>
        </g>
        <g transform="translate(-13 1) scale(0.78)"><HandGlyph fill={mandatePaint} /></g>
        <g transform="translate(13 3) scale(-0.78 0.78)"><HandGlyph fill={mandatePaint} /></g>
      </MandateFrame>
    );
  }
  if (type === "must-mask") {
    return (
      <MandateFrame mono={mono} halo={halo}>
        <circle cx="0" cy="-3" r="17.5" fill={mandatePaint} />
        <g stroke={mandateBg} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M -15 0 q 15 -6 30 0 q -1 13 -15 15 q -14 -2 -15 -15 z" fill={mandatePaint} />
          <path d="M -14 6 q 14 4 28 0 M -13 11 q 13 4 26 0" />
          <path d="M -15 1 L -24 -3 M 15 1 L 24 -3" strokeWidth="3.5" />
        </g>
      </MandateFrame>
    );
  }

  // ---- GHS（白地・赤枠ひし形）：ひし形は四隅が狭いので中央寄りに小さく置く ----
  if (type === "ghs-toxic") {
    return (
      <GhsFrame mono={mono} halo={halo}>
        <g transform="scale(0.86)">
          <g stroke={ink} strokeWidth="7" strokeLinecap="round">
            <path d="M -15 8 L 15 22 M 15 8 L -15 22" />
          </g>
          <path d="M 0 -22 q 15 0 15 14 q 0 7 -5 10 v 5 h -20 v -5 q -5 -3 -5 -10 q 0 -14 15 -14 z" fill={ink} />
          <circle cx="-5.5" cy="-8" r="3.8" fill={SIGN.white} />
          <circle cx="5.5" cy="-8" r="3.8" fill={SIGN.white} />
          <path d="M 0 -3 l 2.5 4 h -5 z" fill={SIGN.white} />
        </g>
      </GhsFrame>
    );
  }
  if (type === "ghs-health") {
    return (
      <GhsFrame mono={mono} halo={halo}>
        <g fill={ink}>
          <circle cx="0" cy="-17" r="7.5" />
          <path d="M -15 19 q 0 -22 15 -22 q 15 0 15 22 Z" />
        </g>
        <path d={burstPath(8, 9.5, 4.5)} transform="translate(0 8)" fill={SIGN.white} stroke={ink} strokeWidth="2.2" />
      </GhsFrame>
    );
  }
  if (type === "ghs-corrosive") {
    return (
      <GhsFrame mono={mono} halo={halo}>
        <g fill={ink}>
          <path d="M -23 -14 L -9 -6 L -12.5 -0.5 L -26.5 -8.5 Z" />
          <path d="M 23 -14 L 9 -6 L 12.5 -0.5 L 26.5 -8.5 Z" />
        </g>
        <g stroke={ink} strokeWidth="3.4" strokeLinecap="round">
          <path d="M -11 1 L -14 8 M 11 1 L 14 8" />
        </g>
        <path d="M -26 11 h 17 l -4 7 h -17 z" fill={ink} />
        <path d="M -20 11 l 3 4 3 -4 z" fill={SIGN.white} />
        <g transform="translate(12 10) scale(0.44)"><HandGlyph fill={ink} /></g>
        <path d="M 11 6 l 3 4 3 -4 z" fill={SIGN.white} />
      </GhsFrame>
    );
  }
  if (type === "ghs-flammable") {
    return (
      <GhsFrame mono={mono} halo={halo}>
        <g transform="translate(0 -3) scale(0.9)"><FlameGlyph fill={ink} /></g>
        <rect x="-13" y="17" width="26" height="5" rx="2.5" fill={ink} />
      </GhsFrame>
    );
  }
  if (type === "ghs-gas") {
    return (
      <GhsFrame mono={mono} halo={halo}>
        <g fill={ink} transform="scale(0.85)">
          <rect x="-11" y="-16" width="22" height="38" rx="8" />
          <rect x="-5" y="-24" width="10" height="9" rx="2" />
          <rect x="-13" y="-6" width="26" height="4" fill={SIGN.white} />
        </g>
      </GhsFrame>
    );
  }
  if (type === "ghs-oxidizer") {
    return (
      <GhsFrame mono={mono} halo={halo}>
        <g transform="translate(0 -10) scale(0.74)"><FlameGlyph fill={ink} /></g>
        <circle cx="0" cy="18" r="9.5" fill={ink} />
      </GhsFrame>
    );
  }

  // ---- 現場の物 ----
  if (type === "cone") {
    const body = mono ? SIGN.white : SIGN.orange;
    const base = mono ? SIGN.white : SIGN.orangeDark;
    if (halo) {
      return (
        <g fill={SIGN.white} stroke={SIGN.white} strokeWidth="13" strokeLinejoin="round">
          <path d="M 0 -30 L 20 20 H -20 Z" />
          <path d="M -29 28 H 29 L 24 19 H -24 Z" />
        </g>
      );
    }
    return (
      <g stroke={SIGN.ink} strokeWidth="4" strokeLinejoin="round">
        <path d="M -29 28 H 29 L 24 19 H -24 Z" fill={base} />
        <path d="M 0 -30 L 20 20 H -20 Z" fill={body} />
        <path d="M -9.5 -6 H 9.5 L 12.5 3 H -12.5 Z" fill={SIGN.white} stroke="none" />
        <path d="M -12.5 3 H 12.5 M -9.5 -6 H 9.5" stroke={SIGN.ink} strokeWidth="2.5" />
      </g>
    );
  }
  return null;
}

/** 標識マークかどうか（注釈マークはtone＝色、標識マークはtone＝標準色／白黒として扱う）。 */
export function isSignMark(type: MarkType) {
  return (
    type.startsWith("warn-") ||
    type.startsWith("ban-") ||
    type.startsWith("must-") ||
    type.startsWith("ghs-") ||
    type === "cone"
  );
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
