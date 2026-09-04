# VRChat Worlds Manager Web

[English README is here / 英語のREADMEはこちら。](./README.md)

VRChat Worlds Manager Webは、好きなワールドを簡単に整理・保存するためのVRChat向けWebアプリ（PWA）です。オリジナルのデスクトップアプリ [VRC Worlds Manager v2](https://github.com/Raifa21/VRC-Worlds-Manager-v2) をベースにしています。

---

## 機能

- お気に入りワールドの追加
  - APIを使用して、VRChatのFavouriteに入っているワールドを自動的に取得し、アプリ内に保存します。
  - 保存後、VRChatのFavouriteから削除してもアプリ側には残ります。
  - ワールドのURLリンクを直接追加することもできます。

- ワールドのフォルダわけ
  - 保存されたワールドを、フォルダ分けできます。
  - 同じワールドを複数のフォルダに振り分けることも可能です。

- ワールドの詳細を確認
  - アプリ内からワールドの詳細を確認することができます。
  - ワールドにメモをつけることもできます。

- 検索機能
  - アプリ内に保存したワールドに対して、検索をかけることができます。
  - ワールド作者、タグ、フォルダの検索に対応しています。

- ワールドを見つける
  - 最近訪れたワールドを取得できます。
  - タグ、テキスト、除外タグ等でワールドを検索できます。

- インスタンスを建てる
  - アプリ内からインスタンスを生成できます。もちろんグループインスタンスも生成できます。
  - インスタンスを生成すると、VRChat公式サイトと同様に、そのインスタンスへのインバイトが届きます。

- フォルダを共有
  - フォルダを共有し、30日間有効なUUIDを生成できます。
  - ウェブ上でフォルダを確認することもできます。

---

## 技術スタック

- **フロントエンド**: Next.js 16 + React 19 + Tailwind CSS 4
- **サービスレイヤー**: Effect-TS
- **データストレージ**: IndexedDB (Dexie.js) + localStorage
- **APIプロキシ**: Cloudflare Worker (CORSプロキシ)
- **パッケージマネージャー**: Bun
- **デプロイ**: Static Generation (PWA)

---

## はじめに

```bash
# 依存関係のインストール
bun install

# 開発サーバーの起動
bun run dev

# 型チェック
bun run typecheck

# プロダクションビルド
bun run build
```

---

## コントリビュート

貢献は大歓迎です！
ガイドラインは [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

---

## ライセンス

本プロジェクトはMITライセンスです。詳細は [LICENSE](LICENSE) ファイルをご覧ください。

一部のコンポーネントは [CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/) ライセンスで提供されており、非営利目的でのみ使用できます。詳細は [LICENSE_ADDITIONAL](LICENSE_ADDITIONAL) ファイルをご覧ください。

---

## クレジット

- オリジナルアプリ: [VRC Worlds Manager v2](https://github.com/Raifa21/VRC-Worlds-Manager-v2) by Raifa & siloneco
- VRChatおよびVRChat APIコミュニティの皆様、APIドキュメントの提供に感謝します。
- サイドバーアイコンは黒音キト様よりCC-BY-NC-4.0ライセンスで提供されています。
- アプリケーションアイコンはCiel-chanを使用、ArmoireLepus様の許可を得ています。
