# Googleログイン設定ガイド（簡単版）

## ステップ1: Google Cloud Consoleの設定（5分）

### 1-1. プロジェクトの作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）

### 1-2. OAuth同意画面の設定
1. 左メニュー「APIとサービス」→「OAuth 同意画面」
2. 「外部」を選択して「作成」
3. 以下を入力:
   - アプリ名: `学習アプリ`（任意）
   - ユーザーサポートメール: あなたのメールアドレス
   - デベロッパー連絡先: あなたのメールアドレス
4. 「保存して次へ」を3回クリック（スコープとテストユーザーはスキップ可）

### 1-3. OAuth 2.0 クライアントIDの作成
1. 左メニュー「APIとサービス」→「認証情報」
2. 「+ 認証情報を作成」→「OAuth クライアント ID」
3. アプリケーションの種類: **「ウェブ アプリケーション」**
4. 名前: `Supabase Auth`（任意）
5. **承認済みのリダイレクト URI** に以下を追加:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
6. 「作成」をクリック
7. 表示される **「クライアントID」** と **「クライアントシークレット」** をコピー

## ステップ2: Supabaseの設定（2分）

### 2-1. Googleプロバイダを有効化
1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. 左メニュー「Authentication」→「Providers」
4. 「Google」を探してクリック
5. 以下を入力:
   - **Enabled**: ON
   - **Client ID**: Google Cloud Console でコピーしたクライアントID
   - **Client Secret**: Google Cloud Console でコピーしたクライアントシークレット
6. 「Save」をクリック

### 2-2. メール認証も有効化（推奨）
1. 同じ「Providers」画面で「Email」を探す
2. トグルを **ON** にする
3. （オプション）開発中は「Confirm email」を **OFF** にすると便利

## ステップ3: アプリをテスト

### 3-1. アプリを再起動
```bash
npx expo start --clear
```

### 3-2. Googleログインをテスト
1. アプリで認証画面を開く
2. 「Googleでログイン」ボタンをタップ
3. ブラウザが開いてGoogleログイン画面が表示される
4. Googleアカウントでログイン
5. アプリに戻ってプロジェクト一覧画面が表示される

## トラブルシューティング

### エラー: "redirect_uri_mismatch"
**原因**: Google Cloud Console のリダイレクトURIが間違っている

**解決策**:
1. コンソールに表示されている正しいURLを確認:
   ```
   [Auth] リダイレクトURL: exp://192.168.x.x:8081/--/auth/callback
   ```
2. **これは開発用URLなので無視してOK**
3. Google Cloud Console のリダイレクトURIが以下であることを確認:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
   ※ `YOUR_PROJECT_ID` はあなたのSupabaseプロジェクトIDに置き換え

### エラー: "サーバーに接続できません"
**原因**: Supabase Dashboard でGoogleプロバイダが有効化されていない

**解決策**:
1. Supabase Dashboard → Authentication → Providers
2. Google プロバイダの「Enabled」が **ON** であることを確認
3. Client ID と Client Secret が正しく入力されていることを確認

### ブラウザは開くが、アプリに戻らない
**原因**: リダイレクトスキームの問題

**解決策**:
1. `app.json` に以下が含まれていることを確認:
   ```json
   {
     "expo": {
       "scheme": "expo-app"
     }
   }
   ```
2. アプリを完全に再起動:
   ```bash
   npx expo start --clear
   ```

### それでも動かない場合
コンソールログを確認してください。`[Auth]` で始まるログに詳細情報が含まれています:

```
[Auth] リダイレクトURL: ...
[Auth] OAuth レスポンス: ...
[Auth] ブラウザの結果: ...
[Auth] トークン取得: ...
```

エラーメッセージをコピーして、トラブルシューティングに役立ててください。

## 本番環境用の設定

### iOS用の追加設定
本番環境（App Store）では、カスタムURLスキームの設定が必要です:

1. `app.json` に以下を追加:
   ```json
   {
     "expo": {
       "ios": {
         "bundleIdentifier": "com.yourcompany.yourapp"
       }
     }
   }
   ```

2. Google Cloud Console で iOS用の OAuth クライアントIDを追加作成

### Android用の追加設定
1. `app.json` に以下を追加:
   ```json
   {
     "expo": {
       "android": {
         "package": "com.yourcompany.yourapp"
       }
     }
   }
   ```

2. Google Cloud Console で Android用の OAuth クライアントIDを追加作成
3. SHA-1証明書フィンガープリントを追加

詳細は [Expo Authentication](https://docs.expo.dev/guides/authentication/) を参照してください。
