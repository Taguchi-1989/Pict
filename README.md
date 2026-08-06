# ピクトポーズ

作業マニュアル向けの人物ピクトグラムを、基本姿勢から関節ドラッグで微調整し、SVG・PNGで保存するWebアプリです。

## MVPでできること

- 似た姿勢を増やさず、作業内容で選べる20種類の厳選プリセット
- ドリル加工、ねじ締め、スパナ締め、ハンマー打ち、噴霧、散水、設備点検、切断、清掃などを人物・道具・装備のセットで選択
- 頭、肩、肘、手、腰、膝、足首をドラッグ
- Undo / Redo、左右反転、リセット
- ヘルメットと墜落制止用器具をそれぞれ独立して表示・非表示
- 左右の手にスパナ、ドライバー、ハンマー、電動ドリル、噴霧器、散水ノズル、ライト、ペンチ、のこぎり、ブラシを配置
- 手持ちアイテムの角度・大きさ調整
- 色、線幅、頭サイズ、背景の調整
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

## Cloudflare公開方針

サーバー処理を持たない静的なNext.jsアプリとしてCloudflare Pagesへ配置する。Cloudflare Dashboardの **Workers & Pages → Create application → Pages → Import an existing Git repository** からこのリポジトリを接続する。

| 設定 | 値 |
| --- | --- |
| Production branch | `main` |
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build` |
| Build output directory | `out` |

mainブランチへのpushで本番環境を、Pull Requestでプレビュー環境を自動更新する。

通常の姿勢編集とSVG/PNG保存はブラウザ内で完結する。フェーズ3でAI APIを追加するまでは、APIキーやデータベースを必要としない。

詳細は [要件定義・実装計画](docs/REQUIREMENTS.md) を参照。

現在のMVPは [ピクトポーズ](https://pictogram-pose-editor.tgc-h-17.chatgpt.site) で確認できます。

## ライセンス

ソースコードはMIT License。利用者が本アプリで作成したSVG・PNGへ、本アプリ独自の追加制限や透かしは付与しません。
