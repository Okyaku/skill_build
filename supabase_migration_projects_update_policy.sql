-- プロジェクトテーブルのRLSポリシー修正
-- UPDATEとDELETEの権限を追加

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- 自分のプロジェクトを更新できるポリシー
CREATE POLICY "Users can update their own projects"
ON projects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 自分のプロジェクトを削除できるポリシー
CREATE POLICY "Users can delete their own projects"
ON projects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 確認用：現在のRLSポリシー一覧を表示
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'projects';
