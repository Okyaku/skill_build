# Google認証デバッグガイド

## ✅ Google Cloud Console の設定 - 完了
あなたの設定は正しいです:
- 承認済みの JavaScript 生成元: `https://YOUR_PROJECT_ID.supabase.co`
- 承認済みのリダイレクト URI: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`

## 次のステップ: Supabase Dashboard の確認

### 1. Supabase Dashboard でGoogleプロバイダを確認

1. https://supabase.com/dashboard を開く
2. プロジェクト「YOUR_PROJECT_ID」を選択
3. 左メニュー「Authentication」→「Providers」をクリック
4. 「Google」を探してクリック

### 2. 以下を確認:

#### ✅ Enabled（有効化）
- トグルが **緑色（ON）** になっているか？
- もし灰色（OFF）なら、クリックして有効化する

#### ✅ Client ID
Google Cloud Console の「クライアント ID」をコピーして貼り付ける:
- Google Cloud Console → 認証情報 → 作成したOAuthクライアント
- 「クライアント ID」（長い文字列、例: `675995591305-gl73curoo1e04ucpp70tpt6hl68v0gp0.apps.googleusercontent.com`）

#### ✅ Client Secret
Google Cloud Console の「クライアント シークレット」をコピーして貼り付ける:
- 同じ場所に「クライアント シークレット」がある
- （例: `GOCSPX-xxxxxxxxxxxxxxxxxxxx`）

#### ✅ 保存
- 右下の「Save」ボタンをクリック

## 3. アプリのログを確認

アプリを再起動して、Googleログインをもう一度試してください:

```bash
npx expo start --clear
```

「Googleでログイン」をタップしたら、コンソールに以下のようなログが表示されるはずです:

### 正常な場合:
```
[Auth] リダイレクトURL: exp://192.168.x.x:8081/--/auth/callback
[Auth] OAuth レスポンス: { data: { provider: 'google', url: 'https://...' }, error: null }
[Auth] ブラウザを開いています...
[Auth] ブラウザの結果: { type: 'success', url: '...' }
[Auth] トークン取得: { hasAccessToken: true, hasRefreshToken: true }
[Auth] Google認証成功！
```

### エラーの場合:
```
[Auth] OAuth レスポンス: { data: null, error: { message: '...', status: 400 } }
```

## よくあるエラーと解決策

### エラー: "Provider is not enabled"
**原因**: Supabase Dashboard でGoogleプロバイダが有効化されていない
**解決策**: 上記「2. 以下を確認」を実行

### エラー: "Invalid client ID" または "Invalid client secret"
**原因**: Client ID または Client Secret が間違っている
**解決策**: 
1. Google Cloud Console で正しいクライアントIDとシークレットをコピー
2. Supabase Dashboard に貼り付け直す
3. **重要**: 末尾にスペースが入っていないか確認

### エラー: "Network request failed"
**原因**: インターネット接続の問題
**解決策**:
1. Wi-Fi接続を確認
2. Supabaseのステータスページを確認: https://status.supabase.com/

### ブラウザは開くが、エラーが表示される
**原因**: Google Cloud Console のリダイレクトURIが間違っている
**解決策**: リダイレクトURIが完全に一致しているか確認:
```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```
（スペース、大文字小文字、スラッシュの位置など）

## デバッグのための追加情報

### Supabaseの設定を確認するSQL:
Supabase Dashboard → SQL Editor で以下を実行:

```sql
-- 認証プロバイダーの確認（これは実行できないかもしれません）
-- SELECT * FROM auth.saml_providers;
```

### ログの確認:
Supabase Dashboard → Logs → Auth Logs
- 最近のログを確認
- エラーメッセージを探す

## まだ解決しない場合

コンソールログ（`[Auth]` で始まる部分）をすべてコピーして、エラーメッセージを確認してください。

特に重要なのは:
```
[Auth] OAuth レスポンス: ...
```
この部分に `error` が含まれていれば、その内容が問題の原因です。
