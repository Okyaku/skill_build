import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  RichEditor,
  RichToolbar,
  actions,
} from "react-native-pell-rich-editor";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useProject } from "../../contexts/ProjectContext";
import {
  getExistingCategories,
  DEFAULT_CATEGORY_SUGGESTIONS,
  ItemType,
} from "../utils/categories";
import { generateCategory } from "../services/gemini";

type NoteEditorRouteParams = {
  noteId?: string;
  itemType?: ItemType;
};

type NoteEditorRoute = RouteProp<
  { NoteEditor: NoteEditorRouteParams },
  "NoteEditor"
>;

export default function NoteEditor(): React.ReactElement {
  const navigation = useNavigation<any>();
  const route = useRoute<NoteEditorRoute>();
  const { user } = useAuth();
  const { currentProjectId } = useProject();
  const richText = useRef<RichEditor>(null);

  const { noteId, itemType: initialItemType } = route.params || {};

  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // リッチテキスト用（memo）
  const [plainContent, setPlainContent] = useState(""); // プレーンテキスト用（term, question）
  const [itemType, setItemType] = useState<ItemType>(initialItemType || "term");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(!!noteId);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [generatingCategory, setGeneratingCategory] = useState(false);

  // カテゴリ候補（既存 + デフォルト）
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);

  const isRichTextMode = itemType === "memo";

  useEffect(() => {
    if (noteId) {
      loadNote();
    } else if (user?.id && currentProjectId) {
      loadCategorySuggestions();
    }
  }, [noteId, user?.id, currentProjectId]);

  useEffect(() => {
    if (user?.id && currentProjectId) {
      loadCategorySuggestions();
    }
  }, [itemType, user?.id, currentProjectId]);

  const loadCategorySuggestions = async () => {
    if (!user?.id || !currentProjectId) return;

    const existing = await getExistingCategories(
      supabase,
      user.id,
      currentProjectId,
      itemType,
    );
    const defaults = DEFAULT_CATEGORY_SUGGESTIONS[itemType];

    const combined = [...existing];
    defaults.forEach((def) => {
      if (!combined.includes(def)) {
        combined.push(def);
      }
    });

    setCategorySuggestions(combined);
  };

  const loadNote = async () => {
    if (!noteId || !user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("study_items")
        .select("*")
        .eq("id", noteId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("[NoteEditor] ノート読み込みエラー:", error);
        Alert.alert("エラー", "ノートの読み込みに失敗しました");
        navigation.goBack();
      } else if (data) {
        setTitle(data.title);
        setItemType(data.item_type as ItemType);
        setCategory(data.category || "");

        // メモの場合はリッチテキスト、それ以外はプレーンテキスト
        if (data.item_type === "memo") {
          setContent(data.content);
          richText.current?.setContentHTML(data.content);
        } else {
          setPlainContent(data.content);
        }

        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error("[NoteEditor] ノート読み込み例外:", err);
      Alert.alert("エラー", "予期しないエラーが発生しました");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !currentProjectId || !title.trim()) return;

    setSaving(true);

    try {
      // メモの場合はリッチテキスト、それ以外はプレーンテキストを保存
      const contentToSave = isRichTextMode ? content : plainContent;

      const noteData = {
        user_id: user.id,
        project_id: currentProjectId,
        title: title.trim(),
        content: contentToSave,
        item_type: itemType,
        category: category,
      };

      if (noteId) {
        // 更新
        const { error } = await supabase
          .from("study_items")
          .update(noteData)
          .eq("id", noteId)
          .eq("user_id", user.id);

        if (error) {
          console.error("[NoteEditor] 保存エラー:", error);
        } else {
          console.log("[NoteEditor] 保存成功");
          setHasUnsavedChanges(false);
          navigation.goBack();
        }
      } else {
        // 新規作成
        const { data, error } = await supabase
          .from("study_items")
          .insert(noteData)
          .select()
          .single();

        if (error) {
          console.error("[NoteEditor] 保存エラー:", error);
        } else if (data) {
          console.log("[NoteEditor] 新規保存成功:", data.id);
          setHasUnsavedChanges(false);
          navigation.goBack();
        }
      }
    } catch (err) {
      console.error("[NoteEditor] 保存例外:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = (html: string) => {
    setContent(html);
    setHasUnsavedChanges(true);
  };

  const handleTitleChange = (text: string) => {
    setTitle(text);
    setHasUnsavedChanges(true);
  };

  const handleClose = () => {
    // 保存中でなければ即座に戻る
    if (!saving) {
      navigation.goBack();
    } else {
      Alert.alert("保存中", "保存が完了するまでお待ちください");
    }
  };

  const handleGenerateCategory = async () => {
    if (!title.trim() && !content.trim() && !plainContent.trim()) {
      Alert.alert(
        "ヒント",
        "タイトルまたは内容を入力してからAI生成をお試しください",
      );
      return;
    }

    setGeneratingCategory(true);
    try {
      const contentToAnalyze = isRichTextMode ? content : plainContent;
      const generated = await generateCategory(
        title.trim() || "無題",
        contentToAnalyze.trim() || "",
        itemType,
      );
      setCategory(generated);
      setHasUnsavedChanges(true);
    } catch (err: any) {
      console.error("[NoteEditor] カテゴリ生成エラー:", err);
      Alert.alert("エラー", "カテゴリの生成に失敗しました");
    } finally {
      setGeneratingCategory(false);
    }
  };

  const handleItemTypeChange = (newType: ItemType) => {
    setItemType(newType);
    setCategory(""); // カテゴリをリセット
    setHasUnsavedChanges(true);

    // 種別変更時にコンテンツを相互変換
    if (newType === "memo") {
      // プレーンテキスト → リッチテキストへ切り替え
      if (plainContent) {
        const htmlContent = plainContent.replace(/\n/g, "<br>");
        setContent(htmlContent);
        richText.current?.setContentHTML(htmlContent);
      }
    } else {
      // リッチテキスト → プレーンテキストへ切り替え
      if (content) {
        // HTMLタグを削除してプレーンテキストに変換
        const plainText = content
          .replace(/<[^>]+>/g, "")
          .replace(/<br\s*\/?>/gi, "\n");
        setPlainContent(plainText);
      }
    }
  };

  const getTypeLabel = (type: ItemType): string => {
    switch (type) {
      case "term":
        return "📖 用語";
      case "memo":
        return "📝 メモ";
      case "question":
        return "❓ 問題";
    }
  };

  if (loading) {
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={0}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={handleClose}
            accessibilityLabel="閉じる"
          >
            <Ionicons name="close" size={28} color="#374151" />
          </Pressable>
          <View style={styles.headerCenter}>
            {saving && (
              <View style={styles.saveStatus}>
                <ActivityIndicator size="small" color="#FF9900" />
                <Text style={styles.saveStatusText}>同期中...</Text>
              </View>
            )}
            {!saving && hasUnsavedChanges && (
              <View style={styles.saveStatus}>
                <Ionicons name="ellipse" size={8} color="#F59E0B" />
                <Text style={[styles.saveStatusText, { color: "#F59E0B" }]}>
                  未保存
                </Text>
              </View>
            )}
          </View>
          <Pressable
            style={[
              styles.saveButton,
              (saving || !hasUnsavedChanges) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving || !hasUnsavedChanges}
            accessibilityLabel="保存"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>保存</Text>
            )}
          </Pressable>
        </View>

        {/* メタデータセクション */}
        <View style={styles.metaSection}>
          {/* 種別 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metaContent}
          >
            {(["term", "memo", "question"] as ItemType[]).map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.metaChip,
                  itemType === type && styles.metaChipActive,
                ]}
                onPress={() => handleItemTypeChange(type)}
              >
                <Text
                  style={[
                    styles.metaChipText,
                    itemType === type && styles.metaChipTextActive,
                  ]}
                >
                  {getTypeLabel(type)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* カテゴリ入力 */}
          <View style={styles.categoryInputRow}>
            <TextInput
              style={styles.categoryInput}
              placeholder="カテゴリを入力"
              placeholderTextColor="#9CA3AF"
              value={category}
              onChangeText={(text) => {
                setCategory(text);
                setHasUnsavedChanges(true);
              }}
            />
            <Pressable
              style={styles.aiButtonSmall}
              onPress={handleGenerateCategory}
              disabled={generatingCategory}
            >
              {generatingCategory ? (
                <ActivityIndicator size="small" color="#FF9900" />
              ) : (
                <Ionicons name="sparkles" size={18} color="#FF9900" />
              )}
            </Pressable>
          </View>

          {/* カテゴリ候補 */}
          {categorySuggestions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsContent}
            >
              {categorySuggestions.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryChipSmall,
                    category === cat && styles.categoryChipSmallActive,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryChipSmallText,
                      category === cat && styles.categoryChipSmallTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* タイトル */}
        <View style={styles.titleSection}>
          <TextInput
            style={styles.titleInput}
            placeholder="タイトルを入力"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={handleTitleChange}
            multiline
          />
        </View>

        {/* エディタエリア - 種別に応じて切り替え */}
        {isRichTextMode ? (
          <>
            {/* リッチテキストエディタ（メモ用） */}
            <ScrollView style={styles.editorContainer}>
              <RichEditor
                ref={richText}
                style={styles.richEditor}
                placeholder="内容を入力..."
                onChange={handleContentChange}
                initialContentHTML={content}
              />
            </ScrollView>

            {/* ツールバー */}
            <RichToolbar
              editor={richText}
              actions={[
                actions.setBold,
                actions.setItalic,
                actions.setUnderline,
                actions.insertBulletsList,
                actions.insertOrderedList,
                actions.heading1,
                actions.heading2,
                actions.undo,
                actions.redo,
              ]}
              iconTint="#374151"
              selectedIconTint="#FF9900"
              style={styles.toolbar}
            />
          </>
        ) : (
          <>
            {/* プレーンテキストエディタ（用語・問題用） */}
            <ScrollView style={styles.editorContainer}>
              <TextInput
                style={styles.plainTextEditor}
                placeholder={
                  itemType === "term"
                    ? "用語の意味や説明を入力..."
                    : "問題文と解答・解説を入力..."
                }
                placeholderTextColor="#9CA3AF"
                value={plainContent}
                onChangeText={(text) => {
                  setPlainContent(text);
                  setHasUnsavedChanges(true);
                }}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  saveStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saveStatusText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#FF9900",
  },
  saveButton: {
    minWidth: 72,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9900",
  },
  saveButtonDisabled: {
    backgroundColor: "#FBBF24",
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  metaSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 12,
  },
  metaContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  metaChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  metaChipActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FF9900",
  },
  metaChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  metaChipTextActive: {
    color: "#FF9900",
  },
  categoryInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  categoryInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
  },
  aiButtonSmall: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF9900",
  },
  categoryChipsContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 6,
  },
  categoryChipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipSmallActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  categoryChipSmallText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryChipSmallTextActive: {
    color: "#92400E",
  },

  titleSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  titleInput: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    padding: 0,
    margin: 0,
  },

  editorContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  richEditor: {
    flex: 1,
    minHeight: 300,
    backgroundColor: "#FFFFFF",
  },
  plainTextEditor: {
    flex: 1,
    minHeight: 300,
    fontSize: 16,
    lineHeight: 24,
    color: "#111827",
    padding: 0,
  },

  toolbar: {
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
});
