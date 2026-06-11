import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
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

interface ExamQuestionModalProps {
  visible: boolean;
  item: StudyItem | null;
  onClose: () => void;
}

export default function ExamQuestionModal({
  visible,
  item,
  onClose,
}: ExamQuestionModalProps): React.ReactElement {
  const [showAnswer, setShowAnswer] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      console.log('[ExamQuestionModal] 実戦問題（question）モーダルを開きました');

      // データ検証: item_typeが'question'以外の場合は警告
      if (item && item.item_type !== 'question') {
        console.error('[ExamQuestionModal] 警告: question以外のデータが渡されました', {
          item_type: item.item_type,
          title: item.title,
        });
      }

      // モーダルが開いたらリセット
      setShowAnswer(false);
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim, item]);

  const handleShowAnswer = () => {
    setShowAnswer(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  if (!item) return <></>;

  // 厳格なガード: item_typeが'question'でない場合は表示しない
  if (item.item_type !== 'question') {
    console.error('[ExamQuestionModal] エラー: このモーダルはquestion専用です。item_type:', item.item_type);
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.errorText}>エラー: 問題データではありません</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="#6B7280" />
            </Pressable>
          </View>
          <View style={styles.scrollContent}>
            <Text style={styles.errorMessage}>
              このモーダルは問題（question）専用です。{'\n'}
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
            <Text style={styles.modeLabel}>❓ 実戦問題</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category || 'その他'}</Text>
            </View>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="閉じる">
            <Ionicons name="close" size={28} color="#6B7280" />
          </Pressable>
        </View>

        {/* メインコンテンツ */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 問題文セクション */}
          <View style={styles.questionSection}>
            <View style={styles.questionHeader}>
              <Ionicons name="help-circle" size={20} color="#FB923C" />
              <Text style={styles.sectionLabel}>問題</Text>
            </View>
            <Text style={styles.questionText}>{item.title}</Text>
          </View>

          {/* 解答表示ボタン */}
          {!showAnswer && (
            <Pressable
              style={styles.showAnswerButton}
              onPress={handleShowAnswer}
              accessibilityLabel="解答・解説を確認する"
            >
              <Ionicons name="document-text-outline" size={20} color="#FF9900" />
              <Text style={styles.showAnswerButtonText}>解答・解説を確認する</Text>
              <Ionicons name="chevron-down" size={20} color="#FF9900" />
            </Pressable>
          )}

          {/* 解答・解説セクション */}
          {showAnswer && (
            <Animated.View
              style={[
                styles.answerSection,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              <View style={styles.answerHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.answerLabel}>解答・解説</Text>
              </View>
              <View style={styles.answerContent}>
                <Text style={styles.answerText}>{item.content}</Text>
              </View>
            </Animated.View>
          )}

          {/* スペーサー */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

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
    backgroundColor: '#FFFFFF',
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
    color: '#FB923C',
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

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },

  questionSection: {
    marginBottom: 24,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#FED7AA',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FB923C',
    marginLeft: 8,
  },
  questionText: {
    fontSize: 17,
    lineHeight: 28,
    color: '#111827',
    fontWeight: '500',
  },

  showAnswerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9900',
    gap: 8,
    marginBottom: 24,
  },
  showAnswerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9900',
  },

  answerSection: {
    marginBottom: 24,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#A7F3D0',
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 8,
  },
  answerContent: {
    backgroundColor: '#F0FDF4',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  answerText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
  },

  bottomSpacer: {
    height: 40,
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
    marginTop: 40,
  },
});
