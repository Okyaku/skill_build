export type ItemType = 'term' | 'memo' | 'question';

/**
 * データベースから既存のカテゴリ一覧を取得する
 * （Supabaseインスタンスと必要なパラメータを渡す）
 */
export async function getExistingCategories(
  supabase: any,
  userId: string,
  projectId: string,
  itemType?: ItemType
): Promise<string[]> {
  try {
    let query = supabase
      .from('study_items')
      .select('category')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .not('category', 'is', null);

    if (itemType) {
      query = query.eq('item_type', itemType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[categories] カテゴリ取得エラー:', error);
      return [];
    }

    // 重複を除外してソート
    const categorySet = new Set<string>();
    data?.forEach((item: any) => {
      if (item.category) {
        categorySet.add(item.category);
      }
    });

    return Array.from(categorySet).sort();
  } catch (err) {
    console.error('[categories] カテゴリ取得例外:', err);
    return [];
  }
}

/**
 * デフォルトカテゴリの候補（初回利用時のヒント）
 */
export const DEFAULT_CATEGORY_SUGGESTIONS: Record<ItemType, string[]> = {
  term: ['基礎知識', '重要用語', '概念', '技術'],
  memo: ['考えたこと', 'タスク', '勉強法', '授業メモ'],
  question: ['基礎問題', '応用問題', '過去問', '予想問題'],
};
