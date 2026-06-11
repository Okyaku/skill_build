# セキュリティチェックリスト - Git Push前の確認

## ✅ 完了した対策

### 1. 環境変数の保護
- [x] `.env` ファイルを `.gitignore` に追加
- [x] `.env` をGitキャッシュから削除（`git rm --cached .env`）
- [x] `.env.example` テンプレートを作成
- [x] `lib/supabase.ts` から機密情報のハードコードを削除

### 2. ドキュメントの匿名化
- [x] プロジェクトID `ropxetguyjcmlimaypme` を `YOUR_PROJECT_ID` に置換
- [x] 以下のファイルを修正:
  - `GOOGLE_AUTH_SETUP.md`
  - `DEBUG_GOOGLE_AUTH.md`
  - `FIX_LOCALHOST_ERROR.md`
  - `AUTH_TROUBLESHOOTING.md`

### 3. README.md の作成
- [x] セットアップ手順を記載
- [x] 環境変数の設定方法を明記
- [x] トラブルシューティングガイドへのリンク

## 🔒 保護されている機密情報

以下の情報はGitに含まれません:

1. **Supabase URL**: `https://ropxetguyjcmlimaypme.supabase.co`
2. **Supabase Anon Key**: `eyJhbGci...`
3. **Gemini API Key**: `AQ.Ab8RN6IY...`

これらは `.env` ファイルに保存され、`.gitignore` でGit管理外になっています。

## 📋 Git Push前の最終チェック

Push前に以下を確認してください:

```bash
# 1. .env がGit管理外になっているか確認
git check-ignore .env
# ✅ 出力: .env （管理外であることを示す）

# 2. ステージングされているファイルを確認
git status

# 3. 機密情報が含まれていないか確認
git diff --cached | grep -i "ropxetguyjcmlimaypme\|eyJhbGci\|AQ\.Ab8RN6IY"
# ✅ 何も出力されなければOK

# 4. コミット
git add .
git commit -m "Add authentication and rich text editor features"

# 5. Push
git push origin main
```

## 🚨 絶対にGitに含めてはいけないファイル

- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `*.key`
- `*.pem`
- `*.p12`
- `*.jks`

これらは `.gitignore` で既に除外されています。

## 👥 他の開発者向けの指示

### リポジトリをクローンした後:

1. `.env.example` をコピーして `.env` を作成:
   ```bash
   cp .env.example .env
   ```

2. `.env` ファイルを編集して、自分のAPIキーを設定:
   ```env
   EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. Supabaseプロジェクトを作成して、RLSポリシーを設定

詳細は `README.md` を参照してください。

## 🔐 本番環境用の追加セキュリティ

本番環境にデプロイする前に:

1. **メール確認を有効化**
   - Supabase Dashboard → Authentication → Settings
   - 「Confirm email」を **ON** にする

2. **RLSポリシーの再確認**
   - すべてのテーブルで `authenticated` ロールのみアクセス可能に
   - `anon` ロールを削除

3. **レート制限の設定**
   - Supabase Dashboard → Authentication → Rate Limits
   - API呼び出しの制限を設定

4. **環境変数の管理**
   - Expo EAS Secrets を使用
   - CI/CDパイプラインでの環境変数設定

5. **HTTPSの強制**
   - すべてのAPI通信でHTTPSを使用（Supabaseはデフォルトで有効）

## ✅ Push可能な状態

以下の確認が完了したら、安全にGitにpushできます:

- [x] `.env` がGit管理外
- [x] ドキュメントから機密情報を削除
- [x] `.env.example` を作成
- [x] `lib/supabase.ts` から機密情報を削除
- [x] `.gitignore` を更新

**このファイル自体もGitに含めてOKです！**
