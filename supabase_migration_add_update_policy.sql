-- プロジェクトテーブルにUPDATEポリシーを追加

-- 既存のUPDATEポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;

-- 自分のプロジェクトを更新できるポリシーを作成
CREATE POLICY "Users can update their own projects"
ON projects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 確認用：現在のRLSポリシー一覧を表示
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;
