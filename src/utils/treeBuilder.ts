interface StudyItem {
  id: string;
  user_id: string;
  project_id: string | null;
  item_type: string;
  title: string;
  content: string;
  category: string | null;
  folder_path: string[] | null;
  created_at: string;
}

export interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  path: string[]; // フルパス
  children: TreeNode[];
  item?: StudyItem; // type === 'file' の場合のみ存在
  fileCount?: number; // フォルダ内のファイル総数（再帰的）
}

/**
 * study_items の配列から階層的なツリー構造を構築
 */
export function buildTree(items: StudyItem[]): TreeNode[] {
  const root: TreeNode = {
    name: '__root__',
    type: 'folder',
    path: [],
    children: [],
  };

  // 各アイテムをツリーに挿入
  items.forEach(item => {
    const folderPath = item.folder_path || ['その他'];
    insertIntoTree(root, folderPath, item);
  });

  // ファイル数を計算
  calculateFileCounts(root);

  return root.children;
}

/**
 * ツリーに単一のアイテムを挿入
 */
function insertIntoTree(parent: TreeNode, folderPath: string[], item: StudyItem): void {
  if (folderPath.length === 0) {
    // 末端に到達：ファイルノードを追加
    parent.children.push({
      name: item.title,
      type: 'file',
      path: [...parent.path, item.title],
      children: [],
      item,
    });
    return;
  }

  const [currentFolder, ...restPath] = folderPath;

  // 既存のフォルダを探す
  let folderNode = parent.children.find(
    child => child.type === 'folder' && child.name === currentFolder
  );

  // フォルダが存在しない場合は作成
  if (!folderNode) {
    folderNode = {
      name: currentFolder,
      type: 'folder',
      path: [...parent.path, currentFolder],
      children: [],
    };
    parent.children.push(folderNode);
  }

  // 再帰的に次の階層へ
  insertIntoTree(folderNode, restPath, item);
}

/**
 * 各フォルダノードのファイル数を再帰的に計算
 */
function calculateFileCounts(node: TreeNode): number {
  if (node.type === 'file') {
    return 1;
  }

  let count = 0;
  node.children.forEach(child => {
    count += calculateFileCounts(child);
  });

  node.fileCount = count;
  return count;
}

/**
 * ツリーをアルファベット順にソート（フォルダ優先、その後ファイル）
 */
export function sortTree(nodes: TreeNode[]): TreeNode[] {
  const sorted = [...nodes].sort((a, b) => {
    // フォルダを先に
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;

    // 同じタイプなら名前順
    return a.name.localeCompare(b.name, 'ja');
  });

  // 子要素も再帰的にソート
  sorted.forEach(node => {
    if (node.type === 'folder' && node.children.length > 0) {
      node.children = sortTree(node.children);
    }
  });

  return sorted;
}

/**
 * ツリー内を検索（タイトルまたはコンテンツでフィルタリング）
 */
export function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query.trim()) return nodes;

  const lowerQuery = query.toLowerCase();
  const filtered: TreeNode[] = [];

  nodes.forEach(node => {
    if (node.type === 'file') {
      // ファイルの場合：タイトルまたはコンテンツにマッチするか
      const matchesTitle = node.name.toLowerCase().includes(lowerQuery);
      const matchesContent = node.item?.content.toLowerCase().includes(lowerQuery);

      if (matchesTitle || matchesContent) {
        filtered.push(node);
      }
    } else {
      // フォルダの場合：子要素を再帰的にフィルタ
      const filteredChildren = filterTree(node.children, query);
      if (filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren,
        });
      }
    }
  });

  return filtered;
}

/**
 * 単一子フォルダを集約（最適化）
 * 中に1つしか子がないフォルダが連続している場合、中間フォルダをスキップする
 */
export function optimizeTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.map(node => optimizeNode(node));
}

function optimizeNode(node: TreeNode): TreeNode {
  if (node.type === 'file') {
    return node;
  }

  // フォルダの場合
  let current = node;
  const collapsedPath: string[] = [current.name];

  // 子が1つのフォルダが続く限り集約
  while (
    current.children.length === 1 &&
    current.children[0].type === 'folder'
  ) {
    current = current.children[0];
    collapsedPath.push(current.name);
  }

  // 集約されたパスを持つ新しいノードを作成
  if (collapsedPath.length > 1) {
    return {
      ...current,
      name: collapsedPath.join(' › '),
      path: node.path, // 元のパスを保持
      children: current.children.map(child => optimizeNode(child)),
    };
  }

  // 集約されなかった場合は子要素を再帰的に最適化
  return {
    ...node,
    children: node.children.map(child => optimizeNode(child)),
  };
}
