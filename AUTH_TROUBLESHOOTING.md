# 認証トラブルシューティングガイド

## 問題: 「サーバーに接続できません」エラー

### 1. Supabaseの認証設定を確認

#### メール認証を有効化:
1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. 左メニュー「Authentication」→「Providers」
4. 「Email」プロバイダを探して、トグルを **ON** にする

#### メール確認を無効化（開発用）:
1. 左メニュー「Authentication」→「Settings」
2. 「Email Auth」セクションを開く
3. 「Confirm email」を **OFF** にする
   - これで新規登録後すぐにログインできます
   - 本番環境では必ず ON にしてください

### 2. RLSポリシーを確認

認証が必要なアプリでは、RLSポリシーに `authenticated` ロールが必要です。

#### Supabase SQL Editorで実行:

```sql
-- 現在のポリシーを確認
SELECT tablename, policyname, roles
FROM pg_policies
WHERE tablename IN ('projects', 'chat_messages', 'study_items');
```

#### 結果の例:
```
tablename     | policyname                              | roles
--------------+-----------------------------------------+------------------
projects      | Users can view their own projects       | {authenticated}
projects      | Users can insert their own projects     | {authenticated}
projects      | Users can update their own projects     | {authenticated}
projects      | Users can delete their own projects     | {authenticated}
```

#### `anon` ロールが含まれている場合:
匿名ユーザー向けのポリシーなので、認証必須アプリでは削除します:

```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;

-- authenticated のみのポリシーを作成
CREATE POLICY "Users can view their own projects"
ON projects
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
ON projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON projects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON projects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

同様に `chat_messages` と `study_items` テーブルにも適用してください。

### 3. ネットワーク接続を確認

#### Supabase URLが正しいか確認:
`lib/supabase.ts` を開いて、URLを確認:

```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
```

#### .envファイルを確認:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

#### Supabase Dashboardでプロジェクト設定を確認:
1. Supabase Dashboard → Settings → API
2. 「Project URL」と「Project API keys」の「anon public」キーをコピー
3. `.env` ファイルに貼り付け
4. アプリを再起動

### 4. アプリをクリアして再起動

```bash
# キャッシュをクリア
npx expo start --clear

# または完全にリセット
rm -rf node_modules
npm install
npx expo start --clear
```

### 5. ログを確認

アプリを実行して、コンソールに表示されるログを確認:

```
[Supabase] URL: https://YOUR_PROJECT_ID.supabase.co
[Supabase] Key exists: true
[Auth] 新規登録を試行中... test@example.com
[Auth] signUp response: { data: {...}, error: null }
[Auth] 新規登録成功: 123-456-789
```

エラーがある場合:
```
[Auth] signUp error: { message: "...", status: 400, ... }
```

## よくあるエラーと解決策

### エラー: "Email not confirmed"
**原因**: メール確認が必須だが、確認していない  
**解決策**: Supabase Dashboard で「Confirm email」を OFF にする（開発用）

### エラー: "Invalid login credentials"
**原因**: メールアドレスまたはパスワードが間違っている  
**解決策**: 正しい情報でログインするか、新規登録する

### エラー: "new row violates row-level security policy"
**原因**: RLSポリシーに `authenticated` ロールが含まれていない  
**解決策**: 上記の「2. RLSポリシーを確認」を参照

### エラー: "Network request failed"
**原因**: ネットワーク接続の問題、または Supabase URL が間違っている  
**解決策**:
- Wi-Fi / インターネット接続を確認
- Supabase URL を確認
- ファイアウォール / プロキシ設定を確認

## テスト手順

### メール/パスワード認証のテスト:

1. アプリを起動して認証画面を表示
2. 「新規登録」をタップ
3. 以下の情報を入力:
   - メール: `test@example.com`
   - パスワード: `password123`（6文字以上）
4. 「新規登録」ボタンをタップ
5. 成功メッセージが表示されることを確認
6. 自動的にログインされ、プロジェクト一覧画面が表示される

### ログアウト/ログインのテスト:

1. プロジェクト一覧画面の左上「ログアウト」ボタンをタップ
2. 認証画面に戻ることを確認
3. 同じメール/パスワードでログイン
4. プロジェクト一覧画面に戻ることを確認

## それでも解決しない場合

1. Supabase Dashboard → Logs → Auth Logs でエラーを確認
2. React Native Debugger を使ってネットワークリクエストを確認
3. `lib/supabase.ts` にブレークポイントを設定してデバッグ
4. Supabase サポートに問い合わせ（無料プランでもコミュニティサポートあり）
