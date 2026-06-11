import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

interface QuizExecutionModalProps {
  visible: boolean;
  item: StudyItem | null;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function QuizExecutionModal({
  visible,
  item,
  onClose,
}: QuizExecutionModalProps): React.ReactElement {
  const [showAnswer, setShowAnswer] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      console.log('[QuizExecutionModal] フラッシュカード（用語）モーダルを開きました');

      // データ検証: item_typeが'term'以外の場合は警告
      if (item && item.item_type !== 'term') {
        console.error('[QuizExecutionModal] 警告: term以外のデータが渡されました', {
          item_type: item.item_type,
          title: item.title,
        });
      }

      // モーダルが開いたらリセット
      setShowAnswer(false);
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    }
  }, [visible, fadeAnim, slideAnim, item]);

  const handleShowAnswer = () => {
    setShowAnswer(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (!item) return <></>;

  // 厳格なガード: item_typeが'term'でない場合は表示しない
  if (item.item_type !== 'term') {
    console.error('[QuizExecutionModal] エラー: このモーダルはterm専用です。item_type:', item.item_type);
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.errorText}>エラー: 用語データではありません</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="#6B7280" />
            </Pressable>
          </View>
          <View style={styles.content}>
            <Text style={styles.errorMessage}>
              このモーダルは用語（term）専用です。{'\n'}
              種別: {item.item_type}
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.modeLabel}>📖 用語フラッシュカード</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category || 'その他'}</Text>
            </View>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="閉じる">
            <Ionicons name="close" size={28} color="#6B7280" />
          </Pressable>
        </View>

        {/* メインコンテンツ */}
        <View style={styles.content}>
          {/* 用語カード */}
          <View style={styles.questionCard}>
            <Text style={styles.questionLabel}>📖 用語</Text>
            <Text style={styles.questionText}>{item.title}</Text>
          </View>

          {/* 意味を見るボタン */}
          {!showAnswer && (
            <Pressable
              style={styles.showAnswerButton}
              onPress={handleShowAnswer}
              accessibilityLabel="意味を見る"
            >
              <Ionicons name="eye-outline" size={24} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.showAnswerButtonText}>意味を見る</Text>
            </Pressable>
          )}

          {/* 解答カード（フェードイン） */}
          {showAnswer && (
            <Animated.View
              style={[
                styles.answerCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.answerHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.answerLabel}>意味・解説</Text>
              </View>
              <Text style={styles.answerText}>{item.content}</Text>
            </Animated.View>
          )}
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Pressable
            style={styles.closeFooterButton}
            onPress={onClose}
            accessibilityLabel="閉じる"
          >
            <Text style={styles.closeFooterButtonText}>閉じる</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06B6D4',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 20,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    minHeight: SCREEN_HEIGHT * 0.3,
    justifyContent: 'center',
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#06B6D4',
    marginBottom: 16,
    textAlign: 'center',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 32,
    textAlign: 'center',
  },

  showAnswerButton: {
    backgroundColor: '#FF9900',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#FF9900',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  showAnswerButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  answerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 8,
  },
  answerText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
  },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeFooterButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },

  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  errorMessage: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    textAlign: 'center',
  },
});
