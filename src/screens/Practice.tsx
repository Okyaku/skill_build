import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PracticeProps } from '../navigation/MainTabs';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';

export interface PracticeScreenProps {
  navigation: PracticeProps['navigation'];
  route: PracticeProps['route'];
}

interface StudyItem {
  id: string;
  user_id: string;
  project_id: string | null;
  item_type: string;
  title: string;
  content: string;
  category: string | null;
  folder_path: string[] | null;
  created_at: string;
}

type CategoryKey = 'all' | 'network' | 'security' | 'database' | 'computing' | 'storage' | 'other';

export default function Practice({ navigation }: PracticeScreenProps): React.ReactElement {
  const { user, loading: authLoading } = useAuth();
  const { currentProjectId, currentProjectTitle } = useProject();
  const nav = useNavigation<any>();
  const [questionType, setQuestionType] = useState<'flash' | 'text'>('flash');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [studyItems, setStudyItems] = useState<StudyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const categories: { key: CategoryKey; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'network', label: 'ネットワーク' },
    { key: 'security', label: 'セキュリティ' },
    { key: 'database', label: 'データベース' },
    { key: 'computing', label: 'コンピューティング' },
    { key: 'storage', label: 'ストレージ' },
    { key: 'other', label: 'その他' },
  ];

  useEffect(() => {
    if (!user?.id || !currentProjectId) {
      setLoading(false);
      return;
    }

    fetchStudyItems();
  }, [user?.id, currentProjectId]);

  const fetchStudyItems = async () => {
    if (!user?.id || !currentProjectId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', currentProjectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Practice] データ取得エラー:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      } else if (data) {
        console.log('[Practice] データ取得成功:', data.length, '件');
        setStudyItems(data);
      }
    } catch (err) {
      console.error('[Practice] データ取得例外:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryKey = (categoryLabel: string | null): CategoryKey => {
    if (!categoryLabel) return 'other';
    const found = categories.find(c => c.label === categoryLabel);
    return found?.key || 'other';
  };

  const filteredItems = studyItems.filter(item => {
    // フラッシュカードモードの場合は用語（term）のみに絞り込む
    if (questionType === 'flash') {
      if (item.item_type !== 'term') {
        return false;
      }
    }
    // 文章問題モードの場合は問題（question）のみに絞り込む
    else if (questionType === 'text') {
      if (item.item_type !== 'question') {
        return false;
      }
    }

    // カテゴリフィルター
    if (category === 'all') return true;
    return getCategoryKey(item.category) === category;
  });

  const handleStartTest = () => {
    if (filteredItems.length === 0) return;

    console.log('[Practice] テスト開始:', {
      questionType,
      itemCount: filteredItems.length,
      itemTypes: filteredItems.map(i => i.item_type),
    });

    navigation.navigate('TestExecution' as any, { items: filteredItems, questionType });
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9900" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ヘッダー */}
      <View style={styles.headerContainer}>
        <Pressable
          style={styles.backButton}
          onPress={() => nav.navigate('ProjectList')}
          accessibilityLabel="プロジェクト一覧に戻る"
        >
          <Ionicons name="chevron-back" size={28} color="#374151" />
          <Text style={styles.backButtonLabel}>プロジェクト</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{currentProjectTitle || '問題集'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>
              🎯 {questionType === 'flash' ? '用語カード' : '練習問題'}：{filteredItems.length}件
            </Text>

            {/* 出題形式 */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>出題形式</Text>
              <View style={styles.row}>
                <Pressable
                  style={[styles.optionButton, questionType === 'flash' && styles.optionActive]}
                  onPress={() => setQuestionType('flash')}
                >
                  <Text style={[styles.optionText, questionType === 'flash' && styles.optionTextActive]}>🃏 フラッシュカード</Text>
                </Pressable>

                <Pressable
                  style={[styles.optionButton, questionType === 'text' && styles.optionActive]}
                  onPress={() => setQuestionType('text')}
                >
                  <Text style={[styles.optionText, questionType === 'text' && styles.optionTextActive]}>📝 文章問題</Text>
                </Pressable>
              </View>
            </View>

            {/* カテゴリ */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>カテゴリ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.row}>
                  {categories.map(cat => (
                    <Pressable
                      key={cat.key}
                      style={[styles.chip, category === cat.key && styles.chipActive]}
                      onPress={() => setCategory(cat.key)}
                    >
                      <Text style={[styles.chipText, category === cat.key && styles.chipTextActive]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* ボトムアクション */}
            {studyItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>まだノートがありません</Text>
                <Text style={styles.emptySubText}>
                  チャットからAIの解説を保存してみましょう！{'\n'}
                  学習データが貯まるとテストが開始できます
                </Text>
              </View>
            ) : filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>該当するデータがありません</Text>
                <Text style={styles.emptySubText}>別のカテゴリをお試しください</Text>
              </View>
            ) : (
              <Pressable
                style={styles.actionButton}
                onPress={handleStartTest}
              >
                <Text style={styles.actionText}>▶ 選択した条件でテスト開始</Text>
              </Pressable>
            )}
          </View>

          {/* 保存したノート */}
          {studyItems.length > 0 && (
            <View style={styles.savedNotes}>
              <Text style={styles.savedTitle}>保存したノート（最新{Math.min(studyItems.length, 5)}件）</Text>
              {studyItems.slice(0, 5).map(item => (
                <View key={item.id} style={styles.noteItem}>
                  <Text style={styles.noteText}>{item.title}</Text>
                  {item.category && <Text style={styles.noteCategory}>{item.category}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backButtonLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 8,
  },
  headerSpacer: { width: 100 },
  scroll: { padding: 20, alignItems: 'center' },
  cardContainer: { width: '100%', alignItems: 'center' },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    // shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 18,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  section: { marginTop: 12 },
  sectionLabel: { fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  optionActive: { backgroundColor: '#FFFBF2', borderColor: '#FFD29A' },
  optionText: { color: '#6B7280', fontWeight: '700' },
  optionTextActive: { color: '#FF9900' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#FFFBF2', borderColor: '#FFD29A' },
  chipText: { color: '#6B7280', fontWeight: '700' },
  chipTextActive: { color: '#FF9900' },
  actionButton: {
    marginTop: 18,
    backgroundColor: '#FF9900',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

  savedNotes: { width: '100%', marginTop: 8 },
  savedTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  noteItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteText: { color: '#111827', fontWeight: '600', flex: 1 },
  noteCategory: { fontSize: 11, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },

  emptyContainer: { marginTop: 18, alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
