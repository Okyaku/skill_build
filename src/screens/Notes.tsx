import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NotesProps } from "../navigation/MainTabs";
import { useAuth } from "../../contexts/AuthContext";
import { useProject } from "../../contexts/ProjectContext";
import { supabase } from "../../lib/supabase";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import FileCard from "../components/FileCard";
import NoteDetailModal from "../components/NoteDetailModal";
import QuizExecutionModal from "../components/QuizExecutionModal";
import ExamQuestionModal from "../components/ExamQuestionModal";
import CreateNoteModal from "../components/CreateNoteModal";
import { ItemType } from "../utils/categories";

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

type ItemTypeFilter = "all" | "term" | "memo" | "question";

export interface NotesScreenProps {
  navigation: NotesProps["navigation"];
  route: NotesProps["route"];
}

export default function Notes({}: NotesScreenProps): React.ReactElement {
  const { user, loading: authLoading } = useAuth();
  const { currentProjectId, currentProjectTitle } = useProject();
  const navigation = useNavigation<any>();

  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<StudyItem[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // フィルター
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // 全カテゴリを動的に取得（重複除外）
  const allCategories = React.useMemo(() => {
    const categorySet = new Set<string>();
    notes.forEach((note) => {
      if (note.category) {
        // item_typeフィルターが適用されている場合は、そのタイプのカテゴリのみ
        if (itemTypeFilter === "all" || note.item_type === itemTypeFilter) {
          categorySet.add(note.category);
        }
      }
    });
    return Array.from(categorySet).sort();
  }, [notes, itemTypeFilter]);

  // モーダル関連
  const [selectedNote, setSelectedNote] = useState<StudyItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [examModalVisible, setExamModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || !currentProjectId) {
        setLoadingNotes(false);
        return;
      }

      fetchNotes();
    }, [user?.id, currentProjectId]),
  );

  const fetchNotes = async () => {
    if (!user?.id || !currentProjectId) return;

    try {
      setLoadingNotes(true);
      const { data, error } = await supabase
        .from("study_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("project_id", currentProjectId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Notes] ノート取得エラー:", error);
      } else if (data) {
        console.log("[Notes] ノート取得成功:", data.length, "件");
        setNotes(data);
      }
    } catch (err) {
      console.error("[Notes] ノート取得例外:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleNotePress = (note: StudyItem) => {
    console.log("[Notes] カードタップ:", {
      item_type: note.item_type,
      title: note.title,
    });

    // タイプに応じてモーダルまたは画面を切り替え
    if (note.item_type === "term") {
      // 📖 用語 → NoteDetailModal（用語と意味をすぐに表示）
      console.log(
        "[Notes] NoteDetailModal（詳細表示）を開きます - item_type:",
        note.item_type,
      );
      setSelectedNote(note);
      setDetailModalVisible(true);
    } else if (note.item_type === "question") {
      // ❓ 問題 → ExamQuestionModal（左寄せドキュメント形式、実戦問題）
      console.log(
        "[Notes] ExamQuestionModal（実戦問題）を開きます - item_type:",
        note.item_type,
      );
      if (note.item_type !== "question") {
        console.error(
          "[Notes] エラー: questionではないデータがExamQuestionModalに渡されそうになりました",
          note,
        );
        Alert.alert("エラー", "この種別のノートは実戦問題で開けません");
        return;
      }
      setSelectedNote(note);
      setExamModalVisible(true);
    } else if (note.item_type === "memo") {
      // 📝 メモ → NoteDetailModal（詳細表示、削除・編集・閉じる機能付き）
      console.log(
        "[Notes] NoteDetailModal（詳細表示）を開きます - item_type:",
        note.item_type,
      );
      setSelectedNote(note);
      setDetailModalVisible(true);
    } else {
      // 想定外の種別
      console.error("[Notes] 想定外のitem_type:", note.item_type, note);
      Alert.alert("エラー", "不明な種別のノートです");
    }
  };

  const handleDeleteNote = async (itemId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("study_items")
        .delete()
        .eq("id", itemId)
        .eq("user_id", user.id);

      if (error) {
        console.error("[Notes] 削除エラー:", error);
        alert("削除に失敗しました");
      } else {
        console.log("[Notes] ノート削除成功:", itemId);
        fetchNotes();
      }
    } catch (err) {
      console.error("[Notes] 削除例外:", err);
      alert("削除に失敗しました");
    }
  };

  const handleUpdateNote = async (
    itemId: string,
    updates: {
      title: string;
      content: string;
      category: string;
      item_type: string;
    },
  ) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("study_items")
        .update({
          title: updates.title,
          content: updates.content,
          category: updates.category,
          item_type: updates.item_type,
        })
        .eq("id", itemId)
        .eq("user_id", user.id);

      if (error) {
        console.error("[Notes] 更新エラー:", error);
        alert("更新に失敗しました");
      } else {
        console.log("[Notes] ノート更新成功:", itemId);
        fetchNotes();
      }
    } catch (err) {
      console.error("[Notes] 更新例外:", err);
      alert("更新に失敗しました");
    }
  };

  const handleCreateNote = async (data: {
    title: string;
    content: string;
    item_type: ItemType;
    category: string;
  }) => {
    if (!user?.id || !currentProjectId) {
      Alert.alert(
        "エラー",
        "ユーザー情報またはプロジェクト情報が取得できませんでした",
      );
      return;
    }

    try {
      const { error } = await supabase.from("study_items").insert({
        user_id: user.id,
        project_id: currentProjectId,
        item_type: data.item_type,
        title: data.title,
        content: data.content,
        category: data.category,
      });

      if (error) {
        console.error("[Notes] ノート作成エラー:", error);
        Alert.alert("エラー", "ノートの作成に失敗しました");
        throw error;
      } else {
        console.log("[Notes] ノート作成成功");
        Alert.alert("成功", "ノートを作成しました");
        setCreateModalVisible(false);
        fetchNotes();
      }
    } catch (err) {
      console.error("[Notes] ノート作成例外:", err);
      throw err;
    }
  };

  const handleItemTypeChange = (newType: ItemTypeFilter) => {
    setItemTypeFilter(newType);
    // 種別が変わったらカテゴリフィルタをリセット
    setCategoryFilter("all");
  };

  // フィルタリングロジック
  const getFilteredNotes = (): StudyItem[] => {
    let filtered = notes;

    // データ検証: item_typeが正しい値であることを確認
    filtered = filtered.filter((note) => {
      if (
        !note.item_type ||
        !["term", "memo", "question"].includes(note.item_type)
      ) {
        console.warn("[Notes] 不正なitem_typeを検出:", note);
        return false;
      }
      return true;
    });

    // アイテム種別フィルタ
    if (itemTypeFilter !== "all") {
      filtered = filtered.filter((note) => note.item_type === itemTypeFilter);
    }

    // カテゴリフィルタ
    if (categoryFilter !== "all") {
      filtered = filtered.filter((note) => note.category === categoryFilter);
    }

    // 検索フィルタ
    if (query.trim() !== "") {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(lowerQuery) ||
          note.content.toLowerCase().includes(lowerQuery),
      );
    }

    return filtered;
  };

  const filteredNotes = getFilteredNotes();

  // TreeNode形式に変換（FileCardとの互換性のため）
  const notesToTreeNodes = (notes: StudyItem[]) => {
    return notes.map((note) => ({
      name: note.title,
      type: "file" as const,
      path: [],
      children: [],
      item: note,
    }));
  };

  if (authLoading || loadingNotes) {
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
        {/* ヘッダー */}
        <View style={styles.headerContainer}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="プロジェクト一覧に戻る"
          >
            <Ionicons name="chevron-back" size={28} color="#374151" />
            <Text style={styles.backButtonLabel}>プロジェクト</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentProjectTitle || "ノート"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* 第1軸: アイテム種別フィルタ */}
        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <Pressable
              style={[
                styles.typeTab,
                itemTypeFilter === "all" && styles.typeTabActive,
              ]}
              onPress={() => handleItemTypeChange("all")}
            >
              <Text
                style={[
                  styles.typeTabText,
                  itemTypeFilter === "all" && styles.typeTabTextActive,
                ]}
              >
                すべて
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.typeTab,
                itemTypeFilter === "term" && styles.typeTabActive,
              ]}
              onPress={() => handleItemTypeChange("term")}
            >
              <Text
                style={[
                  styles.typeTabText,
                  itemTypeFilter === "term" && styles.typeTabTextActive,
                ]}
              >
                📖 用語
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.typeTab,
                itemTypeFilter === "memo" && styles.typeTabActive,
              ]}
              onPress={() => handleItemTypeChange("memo")}
            >
              <Text
                style={[
                  styles.typeTabText,
                  itemTypeFilter === "memo" && styles.typeTabTextActive,
                ]}
              >
                📝 メモ
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.typeTab,
                itemTypeFilter === "question" && styles.typeTabActive,
              ]}
              onPress={() => handleItemTypeChange("question")}
            >
              <Text
                style={[
                  styles.typeTabText,
                  itemTypeFilter === "question" && styles.typeTabTextActive,
                ]}
              >
                ❓ 問題
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 第2軸: カテゴリフィルタ（動的に切り替わる） */}
        <View style={styles.categorySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            <Pressable
              style={[
                styles.categoryChip,
                categoryFilter === "all" && styles.categoryChipActive,
              ]}
              onPress={() => setCategoryFilter("all")}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  categoryFilter === "all" && styles.categoryChipTextActive,
                ]}
              >
                すべて
              </Text>
            </Pressable>
            {allCategories.map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.categoryChip,
                  categoryFilter === category && styles.categoryChipActive,
                ]}
                onPress={() => setCategoryFilter(category)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    categoryFilter === category &&
                      styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* 検索バー */}
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 検索..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            accessible
            accessibilityLabel="検索"
          />
        </View>

        {/* 件数表示 */}
        <View style={styles.countBar}>
          <Text style={styles.countText}>{filteredNotes.length}件のノート</Text>
        </View>

        {/* リスト */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          {filteredNotes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {notes.length === 0
                  ? "まだノートがありません"
                  : "該当するノートが見つかりません"}
              </Text>
              <Text style={styles.emptySubText}>
                {notes.length === 0
                  ? "チャットからAIの解説を保存してみましょう"
                  : "フィルターを変更してお試しください"}
              </Text>
            </View>
          ) : (
            notesToTreeNodes(filteredNotes).map((node, index) => (
              <FileCard
                key={`${node.name}-${index}`}
                node={node}
                onPress={() => handleNotePress(filteredNotes[index])}
              />
            ))
          )}
        </ScrollView>

        {/* 詳細モーダル */}
        <NoteDetailModal
          visible={detailModalVisible}
          node={
            selectedNote
              ? {
                  name: selectedNote.title,
                  type: "file",
                  path: [],
                  children: [],
                  item: selectedNote,
                }
              : null
          }
          onClose={() => {
            setDetailModalVisible(false);
            setSelectedNote(null);
          }}
          onDelete={handleDeleteNote}
          onUpdate={handleUpdateNote}
          onEditMemo={(noteId) => {
            setDetailModalVisible(false);
            setSelectedNote(null);
            navigation.navigate("NoteEditor", { noteId, itemType: "memo" });
          }}
        />

        {/* クイズモーダル（用語フラッシュカード） */}
        <QuizExecutionModal
          visible={quizModalVisible}
          item={quizModalVisible ? selectedNote : null}
          onClose={() => {
            setQuizModalVisible(false);
            setSelectedNote(null);
          }}
        />

        {/* 実戦問題モーダル */}
        <ExamQuestionModal
          visible={examModalVisible}
          item={examModalVisible ? selectedNote : null}
          onClose={() => {
            setExamModalVisible(false);
            setSelectedNote(null);
          }}
        />

        {/* 新規作成モーダル */}
        <CreateNoteModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSave={handleCreateNote}
        />

        {/* FAB（フローティングアクションボタン） */}
        <Pressable
          style={styles.fab}
          onPress={() =>
            navigation.navigate("NoteEditor", { itemType: "term" })
          }
          accessibilityLabel="ノートを追加"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1 },

  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backButtonLabel: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginHorizontal: 8,
  },
  headerSpacer: { width: 100 },

  filterSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  typeTabActive: {
    backgroundColor: "#FF9900",
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  typeTabTextActive: {
    color: "#FFFFFF",
  },

  categorySection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  categoryChipTextActive: {
    color: "#92400E",
  },

  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  countBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
  },
  countText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  list: { flex: 1, backgroundColor: "#F9FAFB" },
  listContent: { padding: 16, paddingBottom: 80 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 32,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF9900",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF9900",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
