-- study_items テーブルに folder_path カラムを追加
-- 階層構造を配列形式で保存（例: ["AWS", "セキュリティ", "IAM"]）

ALTER TABLE study_items 
ADD COLUMN IF NOT EXISTS folder_path TEXT[] DEFAULT '{}';

-- 既存データのfolder_pathを初期化（categoryベースで1階層に設定）
UPDATE study_items 
SET folder_path = ARRAY[COALESCE(category, 'その他')]
WHERE folder_path IS NULL OR folder_path = '{}';

-- インデックスを追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_study_items_folder_path ON study_items USING GIN (folder_path);

-- コメント追加
COMMENT ON COLUMN study_items.folder_path IS 'ノートの階層構造（例: ["クラウド基礎", "AWS", "データベース", "RDS"]）';
