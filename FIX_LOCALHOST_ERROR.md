# 「localhost」エラーの修正方法

## 問題
Googleログイン時に「localhost」に接続しようとして失敗している。

## 原因
Supabase Dashboard の「Site URL」設定が `localhost` になっている可能性が高い。

## 解決策

### ステップ1: Supabase Dashboard の設定を確認

1. https://supabase.com/dashboard を開く
2. プロジェクト「ropxetguyjcmlimaypme」を選択
3. 左メニュー「**Settings**」（歯車アイコン）→「**Auth**」をクリック

### ステップ2: Site URL を確認・修正

「**Site URL**」セクションを探して、以下のように設定:

**❌ 間違った設定（これが原因）:**
```
http://localhost:3000
```
または
```
http://localhost:8081
```

**✅ 正しい設定（Expoアプリの場合）:**
```
exp://localhost:8081
```

または、より推奨される設定:
```
myapp://
```
（カスタムスキームを使用）

### ステップ3: Redirect URLs を確認

同じ画面の「**Redirect URLs**」セクションで、以下を追加:

```
exp://localhost:8081/--/auth/callback
myapp://auth/callback
expo-app://auth/callback
```

複数のURLを追加する場合は、カンマで区切ります:
```
exp://localhost:8081/--/auth/callback,myapp://auth/callback,expo-app://auth/callback
```

### ステップ4: 保存して再起動

1. 画面下部の「**Save**」ボタンをクリック
2. アプリを再起動:
```bash
npx expo start --clear
```

## より確実な修正方法（推奨）

Expoの開発環境では、Site URLを以下に設定するのが確実です:

### Site URL:
```
exp://localhost:8081
```

### Redirect URLs:
```
exp://localhost:8081/--/auth/callback
```

## それでも動かない場合

### アプリのコンソールログを確認:
Expoの開発サーバーのターミナルで、以下のログを探してください:

```
[Auth] リダイレクトURL: exp://192.168.x.x:8081/--/auth/callback
```

このURLをコピーして、Supabase Dashboard の「Redirect URLs」に追加してください。

### Google Cloud Console の設定を再確認:

Google Cloud Console のリダイレクトURIは以下のまま（変更不要）:
```
https://ropxetguyjcmlimaypme.supabase.co/auth/v1/callback
```

**重要**: Google Cloud Console には `localhost` や `exp://` のURLは追加しないでください。Supabaseが内部的にリダイレクトを処理します。

## 本番環境用の設定

本番環境（App Store / Google Play）では、以下のように設定します:

### Site URL:
```
https://yourdomain.com
```
（あなたのウェブサイトのURL、またはカスタムスキーム）

### Redirect URLs:
```
yourapp://auth/callback,https://yourdomain.com/auth/callback
```

## トラブルシューティング

### エラー: "Invalid Redirect URL"
**解決策**: Redirect URLs に、アプリが使用しているスキーム（`exp://` または `expo-app://`）が含まれているか確認

### エラー: "Site URL mismatch"
**解決策**: Site URL を `exp://localhost:8081` に変更

### まだ localhost に接続される
**解決策**:
1. Supabase Dashboard で設定を保存したことを確認
2. 設定が反映されるまで1〜2分待つ
3. アプリを完全に再起動（`npx expo start --clear`）
4. それでもダメなら、デバイス/シミュレータを再起動
