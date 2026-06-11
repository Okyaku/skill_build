import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

interface StudyItem {
  id: string;
  user_id: string;
  project_id: string | null;
  item_type: string;
  title: string;
  content: string;
  category: string | null;
  created_at: string;
}

interface TestExecutionRootStackParamList extends Record<string, object | undefined> {
  TestExecution: {
    items: StudyItem[];
    questionType: 'flash' | 'text';
  };
}

export type TestExecutionProps = NativeStackScreenProps<TestExecutionRootStackParamList, 'TestExecution'>;

export interface TestExecutionScreenProps {
  navigation: TestExecutionProps['navigation'];
  route: TestExecutionProps['route'];
}

type Rating = 'retry' | 'fuzzy' | 'perfect' | null;

export default function TestExecution({ navigation, route }: TestExecutionScreenProps): React.ReactElement {
  const { items = [], questionType = 'text' } = route.params || {};

  // 問題タイプに応じてアイテムをフィルタリング
  const filteredItems = items.filter(item => {
    if (questionType === 'flash') {
      // フラッシュカードは用語のみ
      if (item.item_type !== 'term') {
        console.warn('[TestExecution] フラッシュカードモードでterm以外を除外:', item.item_type, item.title);
        return false;
      }
    } else if (questionType === 'text') {
      // 文章問題は問題のみ
      if (item.item_type !== 'question') {
        console.warn('[TestExecution] 文章問題モードでquestion以外を除外:', item.item_type, item.title);
        return false;
      }
    }
    return true;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [rating, setRating] = useState<Rating>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (filteredItems.length === 0) {
      console.log('[TestExecution] フィルター後のアイテムが0件のため戻ります');
      navigation.goBack();
    }
  }, [filteredItems.length, navigation]);

  const currentItem = filteredItems[currentIndex];
  const totalItems = filteredItems.length;

  const handleRating = (type: Rating) => {
    setRating(type);
    setTimeout(() => {
      if (currentIndex < totalItems - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
        setIsFlipped(false);
        setRating(null);
      } else {
        navigation.goBack();
      }
    }, 500);
  };

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  if (!currentItem) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>データがありません</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={() => navigation.goBack()} accessibilityLabel="閉じる">
          <Ionicons name="close" size={28} color="#374151" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {questionType === 'flash' ? 'フラッシュカード' : '文章問題'} - {currentItem.category || 'その他'} ({currentIndex + 1}/{totalItems})
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* メインコンテンツ */}
      <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={false}>
        <View style={styles.cardContainer}>
          {questionType === 'flash' ? (
            <Pressable style={styles.card} onPress={handleFlipCard} accessibilityLabel="カードをめくる">
              <Text style={styles.cardSide}>{isFlipped ? '解答' : '問題'}</Text>
              <Text style={styles.questionText}>
                {isFlipped ? currentItem.content : currentItem.title}
              </Text>
              <Text style={styles.flipHint}>{isFlipped ? '' : 'タップでめくる'}</Text>
            </Pressable>
          ) : (
            <View style={styles.card}>
              <Text style={styles.questionText}>{currentItem.title}</Text>

              <Pressable
                style={styles.showAnswerButton}
                onPress={() => setShowAnswer(!showAnswer)}
                accessibilityLabel="解答を表示"
              >
                <Text style={styles.showAnswerText}>{showAnswer ? '解答を隠す' : '解答を表示'}</Text>
              </Pressable>

              {showAnswer && (
                <View style={styles.answerArea}>
                  <Text style={styles.answerLabel}>解答：</Text>
                  <Text style={styles.answerText}>{currentItem.content}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* フッター - アクションボタン */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.actionButton, rating === 'retry' && styles.actionButtonActive]}
          onPress={() => handleRating('retry')}
          accessibilityLabel="もう一回"
        >
          <Text style={styles.actionIcon}>🔴</Text>
          <Text style={styles.actionLabel}>もう一回</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, rating === 'fuzzy' && styles.actionButtonActive]}
          onPress={() => handleRating('fuzzy')}
          accessibilityLabel="フワフワ"
        >
          <Text style={styles.actionIcon}>🟡</Text>
          <Text style={styles.actionLabel}>フワフワ</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, rating === 'perfect' && styles.actionButtonActive]}
          onPress={() => handleRating('perfect')}
          accessibilityLabel="完璧"
        >
          <Text style={styles.actionIcon}>🟢</Text>
          <Text style={styles.actionLabel}>完璧</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },

  // ヘッダー
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 44,
  },

  // メインコンテンツ
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
  cardContainer: { width: '100%', paddingHorizontal: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    // shadow
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 20,
  },

  // 解答表示ボタン
  showAnswerButton: {
    borderWidth: 2,
    borderColor: '#FF9900',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  showAnswerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF9900',
  },

  // 解答エリア
  answerArea: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9900',
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  answerText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },

  // フッター
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 'auto',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionButtonActive: {
    backgroundColor: '#F3F4F6',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },

  cardSide: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF9900',
    textTransform: 'uppercase',
    marginBottom: 12,
    textAlign: 'center',
  },
  flipHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
