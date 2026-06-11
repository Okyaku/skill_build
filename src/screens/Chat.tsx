import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatProps } from '../navigation/MainTabs';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { supabase } from '../../lib/supabase';
import { generateAIResponse, analyzeNoteContent, NoteMetadata } from '../services/gemini';
import { useNavigation } from '@react-navigation/native';
import { getCategoriesByType } from '../utils/categories';

export interface ChatScreenProps {
  navigation: ChatProps['navigation'];
  route: ChatProps['route'];
}

interface ChatMessage {
  id: string;
  user_id: string;
  project_id: string;
  role: 'user' | 'assistant';
  content: string;
  chat_mode: 'study' | 'casual';
  created_at: string;
}

const SYSTEM_INSTRUCTIONS = {
  study: 'あなたはAWSクラウドプラクティショナーのプロ講師です。親切な挨拶や前置きは一切省き、ユーザーの質問に対して3〜4行の簡潔な解説、または3つ以内の短い箇条書きでズバッと回答してください。',
  casual: 'あなたはAWSの勉強を頑張るユーザーを応援する、気さくで優しいAIの先輩（または学習パートナー）です。AWSの専門的な解説は控えめにし、ユーザーの愚痴を聞いたり、モチベーションを高める楽しい雑談相手になってあげてください。日本語はフランクで親しみやすい口調にしてください。',
};

export default function Chat({}: ChatScreenProps): React.ReactElement {
  const { user, loading: authLoading } = useAuth();
  const { currentProjectId, currentProjectTitle } = useProject();
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<'study' | 'casual'>('study');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // ノート保存用のState
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [selectedAiResponse, setSelectedAiResponse] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<string>('その他');
  const [noteItemType, setNoteItemType] = useState<NoteMetadata['item_type']>('term');
  const [savingNote, setSavingNote] = useState(false);
  const [analyzingNote, setAnalyzingNote] = useState(false);

  const currentCategories = getCategoriesByType(noteItemType);

  useEffect(() => {
    if (!user?.id || !currentProjectId) {
      setLoadingMessages(false);
      return;
    }

    const loadMessages = async () => {
      await fetchMessages();
      setLoadingMessages(false);
    };

    void loadMessages();
  }, [user?.id, currentProjectId, mode]);

  const handleSendMessage = async () => {
    if (!user?.id || !currentProjectId || !message.trim()) {
      setMessage('');
      return;
    }

    const userMessage = message.trim();
    setMessage('');
    setSending(true);

    try {

      // 2. ユーザーメッセージをSupabaseに保存
      const { data: userMessageData, error: userError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          project_id: currentProjectId,
          role: 'user',
          content: userMessage,
          chat_mode: mode,
        })
        .select()
        .single();

      if (userError) {
        console.error('[Chat] ユーザーメッセージ送信エラー:', {
          message: userError.message,
          details: userError.details,
          hint: userError.hint,
          code: userError.code,
        });
        alert('メッセージの送信に失敗しました。');
        setSending(false);
        return;
      }

      console.log('[Chat] ユーザーメッセージ送信成功:', userMessageData.id);

      // 3. 画面を更新してユーザーメッセージを表示
      await fetchMessages();
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      setSending(false);
      setAiThinking(true);

      // 4. AI応答を生成
      try {
        const systemInstruction = SYSTEM_INSTRUCTIONS[mode];
        const aiResponse = await generateAIResponse(userMessage, systemInstruction);

        // 5. AI応答をSupabaseに保存
        const { data: aiMessageData, error: aiError } = await supabase
          .from('chat_messages')
          .insert({
            user_id: user.id,
            project_id: currentProjectId,
            role: 'assistant',
            content: aiResponse,
            chat_mode: mode,
          })
          .select()
          .single();

        if (aiError) {
          console.error('[Chat] AI応答保存エラー:', {
            message: aiError.message,
            details: aiError.details,
            hint: aiError.hint,
            code: aiError.code,
          });
          alert('AI応答の保存に失敗しました。');
        } else {
          console.log('[Chat] AI応答保存成功:', aiMessageData.id);

          // 6. 画面を更新してAI応答を表示
          await fetchMessages();
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      } catch (aiErr: any) {
        console.error('[Chat] AI応答生成例外:', aiErr);
        alert(`AI応答の生成に失敗しました: ${aiErr?.message || '不明なエラー'}`);
      } finally {
        setAiThinking(false);
      }
    } catch (err) {
      console.error('[Chat] メッセージ送信例外:', err);
      alert('予期しないエラーが発生しました。');
      setSending(false);
      setAiThinking(false);
    }
  };

  const fetchMessages = async () => {
    if (!user?.id || !currentProjectId) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', currentProjectId)
        .eq('chat_mode', mode)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Chat] メッセージ取得エラー:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      } else if (data) {
        console.log('[Chat] メッセージ取得成功:', data.length, '件');
        setMessages(data);
      }
    } catch (err) {
      console.error('[Chat] メッセージ取得例外:', err);
    }
  };

  const handleModeChange = (newMode: 'study' | 'casual') => {
    if (newMode === mode) return;
    setMode(newMode);
    setMessages([]);
  };

  const handleSaveToNote = async (aiResponseText: string) => {
    setSelectedAiResponse(aiResponseText);
    setAnalyzingNote(true);

    try {
      const metadata = await analyzeNoteContent(aiResponseText);
      setNoteTitle(metadata.title);
      setNoteCategory(metadata.category);
      setNoteItemType(metadata.item_type);
    } catch (err) {
      console.error('[Chat] ノート解析エラー:', err);
      // エラー時はデフォルト値を設定
      setNoteTitle('');
      setNoteCategory('その他');
      setNoteItemType('term');
    } finally {
      setAnalyzingNote(false);
      setSaveModalVisible(true);
    }
  };

  const handleItemTypeChange = (newType: NoteMetadata['item_type']) => {
    setNoteItemType(newType);
    // 種別が変わったらカテゴリをその種別の最初のカテゴリにリセット
    const categories = getCategoriesByType(newType);
    setNoteCategory(categories[0] || 'その他');
  };

  const handleSaveNote = async () => {
    if (!user?.id || !currentProjectId || !noteTitle.trim() || !selectedAiResponse.trim()) {
      Alert.alert('エラー', 'タイトルと内容を入力してください');
      return;
    }

    setSavingNote(true);

    try {
      const { error } = await supabase
        .from('study_items')
        .insert({
          user_id: user.id,
          project_id: currentProjectId,
          item_type: noteItemType,
          title: noteTitle.trim(),
          content: selectedAiResponse.trim(),
          category: noteCategory,
        });

      if (error) {
        console.error('[Chat] ノート保存エラー:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        Alert.alert('エラー', 'ノートの保存に失敗しました');
      } else {
        console.log('[Chat] ノート保存成功');
        Alert.alert('成功', 'ノートに保存しました');
        setSaveModalVisible(false);
        setNoteTitle('');
        setNoteCategory('その他');
        setNoteItemType('term');
        setSelectedAiResponse('');
      }
    } catch (err) {
      console.error('[Chat] ノート保存例外:', err);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    } finally {
      setSavingNote(false);
    }
  };

  if (authLoading || loadingMessages) {
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
          onPress={() => navigation.navigate('ProjectList')}
          accessibilityLabel="プロジェクト一覧に戻る"
        >
          <Ionicons name="chevron-back" size={28} color="#374151" />
          <Text style={styles.backButtonLabel}>プロジェクト</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{currentProjectTitle || 'チャット'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* トグル */}
      <View style={styles.toggleWrap}>
        <View style={styles.toggleInner}>
          <Pressable
            style={[styles.toggleButton, mode === 'study' && styles.toggleActive]}
            onPress={() => handleModeChange('study')}
            accessibilityLabel="学習モード"
          >
            <Text style={[styles.toggleText, mode === 'study' && styles.toggleTextActive]}>📝 学習</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, mode === 'casual' && styles.toggleActive]}
            onPress={() => handleModeChange('casual')}
            accessibilityLabel="雑談モード"
          >
            <Text style={[styles.toggleText, mode === 'casual' && styles.toggleTextActive]}>💬 雑談</Text>
          </Pressable>
        </View>
      </View>

      {/* メイン */}
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        {messages.length === 0 && !aiThinking ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>メッセージがありません</Text>
            <Text style={styles.emptySubText}>質問を入力して会話を始めましょう</Text>
          </View>
        ) : (
          <>
            {messages.map((msg) => {
              if (msg.role === 'assistant') {
                return (
                  <View key={msg.id} style={styles.aiRow}>
                    <View style={styles.aiBubble}>
                      <Text style={styles.aiText}>{msg.content}</Text>
                    </View>
                    <Pressable
                      style={[styles.saveButton, analyzingNote && styles.saveButtonDisabled]}
                      onPress={() => handleSaveToNote(msg.content)}
                      disabled={analyzingNote}
                      accessibilityLabel="ノートに保存"
                    >
                      {analyzingNote ? (
                        <View style={styles.analyzingContainer}>
                          <ActivityIndicator size="small" color="#FF9900" />
                          <Text style={styles.analyzingText}>AI整理中...</Text>
                        </View>
                      ) : (
                        <Text style={styles.saveButtonText}>📝 ノートに保存</Text>
                      )}
                    </Pressable>
                  </View>
                );
              } else {
                return (
                  <View key={msg.id} style={styles.userRow}>
                    <View style={styles.userBubble}>
                      <Text style={styles.userText}>{msg.content}</Text>
                    </View>
                  </View>
                );
              }
            })}
            {aiThinking && (
              <View style={styles.aiRow}>
                <View style={styles.aiBubble}>
                  <View style={styles.thinkingContainer}>
                    <ActivityIndicator size="small" color="#FF9900" />
                    <Text style={styles.thinkingText}>AIが入力中...</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* フッター */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.footer}>
          <TextInput
            style={styles.input}
            placeholder="メッセージを入力..."
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            editable={!sending && !aiThinking}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          <Pressable
            style={[styles.sendButton, (sending || aiThinking) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={sending || aiThinking || !message.trim()}
            accessibilityLabel="送信"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendText}>送信</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* ノート保存モーダル */}
      <Modal
        visible={saveModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ノートに保存</Text>
              <Pressable onPress={() => setSaveModalVisible(false)} accessibilityLabel="閉じる">
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.label}>ノートの種類 *</Text>
              <View style={styles.typeSelector}>
                <Pressable
                  style={[styles.typeButton, noteItemType === 'term' && styles.typeButtonActive]}
                  onPress={() => handleItemTypeChange('term')}
                  accessibilityLabel="用語"
                >
                  <Text style={[styles.typeButtonText, noteItemType === 'term' && styles.typeButtonTextActive]}>
                    📖 用語
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.typeButton, noteItemType === 'memo' && styles.typeButtonActive]}
                  onPress={() => handleItemTypeChange('memo')}
                  accessibilityLabel="メモ"
                >
                  <Text style={[styles.typeButtonText, noteItemType === 'memo' && styles.typeButtonTextActive]}>
                    📝 メモ
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.typeButton, noteItemType === 'question' && styles.typeButtonActive]}
                  onPress={() => handleItemTypeChange('question')}
                  accessibilityLabel="問題"
                >
                  <Text style={[styles.typeButtonText, noteItemType === 'question' && styles.typeButtonTextActive]}>
                    ❓ 問題
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.label}>カテゴリ *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScrollView}
              >
                <View style={styles.categoryGrid}>
                  {currentCategories?.map((category) => (
                    <Pressable
                      key={category}
                      style={[styles.categoryChip, noteCategory === category && styles.categoryChipActive]}
                      onPress={() => setNoteCategory(category)}
                      accessibilityLabel={category}
                    >
                      <Text style={[styles.categoryChipText, noteCategory === category && styles.categoryChipTextActive]}>
                        {category}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>タイトル *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="例: VPC"
                placeholderTextColor="#9CA3AF"
                value={noteTitle}
                onChangeText={setNoteTitle}
              />

              <Text style={styles.label}>内容 *</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                placeholder="ノートの内容"
                placeholderTextColor="#9CA3AF"
                value={selectedAiResponse}
                onChangeText={setSelectedAiResponse}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setSaveModalVisible(false)}
                accessibilityLabel="キャンセル"
              >
                <Text style={styles.modalButtonTextCancel}>キャンセル</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  (savingNote || !noteTitle.trim() || !selectedAiResponse.trim()) && styles.modalButtonDisabled
                ]}
                onPress={handleSaveNote}
                disabled={savingNote || !noteTitle.trim() || !selectedAiResponse.trim()}
                accessibilityLabel="保存"
              >
                {savingNote ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>保存</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
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
  toggleWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  toggleInner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: '#FFFBF2' },
  toggleText: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
  toggleTextActive: { color: '#FF9900' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  aiRow: { alignItems: 'flex-start', marginTop: 12 },
  aiBubble: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    borderRadius: 12,
    maxWidth: '85%'
  },
  aiText: { color: '#374151', fontSize: 14, lineHeight: 20 },
  chipsRow: { marginTop: 8, flexDirection: 'row' },
  chip: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  chipText: { color: '#6B7280', fontSize: 12 },

  userRow: { alignItems: 'flex-end', marginTop: 16 },
  userBubble: { backgroundColor: '#FF9900', padding: 12, borderRadius: 12, maxWidth: '75%' },
  userText: { color: '#FFFFFF', fontSize: 14 },

  footer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFFFFF' },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
    color: '#111827',
  },
  sendButton: { marginLeft: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FF9900' },
  sendButtonDisabled: { backgroundColor: '#D1D5DB' },
  sendText: { color: '#FFFFFF', fontWeight: '700' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#9CA3AF' },

  thinkingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { color: '#6B7280', fontSize: 14, fontStyle: 'italic' },

  saveButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignSelf: 'flex-start',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  analyzingContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  analyzingText: { fontSize: 12, color: '#FF9900', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  modalClose: { fontSize: 24, color: '#9CA3AF', fontWeight: '300' },
  modalContent: { paddingHorizontal: 20, paddingVertical: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  modalInputMultiline: { minHeight: 120, paddingTop: 12 },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#F3F4F6' },
  modalButtonSave: { backgroundColor: '#FF9900' },
  modalButtonDisabled: { backgroundColor: '#D1D5DB' },
  modalButtonTextCancel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  modalButtonTextSave: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
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

  categoryScrollView: {
    marginBottom: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  categoryChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FF9900',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FF9900',
  },
});
