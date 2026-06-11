-- Supabase 認証設定の確認

-- 1. メール認証が有効かどうか確認
-- Supabase Dashboard → Authentication → Providers → Email で確認

-- 2. メール確認が必須かどうか確認
-- Supabase Dashboard → Authentication → Settings → Email Auth → Confirm email

-- 3. 現在のRLSポリシーを確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('projects', 'chat_messages', 'study_items')
ORDER BY tablename, policyname;

-- 4. 認証されたユーザーの確認（テスト用）
-- 注意: これは管理者権限でのみ実行可能
-- SELECT id, email, created_at, email_confirmed_at
-- FROM auth.users
-- ORDER BY created_at DESC
-- LIMIT 5;

-- 5. RLSポリシーに authenticated ロールが含まれているか確認
SELECT
  tablename,
  policyname,
  roles
FROM pg_policies
WHERE tablename IN ('projects', 'chat_messages', 'study_items')
  AND 'authenticated' = ANY(roles);

-- 6. 必要に応じて anon ロールを削除して authenticated のみに変更
-- 例: projects テーブルの SELECT ポリシー

/*
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;

CREATE POLICY "Users can view their own projects"
ON projects
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;

CREATE POLICY "Users can insert their own projects"
ON projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
*/

-- 7. メール確認を無効にする（開発環境のみ推奨）
-- Supabase Dashboard で設定:
-- Authentication → Settings → Email Auth → Confirm email: OFF
