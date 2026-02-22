export default function calculateHardAIMove(board, targetIndex) {
  // ------------------------------
  // 1. 整合你提供的帮手函数（避免外部依赖）
  // ------------------------------
  function checkResult(subBoard) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // 行
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // 列
      [0, 4, 8], [2, 4, 6]             // 对角线
    ];
    for (const [a, b, c] of lines) {
      if (subBoard[a] && subBoard[a] === subBoard[b] && subBoard[a] === subBoard[c]) {
        return subBoard[a];
      }
    }
    if (!subBoard.includes(null)) return 'T';
    return null;
  }

  // ------------------------------
  // 2. 终极井字棋核心逻辑（适配二维数组）
  // ------------------------------
  const AI_PIECE = 'O'; // 假设AI执O，可根据需求改为'X'
  const HUMAN_PIECE = 'X';

  // 检查全局游戏结果
  function checkGlobalResult(currentBoard) {
    const globalBoard = currentBoard.map(sub => checkResult(sub));
    const globalWinner = checkResult(globalBoard);
    if (globalWinner && globalWinner !== 'T') return globalWinner;
    // 检查全局平局（所有小棋盘都结束）
    if (globalBoard.every(res => res !== null)) return 'T';
    return null;
  }

  // 检查小棋盘是否已结束（有胜负或平局）
  function isSubBoardFinished(subBoard) {
    return checkResult(subBoard) !== null;
  }

  // 获取所有合法移动
  function getLegalMoves(currentBoard, currentTargetIndex) {
    const moves = [];
    let availableSubBoards = [];

    // 确定可用的小棋盘
    if (currentTargetIndex === -1 || isSubBoardFinished(currentBoard[currentTargetIndex])) {
      // 无限制：选所有未结束的小棋盘
      for (let i = 0; i < 9; i++) {
        if (!isSubBoardFinished(currentBoard[i])) {
          availableSubBoards.push(i);
        }
      }
    } else {
      // 有限制：只能在指定小棋盘落子
      availableSubBoards.push(currentTargetIndex);
    }

    // 生成所有合法落子 {i, j}
    for (let i of availableSubBoards) {
      for (let j = 0; j < 9; j++) {
        if (currentBoard[i][j] === null) {
          moves.push({ i, j });
        }
      }
    }
    return moves;
  }

  // 深拷贝二维棋盘
  function copyBoard(currentBoard) {
    return currentBoard.map(subBoard => [...subBoard]);
  }

  // 应用移动，返回新状态
  function applyMove(currentBoard, currentTargetIndex, move, player) {
    const newBoard = copyBoard(currentBoard);
    newBoard[move.i][move.j] = player;

    // 计算新的目标小棋盘
    let newTargetIndex = move.j;
    if (isSubBoardFinished(newBoard[newTargetIndex])) {
      newTargetIndex = -1;
    }

    // 检查游戏是否结束
    const globalResult = checkGlobalResult(newBoard);
    const gameOver = globalResult !== null;
    const winner = globalResult;

    return { newBoard, newTargetIndex, gameOver, winner };
  }

  // 切换玩家
  function switchPlayer(player) {
    return player === AI_PIECE ? HUMAN_PIECE : AI_PIECE;
  }

  // ------------------------------
  // 3. MCTS 算法实现
  // ------------------------------
  class MCTSNode {
    constructor(currentBoard, currentTargetIndex, currentPlayer, parent = null, move = null) {
      this.board = currentBoard;
      this.targetIndex = currentTargetIndex;
      this.player = currentPlayer; // 下一步要下的玩家
      this.parent = parent;
      this.move = move; // 到达此节点的移动 {i, j}
      this.children = [];
      this.visits = 0;
      this.wins = 0; // 从AI视角统计的胜利次数
      this.untriedMoves = getLegalMoves(currentBoard, currentTargetIndex);
      this.gameOver = checkGlobalResult(currentBoard) !== null || this.untriedMoves.length === 0;
      this.winner = checkGlobalResult(currentBoard);
    }
  }

  // UCT 公式选择子节点
  function uctSelect(node) {
    const C = Math.sqrt(2); // 探索系数
    let bestChild = null;
    let bestUct = -Infinity;

    for (let child of node.children) {
      const winRate = child.wins / child.visits;
      const explorationTerm = C * Math.sqrt(Math.log(node.visits) / child.visits);
      const uct = winRate + explorationTerm;

      if (uct > bestUct) {
        bestUct = uct;
        bestChild = child;
      }
    }
    return bestChild;
  }

  // 扩展节点
  function expand(node) {
    if (node.untriedMoves.length === 0) return null;

    // 随机选一个未尝试的移动
    const moveIndex = Math.floor(Math.random() * node.untriedMoves.length);
    const move = node.untriedMoves.splice(moveIndex, 1)[0];

    // 应用移动
    const nextPlayer = switchPlayer(node.player);
    const { newBoard, newTargetIndex, gameOver, winner } = applyMove(
      node.board, node.targetIndex, move, node.player
    );

    // 创建子节点
    const child = new MCTSNode(newBoard, newTargetIndex, nextPlayer, node, move);
    child.gameOver = gameOver;
    child.winner = winner;
    node.children.push(child);

    return child;
  }

  // 随机模拟到游戏结束
  function simulate(node) {
    let currentBoard = copyBoard(node.board);
    let currentTargetIndex = node.targetIndex;
    let currentPlayer = node.player;
    let gameOver = node.gameOver;
    let winner = node.winner;

    while (!gameOver) {
      const legalMoves = getLegalMoves(currentBoard, currentTargetIndex);
      if (legalMoves.length === 0) break;

      // 随机选一个移动
      const move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      const result = applyMove(currentBoard, currentTargetIndex, move, currentPlayer);

      currentBoard = result.newBoard;
      currentTargetIndex = result.newTargetIndex;
      gameOver = result.gameOver;
      winner = result.winner;
      currentPlayer = switchPlayer(currentPlayer);
    }

    // 返回结果：1=AI赢, -1=人类赢, 0=平局
    if (winner === AI_PIECE) return 1;
    if (winner === HUMAN_PIECE) return -1;
    return 0;
  }

  // 回溯更新统计
  function backpropagate(node, result) {
    while (node !== null) {
      node.visits++;
      // 从AI视角统计：赢了+1，平局+0.5，输了+0
      if (result === 1) node.wins += 1;
      else if (result === 0) node.wins += 0.5;
      node = node.parent;
    }
  }

  // ------------------------------
  // 4. 执行 MCTS 搜索
  // ------------------------------
  const ITERATIONS = 10000; // 迭代次数（越多越强，但越慢）
  const root = new MCTSNode(board, targetIndex, AI_PIECE); // AI先行

  for (let i = 0; i < ITERATIONS; i++) {
    // 1. 选择
    let node = root;
    while (node.children.length > 0 && node.untriedMoves.length === 0) {
      node = uctSelect(node);
    }

    // 2. 扩展
    if (!node.gameOver) {
      node = expand(node) || node;
    }

    // 3. 模拟
    const result = simulate(node);

    // 4. 回溯
    backpropagate(node, result);
  }

  // 选择访问次数最多的移动（最稳健）
  let bestMove = null;
  let mostVisits = -1;
  for (let child of root.children) {
    if (child.visits > mostVisits) {
      mostVisits = child.visits;
      bestMove = child.move;
    }
  }

  return bestMove;
}