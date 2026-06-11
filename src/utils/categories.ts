export type ItemType = 'term' | 'memo' | 'question';

export const CATEGORIES_BY_TYPE = {
  term: ['ネットワーク', 'セキュリティ', 'データベース', 'コンピューティング', 'ストレージ', 'その他'],
  memo: ['考えたこと', 'タスク', '勉強法', '授業メモ', 'その他'],
  question: ['クラウドの概念', 'セキュリティとコンプライアンス', 'テクノロジー', '請求と料金'],
} as const;

export type TermCategory = typeof CATEGORIES_BY_TYPE.term[number];
export type MemoCategory = typeof CATEGORIES_BY_TYPE.memo[number];
export type QuestionCategory = typeof CATEGORIES_BY_TYPE.question[number];
export type Category = TermCategory | MemoCategory | QuestionCategory;

/**
 * アイテム種別に応じたカテゴリリストを取得
 */
export function getCategoriesByType(itemType: ItemType | 'all'): string[] {
  if (itemType === 'all') {
    // すべての場合は、用語カテゴリをデフォルトとして返す
    return CATEGORIES_BY_TYPE.term;
  }
  return CATEGORIES_BY_TYPE[itemType];
}

/**
 * カテゴリが特定の種別に属しているかチェック
 */
export function isCategoryValidForType(category: string, itemType: ItemType): boolean {
  return CATEGORIES_BY_TYPE[itemType].includes(category as any);
}
