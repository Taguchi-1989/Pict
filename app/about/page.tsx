import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | ピクトポーズ",
  description: "ピクトポーズの仕組み、商用利用、機能要望のご案内。",
};

export default function AboutPage() {
  return (
    <main className="about-shell">
      <header className="about-topbar">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark" aria-hidden="true"><span /><i /></span>
          <span><span className="eyebrow">MANUAL FIGURE STUDIO</span><strong>ピクトポーズ</strong></span>
        </Link>
        <Link className="about-back" href="/">← 編集画面へ戻る</Link>
      </header>

      <div className="about-main">
        <section className="about-hero">
          <p className="eyebrow">ABOUT PICTO POSE</p>
          <h1>作業を、伝わる形に。</h1>
          <p>ピクトポーズは、作業マニュアルや安全資料に使う人物図を、専門ソフトなしで作るためのブラウザツールです。</p>
        </section>

        <div className="about-grid">
          <section className="about-card">
            <h2>商用利用について</h2>
            <p>本アプリから書き出したSVG・PNGは、個人・法人を問わず、作業マニュアル、手順書、研修資料などで商用利用できます。透かしや追加料金はありません。第三者の権利を侵害しない範囲でご利用ください。</p>
          </section>

          <section className="about-card">
            <h2>データの扱い</h2>
            <p>姿勢の編集、装備・道具の組み合わせ、SVG・PNGの生成はブラウザ内で行います。編集中の姿勢データや書き出し画像を本サービスのサーバーへ送信しません。</p>
          </section>

          <section className="about-card wide">
            <h2>どんな仕組みでできているか</h2>
            <ul>
              <li>Next.jsとReactで構築し、人物・工具・作業対象をSVGベクターとして描画しています。</li>
              <li>頭、肩、肘、手首、腰、膝、足首の座標をプリセットから読み込み、丸い操作点のドラッグで位置を変更します。</li>
              <li>ヘルメット、墜落制止用器具、工具、作業台などを独立したSVGレイヤーとして重ねています。</li>
              <li>保存時は操作点を除き、現在の配色と表示状態をそのままSVGまたは高解像度PNGに変換します。</li>
            </ul>
          </section>

          <section className="about-card wide">
            <h2>機能要望・お問い合わせ</h2>
            <p>追加したい作業姿勢、工具、改善点があれば、内容が分かる簡単な説明を添えてお送りください。</p>
            <a className="about-contact" href="mailto:nandemokarute.ch@gmail.com">nandemokarute.ch@gmail.com</a>
          </section>
        </div>

        <p className="about-footer">© 2026 ZEALBOOTCAMP. All rights reserved.</p>
      </div>
    </main>
  );
}
