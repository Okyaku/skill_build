import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProjectListProps } from '../../App';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { supabase } from '../../lib/supabase';

export interface ProjectListScreenProps {
  navigation: ProjectListProps['navigation'];
}

interface Project {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export default function ProjectList({ navigation }: ProjectListScreenProps): React.ReactElement {
  const { user, loading: authLoading, signOut } = useAuth();
  const { setCurrentProject } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editProjectTitle, setEditProjectTitle] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchProjects();
  }, [user?.id]);

  const fetchProjects = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ProjectList] プロジェクト取得エラー:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      } else if (data) {
        console.log('[ProjectList] プロジェクト取得成功:', data.length, '件');
        setProjects(data);
      }
    } catch (err) {
      console.error('[ProjectList] プロジェクト取得例外:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project.id, project.title);
    navigation.navigate('MainTabs', {
      projectId: project.id,
      projectTitle: project.title,
    });
  };

  const handleCreateProject = async () => {
    if (!user?.id || !newProjectTitle.trim()) {
      Alert.alert('エラー', 'プロジェクト名を入力してください');
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: newProjectTitle.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error('[ProjectList] プロジェクト作成エラー:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        Alert.alert('エラー', 'プロジェクトの作成に失敗しました');
      } else if (data) {
        console.log('[ProjectList] プロジェクト作成成功:', data.id);
        setModalVisible(false);
        setNewProjectTitle('');
        await fetchProjects();
        Alert.alert('成功', 'プロジェクトを作成しました');
      }
    } catch (err) {
      console.error('[ProjectList] プロジェクト作成例外:', err);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = (project: Project) => {
    Alert.alert(
      'プロジェクトを削除',
      `「${project.title}」を削除しますか？\n\nこのプロジェクトに含まれるすべてのノート、チャット履歴も削除されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;

            try {
              console.log('[ProjectList] プロジェクト削除開始:', {
                projectId: project.id,
                projectTitle: project.title,
                userId: user.id,
              });

              // まず、プロジェクトが本当に自分のものか確認
              const { data: verifyData, error: verifyError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', project.id)
                .single();

              console.log('[ProjectList] プロジェクト検証結果:', {
                verifyData,
                verifyError,
                userIdMatch: verifyData?.user_id === user.id,
              });

              if (verifyError || !verifyData) {
                Alert.alert('エラー', 'プロジェクトが見つかりません');
                return;
              }

              if (verifyData.user_id !== user.id) {
                Alert.alert('エラー', 'このプロジェクトを削除する権限がありません');
                return;
              }

              // 1. 関連するstudy_itemsを削除
              const { error: studyItemsError, count: studyItemsCount } = await supabase
                .from('study_items')
                .delete({ count: 'exact' })
                .eq('project_id', project.id)
                .eq('user_id', user.id);

              console.log('[ProjectList] study_items削除結果:', {
                error: studyItemsError,
                count: studyItemsCount,
              });

              if (studyItemsError) {
                console.error('[ProjectList] study_items削除エラー:', studyItemsError);
              }

              // 2. 関連するchat_messagesを削除
              const { error: chatError, count: chatCount } = await supabase
                .from('chat_messages')
                .delete({ count: 'exact' })
                .eq('project_id', project.id)
                .eq('user_id', user.id);

              console.log('[ProjectList] chat_messages削除結果:', {
                error: chatError,
                count: chatCount,
              });

              if (chatError) {
                console.error('[ProjectList] chat_messages削除エラー:', chatError);
              }

              // 3. プロジェクト本体を削除
              const { error: projectError, data: deletedData, count: projectCount } = await supabase
                .from('projects')
                .delete({ count: 'exact' })
                .eq('id', project.id)
                .eq('user_id', user.id)
                .select();

              console.log('[ProjectList] プロジェクト削除結果:', {
                error: projectError,
                deletedData,
                count: projectCount,
              });

              if (projectError) {
                console.error('[ProjectList] プロジェクト削除エラー:', {
                  message: projectError.message,
                  details: projectError.details,
                  hint: projectError.hint,
                  code: projectError.code,
                });
                Alert.alert('エラー', `プロジェクトの削除に失敗しました: ${projectError.message}`);
                return;
              }

              // 削除件数を確認
              if (!deletedData || deletedData.length === 0) {
                console.error('[ProjectList] プロジェクトが削除されませんでした（0件）');
                console.error('[ProjectList] これはSupabaseのRLSポリシーの問題の可能性があります');

                // RLSを確認するため、プロジェクトが存在するか確認
                const { data: checkData } = await supabase
                  .from('projects')
                  .select('*')
                  .eq('id', project.id);

                console.log('[ProjectList] プロジェクト存在確認:', checkData);

                // 警告を表示するが、ローカルからは削除
                Alert.alert(
                  '警告',
                  'データベースから削除できませんでした。Supabaseの権限設定（RLS）を確認してください。\n\n画面からは削除します。',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // ローカルからは削除
                        setProjects(prevProjects => prevProjects.filter(p => p.id !== project.id));
                      }
                    }
                  ]
                );
                return;
              }

              console.log('[ProjectList] プロジェクト削除成功:', project.id);

              // 即座にローカルstateから削除して画面を更新
              setProjects(prevProjects => prevProjects.filter(p => p.id !== project.id));

              // サーバーからも再取得して確実に同期
              setTimeout(() => {
                fetchProjects();
              }, 500);

              Alert.alert('成功', 'プロジェクトを削除しました');
            } catch (err) {
              console.error('[ProjectList] プロジェクト削除例外:', err);
              Alert.alert('エラー', '予期しないエラーが発生しました');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleOpenActionMenu = (project: Project) => {
    setSelectedProject(project);
    setActionMenuVisible(true);
  };

  const handleCloseActionMenu = () => {
    setActionMenuVisible(false);
    setSelectedProject(null);
  };

  const handleEditProject = () => {
    if (!selectedProject) return;
    setEditProjectTitle(selectedProject.title);
    setActionMenuVisible(false);
    setEditModalVisible(true);
  };

  const handleUpdateProject = async () => {
    if (!user?.id || !selectedProject || !editProjectTitle.trim()) {
      Alert.alert('エラー', 'プロジェクト名を入力してください');
      return;
    }

    console.log('[ProjectList] プロジェクト更新開始:', {
      projectId: selectedProject.id,
      oldTitle: selectedProject.title,
      newTitle: editProjectTitle.trim(),
      userId: user.id,
    });

    setUpdating(true);

    try {
      const { data, error, count } = await supabase
        .from('projects')
        .update({ title: editProjectTitle.trim() })
        .eq('id', selectedProject.id)
        .eq('user_id', user.id)
        .select();

      console.log('[ProjectList] プロジェクト更新結果:', {
        data,
        error,
        count,
        updatedCount: data?.length,
      });

      if (error) {
        console.error('[ProjectList] プロジェクト更新エラー:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        Alert.alert('エラー', `プロジェクト名の更新に失敗しました: ${error.message}`);
      } else if (!data || data.length === 0) {
        console.error('[ProjectList] プロジェクトが更新されませんでした（0件）');
        console.error('[ProjectList] これはSupabaseのRLSポリシーの問題の可能性があります');
        Alert.alert(
          'エラー',
          'プロジェクト名を更新できませんでした。\n\nSupabaseの権限設定（RLS）を確認してください。'
        );
      } else {
        console.log('[ProjectList] プロジェクト更新成功:', data[0]);

        // 即座にローカルstateを更新
        setProjects(prevProjects =>
          prevProjects.map(p =>
            p.id === selectedProject.id ? { ...p, title: editProjectTitle.trim() } : p
          )
        );

        setEditModalVisible(false);
        setSelectedProject(null);
        setEditProjectTitle('');

        // サーバーからも再取得
        await fetchProjects();

        Alert.alert('成功', 'プロジェクト名を更新しました');
      }
    } catch (err) {
      console.error('[ProjectList] プロジェクト更新例外:', err);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteFromMenu = () => {
    if (!selectedProject) return;
    setActionMenuVisible(false);
    // 少し遅延させてアニメーションが完了してから削除確認を表示
    setTimeout(() => {
      handleDeleteProject(selectedProject);
    }, 300);
  };

  const handleSignOut = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ],
      { cancelable: true }
    );
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
      <View style={styles.container}>
        {/* カスタムヘッダー */}
        <View style={styles.header}>
          <Pressable
            style={styles.logoutButton}
            onPress={handleSignOut}
            accessibilityLabel="ログアウト"
          >
            <Ionicons name="log-out-outline" size={24} color="#6B7280" />
          </Pressable>
          <Text style={styles.headerTitle}>プロジェクト一覧</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            accessibilityLabel="プロジェクト追加"
          >
            <Ionicons name="add-circle-outline" size={28} color="#FF9900" />
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          {projects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>プロジェクトがありません</Text>
              <Text style={styles.emptySubText}>右上の「+」ボタンから新規作成できます</Text>
            </View>
          ) : (
            projects.map((project) => (
              <View key={project.id} style={styles.cardWrapper}>
                <Pressable
                  style={styles.card}
                  onPress={() => handleSelectProject(project)}
                  accessibilityLabel={`${project.title} プロジェクトを選択`}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{project.title}</Text>
                      <Text style={styles.projectDate}>
                        作成日: {new Date(project.created_at).toLocaleDateString('ja-JP')}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.menuButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenActionMenu(project);
                      }}
                      accessibilityLabel={`${project.title} のメニューを開く`}
                    >
                      <Ionicons name="ellipsis-vertical" size={22} color="#6B7280" />
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>

        {/* 新規プロジェクト作成モーダル */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>新規プロジェクト作成</Text>
                <Pressable onPress={() => setModalVisible(false)} accessibilityLabel="閉じる">
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
              </View>

              <View style={styles.modalContent}>
                <Text style={styles.label}>プロジェクト名 *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="例: AWS クラウドプラクティショナー"
                  placeholderTextColor="#9CA3AF"
                  value={newProjectTitle}
                  onChangeText={setNewProjectTitle}
                  autoFocus
                />
              </View>

              <View style={styles.modalFooter}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setModalVisible(false);
                    setNewProjectTitle('');
                  }}
                  accessibilityLabel="キャンセル"
                >
                  <Text style={styles.modalButtonTextCancel}>キャンセル</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalButton,
                    styles.modalButtonSave,
                    (creating || !newProjectTitle.trim()) && styles.modalButtonDisabled
                  ]}
                  onPress={handleCreateProject}
                  disabled={creating || !newProjectTitle.trim()}
                  accessibilityLabel="作成"
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalButtonTextSave}>作成</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* アクションメニュー */}
        <Modal
          visible={actionMenuVisible}
          animationType="fade"
          transparent
          onRequestClose={handleCloseActionMenu}
        >
          <Pressable style={styles.actionMenuOverlay} onPress={handleCloseActionMenu}>
            <View style={styles.actionMenuContainer}>
              <View style={styles.actionMenuContent}>
                <Text style={styles.actionMenuTitle}>
                  {selectedProject?.title}
                </Text>

                <Pressable
                  style={styles.actionMenuItem}
                  onPress={handleEditProject}
                  accessibilityLabel="プロジェクト名を編集"
                >
                  <Ionicons name="pencil-outline" size={20} color="#374151" />
                  <Text style={styles.actionMenuItemText}>プロジェクト名を編集</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionMenuItem, styles.actionMenuItemDanger]}
                  onPress={handleDeleteFromMenu}
                  accessibilityLabel="プロジェクトを削除"
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.actionMenuItemText, styles.actionMenuItemTextDanger]}>
                    プロジェクトを削除
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.actionMenuCancel}
                  onPress={handleCloseActionMenu}
                  accessibilityLabel="キャンセル"
                >
                  <Text style={styles.actionMenuCancelText}>キャンセル</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* 編集モーダル */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>プロジェクト名を編集</Text>
                <Pressable
                  onPress={() => setEditModalVisible(false)}
                  accessibilityLabel="閉じる"
                >
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
              </View>

              <View style={styles.modalContent}>
                <Text style={styles.label}>プロジェクト名 *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="プロジェクト名を入力"
                  placeholderTextColor="#9CA3AF"
                  value={editProjectTitle}
                  onChangeText={setEditProjectTitle}
                  autoFocus
                />
              </View>

              <View style={styles.modalFooter}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setEditModalVisible(false)}
                  accessibilityLabel="キャンセル"
                >
                  <Text style={styles.modalButtonTextCancel}>キャンセル</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalButton,
                    styles.modalButtonSave,
                    (updating || !editProjectTitle.trim()) && styles.modalButtonDisabled
                  ]}
                  onPress={handleUpdateProject}
                  disabled={updating || !editProjectTitle.trim()}
                  accessibilityLabel="保存"
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalButtonTextSave}>保存</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    paddingHorizontal: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  logoutButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { marginTop: 16 },
  cardWrapper: {
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  progressWrap: { gap: 8 },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF9900',
  },
  progressText: { marginTop: 8, color: '#6B7280', fontSize: 13 },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: '#B91C1C', fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },

  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#9CA3AF' },

  projectDate: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalClose: {
    fontSize: 24,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonSave: {
    backgroundColor: '#FF9900',
  },
  modalButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalButtonTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonTextSave: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  actionMenuContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  actionMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    gap: 12,
  },
  actionMenuItemDanger: {
    backgroundColor: '#FEE2E2',
  },
  actionMenuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  actionMenuItemTextDanger: {
    color: '#EF4444',
  },
  actionMenuCancel: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  actionMenuCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
