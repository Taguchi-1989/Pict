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
            <p className="about-lead">「写真から姿勢を読み取る」で選んだ写真も同じです。解析用のプログラムをお使いの端末に読み込んで、その中だけで処理します。写真がネットワークへ出ることはありません。お気に入りの保存先もブラウザ内（localStorage）で、端末を変えると引き継がれません。</p>
          </section>

          <section className="about-card wide">
            <h2>SVGとPNG、どちらで保存するか</h2>
            <p>本アプリは同じ絵をSVG（ベクター）とPNG（画像）の2形式で書き出せます。貼り付け先で選び分けてください。<strong>PowerPointやWordに貼るなら、まずSVGをおすすめします。</strong></p>
            <div className="about-table-wrap">
              <table className="about-table">
                <thead>
                  <tr><th>　</th><th>SVG（ベクター）</th><th>PNG（画像）</th></tr>
                </thead>
                <tbody>
                  <tr><th>拡大したとき</th><td>何倍にしても輪郭が鮮明。劣化しません。</td><td>書き出しサイズを超えて拡大すると輪郭がぼやけます。</td></tr>
                  <tr><th>書き出す大きさ</th><td>サイズの概念がなく、貼り付け後に自由変形。</td><td>1200×1320px固定。スライドの半分程度までなら実用上十分。</td></tr>
                  <tr><th>色の変更</th><td>貼り付け先で色を変えられます。</td><td>書き出した時点の色で固定されます。</td></tr>
                  <tr><th>背景の透過</th><td>対応（「透明」設定のとき）</td><td>対応（「透明」設定のとき）</td></tr>
                  <tr><th>向いている用途</th><td>PowerPoint・Word・Illustrator・印刷物</td><td>SVGが使えない環境、Web、チャット貼り付け</td></tr>
                </tbody>
              </table>
            </div>
            <h3>PowerPointでの使い分け</h3>
            <ul>
              <li><strong>SVGは「図形に変換」しなくても劣化しません。</strong>挿入したままの状態でもベクターなので、スライド一面まで拡大しても、印刷やPDF書き出しでも輪郭は鮮明なままです。</li>
              <li><strong>「図形に変換」が必要なのは、パーツごとに色を変えたいときだけです。</strong>右クリック →「図形に変換」でPowerPointの図形グループになり、ヘルメットだけ黄色に、といった編集ができるようになります。変換後もベクターなので画質は落ちません。</li>
              <li>ただし<strong>変換すると元のSVGには戻せません</strong>（直後の取り消しを除く）。線の太さや透明度の表現がわずかに変わることもあるため、色を変える必要がなければ変換しないのが無難です。</li>
              <li>SVGの挿入はMicrosoft 365・PowerPoint 2019・2016に対応しています。<strong>PowerPoint 2013以前やGoogleスライドではSVGを扱えない</strong>ため、その場合はPNGを使ってください。</li>
              <li>社内システムや掲示板への貼り付け、画像形式を指定された入稿でもPNGが確実です。</li>
            </ul>
            <h3>背景と書き出し範囲</h3>
            <ul>
              <li>スライドの背景色に馴染ませたいときは背景「透明」、白い枠として置きたいときは「白」を選びます。</li>
              <li>自作の作業台やアイソメ図と重ねるときは、書き出し範囲を「人物のみ」にすると、作業台や床グリッドを除いた人物だけを取り出せます。</li>
              <li>注目マークはどちらの書き出し範囲でも残ります。マーク抜きの人物図が欲しいときは、保存前に「すべて削除」で外してください。</li>
            </ul>
          </section>

          <section className="about-card wide">
            <h2>どんな仕組みでできているか</h2>
            <ul>
              <li>Next.jsとReactで構築し、人物・工具・作業対象をSVGベクターとして描画しています。</li>
              <li>頭、肩、肘、手首、腰、膝、足首の座標をプリセットから読み込み、丸い操作点のドラッグで位置を変更します。</li>
              <li>ヘルメット、墜落制止用器具、工具、作業台などを独立したSVGレイヤーとして重ねています。</li>
              <li>ぶつけた箇所のギザギザ、注目の丸、矢印、手順番号などの注目マークは、人物とは別の注釈レイヤーです。人物の上に重なっても読めるよう白フチを付けて描いています。</li>
              <li>はさまれ注意や火気厳禁、GHSの絵表示などの標識マークは、ISO 7010・GHSの図記号を参考にした本アプリ独自のSVG図案です（規格書の図をそのまま取り込んではいません）。黄色の三角＝警告、赤丸に斜線＝禁止、青丸＝着用指示、赤枠のひし形＝GHSという配色と形は現場の掲示物に合わせているため、意味はそのまま伝わります。モノクロ印刷用に白黒へ切り替えられます。</li>
              <li>保存時は操作点を除き、現在の配色と表示状態をそのままSVGまたは高解像度PNGに変換します。</li>
              <li>写真からの読み取りには、Googleが公開している姿勢推定モデル（MediaPipe Pose Landmarker）をブラウザ上で実行し、検出した関節の座標を本アプリの棒人間の比率に描き直しています。最大3人まで対応します。</li>
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
