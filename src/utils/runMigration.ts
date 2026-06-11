import { supabase } from '../../lib/supabase';

/**
 * folder_path カラムを追加するマイグレーション
 * 一度だけ実行する必要があります
 */
export async function addFolderPathColumn(): Promise<void> {
  try {
    console.log('[Migration] folder_path カラムを追加中...');

    // PostgreSQLの配列型を使用
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE study_items
        ADD COLUMN IF NOT EXISTS folder_path TEXT[] DEFAULT '{}';

        UPDATE study_items
        SET folder_path = ARRAY[COALESCE(category, 'その他')]
        WHERE folder_path IS NULL OR folder_path = '{}';

        CREATE INDEX IF NOT EXISTS idx_study_items_folder_path
        ON study_items USING GIN (folder_path);
      `
    });

    if (error) {
      console.error('[Migration] エラー:', error);
      throw error;
    }

    console.log('[Migration] 完了しました');
  } catch (err) {
    console.error('[Migration] 例外:', err);
    throw err;
  }
}
