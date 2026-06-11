# データベースマイグレーション手順

## folder_path カラムの追加

階層的なディレクトリ構造をサポートするため、`study_items` テーブルに `folder_path` カラムを追加します。

### 実行方法

1. **Supabase Studio** にアクセス
   - https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **SQL Editor** を開く
   - 左サイドバーから「SQL Editor」をクリック

3. 以下のSQLを実行

```sql
-- study_items テーブルに folder_path カラムを追加
-- 階層構造を配列形式で保存（例: ["AWS", "セキュリティ", "IAM"]）

ALTER TABLE study_items 
ADD COLUMN IF NOT EXISTS folder_path TEXT[] DEFAULT '{}';

-- 既存データのfolder_pathを初期化（categoryベースで1階層に設定）
UPDATE study_items 
SET folder_path = ARRAY[COALESCE(category, 'その他')]
WHERE folder_path IS NULL OR folder_path = '{}';

-- インデックスを追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_study_items_folder_path 
ON study_items USING GIN (folder_path);

-- コメント追加
COMMENT ON COLUMN study_items.folder_path IS 'ノートの階層構造（例: ["クラウド基礎", "AWS", "データベース", "RDS"]）';
```

4. 「Run」ボタンをクリックして実行

5. 完了メッセージが表示されれば成功です

### 確認方法

以下のSQLで `folder_path` カラムが追加されたか確認できます：

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'study_items' AND column_name = 'folder_path';
```

### 既存データの確認

```sql
SELECT id, title, category, folder_path
FROM study_items
LIMIT 10;
```

## 注意事項

- このマイグレーションは冪等性があり、複数回実行しても問題ありません
- 既存のデータは保持され、`category` の値を元に `folder_path` が自動生成されます
- 新規に保存されるノートは、AIが自動生成した3〜4階層の `folder_path` が設定されます

## トラブルシューティング

### エラー: "permission denied for table study_items"

- Supabase Studioで実行している場合、プロジェクトの管理者権限があることを確認してください

### エラー: "column already exists"

- `folder_path` カラムが既に存在する場合、このエラーが出る可能性がありますが問題ありません
- `IF NOT EXISTS` 句により、既に存在する場合はスキップされます

### 既存データの folder_path が空の場合

以下のSQLで再初期化できます：

```sql
UPDATE study_items 
SET folder_path = ARRAY[COALESCE(category, 'その他')]
WHERE folder_path IS NULL OR folder_path = '{}';
```
