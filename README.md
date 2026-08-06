# ピクトポーズ

作業マニュアル向けの人物ピクトグラムを、基本姿勢から関節ドラッグで微調整し、SVG・PNGで保存するWebアプリです。

## MVPでできること

- 似た姿勢を増やさず、作業内容で選べる31種類の厳選プリセット
- ドリル加工、切断、クレーン操作、記録・時間／寸法測定、溶接、打音検査、段ボール運搬などを人物・道具・作業対象のセットで選択
- 頭、肩、肘、手、腰、膝、足首をドラッグ
- Undo / Redo、左右反転、リセット
- ヘルメットと墜落制止用器具をそれぞれ独立して表示・非表示
- 左右の手に工具・測定具・記録具など22種類のアイテムを配置
- 作業台、材料、寸法線、溶接火花、検査対象、天井クレーン、段ボール箱もSVGに含めて保存
- 作業台の表示・非表示を個別に切り替え
- 手持ちアイテムの角度・大きさ調整
- 黒＋グレーを基本とする2色モードと単色モード、線幅、頭サイズ、背景の調整
- 透かしや編集ハンドルを含まないSVG・PNG保存
- 編集データをサーバーへ送信しないクライアント処理

## 開発

```bash
npm install
npm run dev
```

本番ビルド：

```bash
npm run build
```

Cloudflare Workersへのデプロイ：

```bash
npm run deploy
```

Worker名、静的ファイルの出力先、互換日付は `wrangler.jsonc` で固定しています。Cloudflare Workers Buildsでは、Build commandを `npm run build`、Deploy commandを `npm run deploy`、Root directoryを `/` に設定します。

## Cloudflare公開方針

Next.jsアプリとしてCloudflare Workersへ配置する。GitHubにリポジトリを作成後、Cloudflare Dashboardの **Workers & Pages → Create application → Import a repository** から接続し、mainブランチの更新を自動公開する。

通常の姿勢編集とSVG/PNG保存はブラウザ内で完結する。フェーズ3でAI APIを追加するまでは、APIキーやデータベースを必要としない。

詳細は [要件定義・実装計画](docs/REQUIREMENTS.md) を参照。

## ライセンス

ソースコードはMIT License。利用者が本アプリで作成したSVG・PNGへ、本アプリ独自の追加制限や透かしは付与しません。

書き出したSVG・PNGは個人・法人を問わず商用利用できます。機能要望は `nandemokarute.ch@gmail.com` まで。
