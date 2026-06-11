import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TreeNode } from '../utils/treeBuilder';

interface TreeNodeViewProps {
  node: TreeNode;
  depth: number;
  onFilePress: (node: TreeNode) => void;
}

export default function TreeNodeView({ node, depth, onFilePress }: TreeNodeViewProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(depth === 0); // 第1階層はデフォルトで開く

  const indent = depth * 20;

  if (node.type === 'file') {
    // ファイルノード（末端）
    const icon = node.item?.item_type === 'question' ? '❓' : node.item?.item_type === 'memo' ? '📝' : '📄';

    return (
      <Pressable
        style={[styles.fileRow, { marginLeft: indent }]}
        onPress={() => onFilePress(node)}
        accessibilityLabel={`ファイル: ${node.name}`}
      >
        <Text style={styles.fileIcon}>{icon}</Text>
        <Text style={styles.fileName} numberOfLines={1}>
          {node.name}
        </Text>
      </Pressable>
    );
  }

  // フォルダノード
  return (
    <View>
      <Pressable
        style={[styles.folderRow, { marginLeft: indent }]}
        onPress={() => setIsExpanded(!isExpanded)}
        accessibilityLabel={`フォルダ: ${node.name}`}
      >
        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        <Text style={styles.folderIcon}>📁</Text>
        <Text style={styles.folderName} numberOfLines={1}>
          {node.name}
        </Text>
        {node.fileCount !== undefined && node.fileCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{node.fileCount}</Text>
          </View>
        )}
      </Pressable>

      {/* 展開時：子要素を表示 */}
      {isExpanded && (
        <View>
          {node.children.map((child, index) => (
            <TreeNodeView
              key={`${child.name}-${index}`}
              node={child}
              depth={depth + 1}
              onFilePress={onFilePress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  expandIcon: {
    fontSize: 12,
    color: '#6B7280',
    width: 20,
    marginRight: 4,
  },
  folderIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  folderName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingLeft: 36, // expandIconとfolderIconの分のインデント
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fileIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});
