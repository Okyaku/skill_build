import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getExistingCategories, DEFAULT_CATEGORY_SUGGESTIONS, ItemType } from '../utils/categories';
import { generateCategory } from '../services/gemini';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { supabase } from '../../lib/supabase';

interface CreateNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    content: string;
    item_type: ItemType;
    category: string;
  }) => Promise<void>;
}

export default function CreateNoteModal({
  visible,
  onClose,
  onSave,
}: CreateNoteModalProps): React.ReactElement {
  const { user } = useAuth();
  const { currentProjectId } = useProject();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [itemType, setItemType] = useState<ItemType>('term');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingCategory, setGeneratingCategory] = useState(false);

  // カテゴリ候補（既存 + デフォルト）
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (visible && user?.id && currentProjectId) {
      loadCategorySuggestions();
    }
  }, [visible, itemType, user?.id, currentProjectId]);

  const loadCategorySuggestions = async () => {
    if (!user?.id || !currentProjectId) return;

    const existing = await getExistingCategories(supabase, user.id, currentProjectId, itemType);
    const defaults = DEFAULT_CATEGORY_SUGGESTIONS[itemType];

    // 既存カテゴリを優先し、デフォルトを追加（重複除外）
    const combined = [...existing];
    defaults.forEach(def => {
      if (!combined.includes(def)) {
        combined.push(def);
      }
    });

    setCategorySuggestions(combined);
  };

  const handleItemTypeChange = (newType: ItemType) => {
    setItemType(newType);
    setCategory(''); // カテゴリをリセット
  };

  const handleGenerateCategory = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('ヒント', 'タイトルまたは内容を入力してからAI生成をお試しください');
      return;
    }

    setGeneratingCategory(true);
    try {
      const generated = await generateCategory(
        title.trim() || '無題',
        content.trim() || '',
        itemType
      );
      setCategory(generated);
    } catch (err: any) {
      console.error('[CreateNoteModal] カテゴリ生成エラー:', err);
      Alert.alert('エラー', 'カテゴリの生成に失敗しました');
    } finally {
      setGeneratingCategory(false);
    }
  };

  const handleSave = async () => {
    // バリデーション
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }
    if (!content.trim()) {
      Alert.alert('エラー', '内容を入力してください');
      return;
    }
    if (!category.trim()) {
      Alert.alert('エラー', 'カテゴリを入力またはAI生成してください');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        item_type: itemType,
        category: category.trim(),
      });

      // 成功したらリセット
      setTitle('');
      setContent('');
      setItemType('term');
      setCategory('');
    } catch (err) {
      console.error('[CreateNoteModal] 保存エラー:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  const getTypeLabel = (type: ItemType): string => {
    switch (type) {
      case 'term':
        return '📖 用語';
      case 'memo':
        return '📝 メモ';
      case 'question':
        return '❓ 問題';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>新規ノート作成</Text>
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              disabled={saving}
              accessibilityLabel="閉じる"
            >
              <Ionicons name="close" size={28} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* コンテンツ */}
          <ScrollView style={styles.content}>
            {/* 種別選択 */}
            <Text style={styles.label}>種別 *</Text>
            <View style={styles.typeSelector}>
              {(['term', 'memo', 'question'] as ItemType[]).map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeButton,
                    itemType === type && styles.typeButtonActive,
                  ]}
                  onPress={() => handleItemTypeChange(type)}
                  accessibilityLabel={getTypeLabel(type)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      itemType === type && styles.typeButtonTextActive,
                    ]}
                  >
                    {getTypeLabel(type)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* タイトル */}
            <Text style={styles.label}>タイトル *</Text>
            <TextInput
              style={styles.input}
              placeholder={
                itemType === 'term'
                  ? '例: 重要な用語'
                  : itemType === 'memo'
                  ? '例: 今日の学習メモ'
                  : '例: 過去問や練習問題'
              }
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              editable={!saving}
            />

            {/* 内容 */}
            <Text style={styles.label}>内容 *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={
                itemType === 'term'
                  ? '用語の意味や説明を入力...'
                  : itemType === 'memo'
                  ? 'メモの内容を入力...'
                  : '問題文と解答・解説を入力...'
              }
              placeholderTextColor="#9CA3AF"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              editable={!saving}
            />

            {/* カテゴリ */}
            <View style={styles.categoryHeader}>
              <Text style={styles.label}>カテゴリ *</Text>
              <Pressable
                style={styles.aiButton}
                onPress={handleGenerateCategory}
                disabled={generatingCategory || saving}
              >
                {generatingCategory ? (
                  <ActivityIndicator size="small" color="#FF9900" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#FF9900" />
                    <Text style={styles.aiButtonText}>AI生成</Text>
                  </>
                )}
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="カテゴリを入力（例: 基礎知識、過去問）"
              placeholderTextColor="#9CA3AF"
              value={category}
              onChangeText={setCategory}
              editable={!saving && !generatingCategory}
            />

            {/* カテゴリ候補 */}
            {categorySuggestions.length > 0 && (
              <>
                <Text style={styles.suggestionsLabel}>候補から選択:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScrollView}
                >
                  <View style={styles.categoryContainer}>
                    {categorySuggestions.map((cat) => (
                      <Pressable
                        key={cat}
                        style={[
                          styles.categoryChip,
                          category === cat && styles.categoryChipActive,
                        ]}
                        onPress={() => setCategory(cat)}
                        accessibilityLabel={cat}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            category === cat && styles.categoryChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </ScrollView>

          {/* フッター */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.button, styles.buttonCancel]}
              onPress={handleClose}
              disabled={saving}
              accessibilityLabel="キャンセル"
            >
              <Text style={styles.buttonTextCancel}>キャンセル</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.buttonSave,
                (saving || !title.trim() || !content.trim() || !category.trim()) && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || !title.trim() || !content.trim() || !category.trim()}
              accessibilityLabel="保存"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonTextSave}>保存</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },

  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  typeButtonActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FF9900',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FF9900',
  },

  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FF9900',
  },
  aiButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9900',
  },

  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 6,
  },
  categoryScrollView: {
    marginBottom: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  categoryChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#92400E',
  },

  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: '#F3F4F6',
  },
  buttonSave: {
    backgroundColor: '#FF9900',
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  buttonTextSave: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
