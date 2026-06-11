# 学習アプリ - Expo + Supabase

React Native (Expo) と Supabase を使用した学習管理アプリです。

## 機能

- 📝 **リッチテキストエディタ**: Googleドキュメント風のノート作成（太字、箇条書き、見出し等）
- 💾 **自動保存**: タイピングを停止して1.5秒後に自動保存
- 🔐 **認証機能**: メール/パスワード認証、Google認証（OAuth）
- 📁 **プロジェクト管理**: 学習テーマごとにノートを整理
- 💬 **AIチャット**: Gemini APIを使用した学習サポート
- 📊 **学習管理**: 用語、メモ、問題の作成と復習

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd expo-app
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

`.env` ファイルを編集して、以下の値を設定:

```env
# Gemini API Key (Google AI Studio から取得)
# https://aistudio.google.com/app/apikey
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase設定 (Supabase Dashboard → Settings → API から取得)
# https://supabase.com/dashboard/project/_/settings/api
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Supabaseのセットアップ

1. [Supabase Dashboard](https://supabase.com/dashboard) でプロジェクトを作成
2. SQL Editorで以下のマイグレーションを実行:
   - データベーステーブル作成
   - RLSポリシー設定
   - 認証プロバイダの有効化

詳細は以下のドキュメントを参照:
- `SUPABASE_AUTH_SETUP.md`: 認証設定の詳細手順
- `GOOGLE_AUTH_SETUP.md`: Googleログイン設定

### 4. アプリを起動

```bash
npx expo start
```

Expo Go アプリまたはシミュレータ/エミュレータで起動します。

## プロジェクト構成

```
expo-app/
├── src/
│   ├── components/       # 再利用可能なコンポーネント
│   ├── screens/          # 画面コンポーネント
│   ├── navigation/       # ナビゲーション設定
│   ├── utils/           # ユーティリティ関数
│   └── services/        # API連携
├── contexts/            # React Context（認証、プロジェクト）
├── lib/                 # 外部ライブラリ設定（Supabase等）
├── .env                 # 環境変数（Git管理外）
├── .env.example         # 環境変数のテンプレート
└── app.json            # Expo設定
```

## 主要な技術スタック

- **フロントエンド**: React Native, Expo SDK 54
- **バックエンド**: Supabase (PostgreSQL, Auth, RLS)
- **AI**: Google Gemini API
- **リッチテキスト**: react-native-pell-rich-editor
- **認証**: Supabase Auth (Email/Password, Google OAuth)

## スクリプト

```bash
# 開発サーバー起動
npm start

# キャッシュクリア＋起動
npx expo start --clear

# 型チェック
npx tsc --noEmit
```

## 認証機能

### メール/パスワード認証
- 新規登録とログイン
- パスワードは6文字以上
- 開発環境ではメール確認不要（本番環境では有効化推奨）

### Google認証
- Googleアカウントでのソーシャルログイン
- アカウント選択画面を毎回表示
- 設定方法は `GOOGLE_AUTH_SETUP.md` を参照

## トラブルシューティング

### 認証エラー
`AUTH_TROUBLESHOOTING.md` を参照

### Googleログインエラー
`GOOGLE_AUTH_SETUP.md` と `FIX_LOCALHOST_ERROR.md` を参照

### データベースエラー
- RLSポリシーが正しく設定されているか確認
- Supabase Dashboard → SQL Editor で確認SQLを実行

## セキュリティ

- `.env` ファイルはGit管理外（`.gitignore`に含まれる）
- RLSポリシーで認証済みユーザーのみアクセス可能
- APIキーは環境変数で管理
- 本番環境では必ずメール確認を有効化

## ライセンス

MIT
