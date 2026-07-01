import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { TreeNode } from '../utils/treeBuilder';
import { getExistingCategories, DEFAULT_CATEGORY_SUGGESTIONS, ItemType } from '../utils/categories';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { supabase } from '../../lib/supabase';

interface NoteDetailModalProps {
  visible: boolean;
  node: TreeNode | null;
  onClose: () => void;
  onDelete?: (itemId: string) => void;
  onUpdate?: (itemId: string, updates: {
    title: string;
    content: string;
    category: string;
    item_type: string;
  }) => void;
  onEditMemo?: (noteId: string) => void;
}

export default function NoteDetailModal({ visible, node, onClose, onDelete, onUpdate, onEditMemo }: NoteDetailModalProps): React.ReactElement {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { currentProjectId } = useProject();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editItemType, setEditItemType] = useState<ItemType>('memo');

  // カテゴリ候補
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (node?.item) {
      setEditTitle(node.item.title);
      setEditContent(node.item.content);
      setEditCategory(node.item.category || '');
      setEditItemType(node.item.item_type as ItemType);
      setIsEditing(false);
    }
  }, [node]);

  useEffect(() => {
    if (visible && user?.id && currentProjectId) {
      loadCategorySuggestions();
    }
  }, [visible, editItemType, user?.id, currentProjectId]);

  const loadCategorySuggestions = async () => {
    if (!user?.id || !currentProjectId) return;

    const existing = await getExistingCategories(supabase, user.id, currentProjectId, editItemType);
    const defaults = DEFAULT_CATEGORY_SUGGESTIONS[editItemType];

    const combined = [...existing];
    defaults.forEach(def => {
      if (!combined.includes(def)) {
        combined.push(def);
      }
    });

    setCategorySuggestions(combined);
  };

  if (!node || !node.item) return <></>;

  const item = node.item;

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'term': return '📖 用語';
      case 'memo': return '📝 メモ';
      case 'question': return '❓ 問題';
      default: return '📄 ノート';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'term': return '#06B6D4';
      case 'memo': return '#34D399';
      case 'question': return '#FB923C';
      default: return '#94A3B8';
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'ノートを削除',
      '本当にこのノートを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            if (onDelete && item.id) {
              onDelete(item.id);
              onClose();
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSave = () => {
    if (!editTitle.trim() || !editContent.trim()) {
      Alert.alert('エラー', 'タイトルと内容を入力してください');
      return;
    }

    if (onUpdate && item.id) {
      onUpdate(item.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
        item_type: editItemType,
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(item.title);
    setEditContent(item.content);
    setEditCategory(item.category || 'その他');
    setEditItemType(item.item_type as ItemType);
    setIsEditing(false);
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.item_type) + '20' }]}>
                <Text style={[styles.typeBadgeText, { color: getTypeColor(item.item_type) }]}>
                  {getTypeLabel(item.item_type)}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="閉じる">
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          {/* コンテンツ */}
          <ScrollView style={styles.content}>
            {isEditing ? (
              <>
                <Text style={styles.label}>タイトル</Text>
                <TextInput
                  style={styles.input}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="タイトルを入力"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.label}>種別</Text>
                <View style={styles.typeSelector}>
                  {(['term', 'memo', 'question'] as ItemType[]).map((type) => (
                    <Pressable
                      key={type}
                      style={[
                        styles.typeSelectorButton,
                        editItemType === type && styles.typeSelectorButtonActive,
                      ]}
                      onPress={() => {
                        setEditItemType(type);
                        setEditCategory('');
                      }}
                    >
                      <Text
                        style={[
                          styles.typeSelectorText,
                          editItemType === type && styles.typeSelectorTextActive,
                        ]}
                      >
                        {getTypeLabel(type)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>カテゴリ</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="カテゴリを入力"
                  placeholderTextColor="#9CA3AF"
                  value={editCategory}
                  onChangeText={setEditCategory}
                />

                {categorySuggestions.length > 0 && (
                  <>
                    <Text style={styles.suggestionsLabel}>候補から選択:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.categorySelector}
                    >
                      {categorySuggestions.map((cat) => (
                        <Pressable
                          key={cat}
                          style={[
                            styles.categorySelectorChip,
                            editCategory === cat && styles.categorySelectorChipActive,
                          ]}
                          onPress={() => setEditCategory(cat)}
                        >
                          <Text
                            style={[
                              styles.categorySelectorText,
                              editCategory === cat && styles.categorySelectorTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                )}

                <Text style={styles.label}>内容</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="内容を入力"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />
              </>
            ) : (
              <>
                <Text style={styles.title}>{item.title}</Text>

                {item.folder_path && item.folder_path.length > 0 && (
                  <View style={styles.pathContainer}>
                    <Text style={styles.pathIcon}>📁</Text>
                    <Text style={styles.pathText} numberOfLines={2}>
                      {item.folder_path.join(' › ')}
                    </Text>
                  </View>
                )}

                {item.category && (
                  <View style={styles.categoryContainer}>
                    <View style={styles.categoryChip}>
                      <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.divider} />

                {/* リッチテキストの場合はHTMLレンダリング、そうでなければプレーンテキスト */}
                {item.content.includes('<') ? (
                  <RenderHtml
                    contentWidth={width - 80}
                    source={{ html: item.content }}
                    tagsStyles={{
                      body: { fontSize: 15, lineHeight: 24, color: '#374151' },
                      p: { marginVertical: 8 },
                      h1: { fontSize: 24, fontWeight: '700', marginVertical: 12 },
                      h2: { fontSize: 20, fontWeight: '700', marginVertical: 10 },
                      li: { marginVertical: 4 },
                    }}
                  />
                ) : (
                  <Text style={styles.contentText}>{item.content}</Text>
                )}

                <View style={styles.meta}>
                  <Text style={styles.metaText}>
                    作成日: {new Date(item.created_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {/* フッター */}
          <View style={styles.footer}>
            {isEditing ? (
              <>
                <Pressable
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={handleCancelEdit}
                  accessibilityLabel="キャンセル"
                >
                  <Text style={styles.buttonTextSecondary}>キャンセル</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleSave}
                  accessibilityLabel="保存"
                >
                  <Text style={styles.buttonTextPrimary}>保存</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[styles.button, styles.buttonDanger]}
                  onPress={handleDelete}
                  accessibilityLabel="削除"
                >
                  <Text style={styles.buttonTextDanger}>🗑️ 削除</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.buttonEdit]}
                  onPress={() => {
                    // メモの場合はNoteEditorに遷移
                    if (item.item_type === 'memo' && onEditMemo && item.id) {
                      onEditMemo(item.id);
                    } else {
                      // それ以外の場合はモーダル内で編集
                      setIsEditing(true);
                    }
                  }}
                  accessibilityLabel="編集"
                >
                  <Text style={styles.buttonTextEdit}>✏️ 編集</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={onClose}
                  accessibilityLabel="閉じる"
                >
                  <Text style={styles.buttonTextSecondary}>閉じる</Text>
                </Pressable>
              </>
            )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 24,
    color: '#9CA3AF',
    fontWeight: '300',
  },

  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
  },
  pathIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  pathText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 20,
  },
  meta: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 6,
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
  buttonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  buttonPrimary: {
    backgroundColor: '#FF9900',
  },
  buttonDanger: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  buttonEdit: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  buttonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  buttonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextDanger: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
  buttonTextEdit: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeSelectorButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeSelectorButtonActive: {
    backgroundColor: '#FF9900',
    borderColor: '#FF9900',
  },
  typeSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeSelectorTextActive: {
    color: '#FFFFFF',
  },
  categorySelector: {
    marginBottom: 12,
  },
  categorySelectorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  categorySelectorChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  categorySelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  categorySelectorTextActive: {
    color: '#92400E',
  },
});
