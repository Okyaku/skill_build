import { TreeNode } from './treeBuilder';

export interface MapNode {
  id: string;
  node: TreeNode;
  x: number;
  y: number;
  level: number;
  color: string;
  isExpanded: boolean;
  children: MapNode[];
  parent?: MapNode;
}

export interface MapDimensions {
  width: number;
  height: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ノードタイプ別の色定義（ネオン/フューチャリスティック）
const NODE_COLORS = {
  root: '#F59E0B',      // プロジェクトルート（ゴールデンオレンジ）
  folder: '#60A5FA',    // フォルダ（ネオンブルー）
  term: '#06B6D4',      // 用語（シアン）
  memo: '#34D399',      // メモ（ネオングリーン）
  question: '#FB923C',  // 問題（ネオンオレンジ）
  default: '#94A3B8',   // その他（スレートグレー）
};

// レイアウト設定（コンパクト化）
const LAYOUT_CONFIG = {
  rootX: 120,           // ルートノードのX座標
  rootY: 300,           // ルートノードのY座標（画面中央寄り）
  levelGapX: 180,       // 階層間の横方向の間隔（縮小）
  siblingGapY: 100,     // 兄弟ノード間の縦方向の間隔（縮小）
  nodeRadius: 40,       // ノードの半径
  minGapY: 80,          // 最小縦間隔
  padding: 100,         // マップ全体のパディング
};

/**
 * ツリー構造をマインドマップレイアウトに変換
 */
export function buildMindMap(
  treeNodes: TreeNode[],
  projectTitle: string,
  expandedPaths: Set<string> = new Set()
): { nodes: MapNode; dimensions: MapDimensions } {
  // ルートノードを作成
  const rootNode: MapNode = {
    id: '__root__',
    node: {
      name: projectTitle,
      type: 'folder',
      path: [],
      children: treeNodes,
    },
    x: LAYOUT_CONFIG.rootX,
    y: LAYOUT_CONFIG.rootY,
    level: 0,
    color: NODE_COLORS.root,
    isExpanded: true,
    children: [],
  };

  // 再帰的にレイアウトを計算
  calculateLayout(rootNode, treeNodes, expandedPaths, 1);

  // マップ全体のサイズを計算
  const dimensions = calculateDimensions(rootNode);

  return { nodes: rootNode, dimensions };
}

/**
 * 再帰的にノードの座標を計算（コンパクト2次元配置）
 */
function calculateLayout(
  parent: MapNode,
  children: TreeNode[],
  expandedPaths: Set<string>,
  level: number
): void {
  if (children.length === 0) return;

  // 親が展開されていない場合は子を配置しない
  const pathKey = parent.node.path.join('/');
  const isParentExpanded = parent.level === 0 || expandedPaths.has(pathKey);

  if (!isParentExpanded && parent.level > 0) {
    return;
  }

  const startX = parent.x + LAYOUT_CONFIG.levelGapX;

  // 子ノードの数に応じて動的に間隔を調整
  const childCount = children.length;
  const dynamicGap = childCount <= 3
    ? LAYOUT_CONFIG.siblingGapY
    : Math.max(LAYOUT_CONFIG.minGapY, LAYOUT_CONFIG.siblingGapY * (3 / childCount));

  const totalHeight = childCount * dynamicGap;
  let currentY = parent.y - totalHeight / 2;

  children.forEach((childNode, index) => {
    const childPathKey = childNode.path.join('/');
    const isExpanded = expandedPaths.has(childPathKey);

    const mapNode: MapNode = {
      id: childPathKey || `${parent.id}-${index}`,
      node: childNode,
      x: startX,
      y: currentY + (dynamicGap / 2),
      level,
      color: getNodeColor(childNode),
      isExpanded,
      children: [],
      parent,
    };

    parent.children.push(mapNode);

    // 子ノードがフォルダで展開されている場合、再帰的に配置
    if (childNode.type === 'folder' && isExpanded && childNode.children.length > 0) {
      calculateLayout(mapNode, childNode.children, expandedPaths, level + 1);

      // 孫ノードの配置に合わせて子ノードのY座標を調整
      if (mapNode.children.length > 0) {
        const firstGrandChild = mapNode.children[0];
        const lastGrandChild = mapNode.children[mapNode.children.length - 1];
        mapNode.y = (firstGrandChild.y + lastGrandChild.y) / 2;
      }
    }

    currentY += dynamicGap;
  });

  // Y座標を調整（子の配置に合わせて親を中央に配置）
  if (parent.children.length > 0 && parent.level > 0) {
    const firstChild = parent.children[0];
    const lastChild = parent.children[parent.children.length - 1];
    parent.y = (firstChild.y + lastChild.y) / 2;
  }
}

/**
 * ノードの色を決定
 */
function getNodeColor(node: TreeNode): string {
  if (node.type === 'folder') {
    return NODE_COLORS.folder;
  }

  const itemType = node.item?.item_type;
  switch (itemType) {
    case 'term': return NODE_COLORS.term;
    case 'memo': return NODE_COLORS.memo;
    case 'question': return NODE_COLORS.question;
    default: return NODE_COLORS.default;
  }
}

/**
 * マップ全体のサイズを計算
 */
function calculateDimensions(rootNode: MapNode): MapDimensions {
  let minX = rootNode.x;
  let maxX = rootNode.x;
  let minY = rootNode.y;
  let maxY = rootNode.y;

  function traverse(node: MapNode) {
    minX = Math.min(minX, node.x - LAYOUT_CONFIG.nodeRadius);
    maxX = Math.max(maxX, node.x + LAYOUT_CONFIG.nodeRadius);
    minY = Math.min(minY, node.y - LAYOUT_CONFIG.nodeRadius);
    maxY = Math.max(maxY, node.y + LAYOUT_CONFIG.nodeRadius);

    node.children.forEach(child => traverse(child));
  }

  traverse(rootNode);

  const padding = LAYOUT_CONFIG.padding;

  return {
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    minX: minX - padding,
    maxX: maxX + padding,
    minY: minY - padding,
    maxY: maxY + padding,
  };
}

/**
 * マップノードをフラットな配列に変換（レンダリング用）
 */
export function flattenMapNodes(rootNode: MapNode): MapNode[] {
  const result: MapNode[] = [];

  function traverse(node: MapNode) {
    result.push(node);
    node.children.forEach(child => traverse(child));
  }

  traverse(rootNode);
  return result;
}

/**
 * 接続線（エッジ）の座標を計算
 */
export interface Edge {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
}

export function calculateEdges(rootNode: MapNode): Edge[] {
  const edges: Edge[] = [];

  function traverse(node: MapNode) {
    node.children.forEach(child => {
      edges.push({
        fromX: node.x,
        fromY: node.y,
        toX: child.x,
        toY: child.y,
        color: node.color,
      });
      traverse(child);
    });
  }

  traverse(rootNode);
  return edges;
}
