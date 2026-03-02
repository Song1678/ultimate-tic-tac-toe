export default function calculateTestAIMove(board, targetIndex, nextPiece) {
  const AI = nextPiece;
  const HUMAN = nextPiece === 'O' ? 'X' : 'O';

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  // ---------- 基础工具 ----------

  function checkWinner(cells) {
    for (const [a, b, c] of LINES) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
    }
    if (!cells.includes(null)) return 'T';
    return null;
  }

  function getSubResults(b) { return b.map(sub => checkWinner(sub)); }

  function checkGlobal(b) {
    const meta = getSubResults(b);
    const w = checkWinner(meta);
    if (w && w !== 'T') return w;
    if (meta.every(r => r !== null)) return 'T';
    return null;
  }

  function isSubDone(sub) { return checkWinner(sub) !== null; }

  function cloneBoard(b) { return b.map(s => s.slice()); }

  function opponent(p) { return p === AI ? HUMAN : AI; }

  function getLegalMoves(b, ti) {
    const moves = [];
    const subs = [];
    if (ti === -1 || isSubDone(b[ti])) {
      for (let i = 0; i < 9; i++) {
        if (!isSubDone(b[i])) subs.push(i);
      }
    } else {
      subs.push(ti);
    }
    for (const i of subs) {
      for (let j = 0; j < 9; j++) {
        if (b[i][j] === null) moves.push({ i, j });
      }
    }
    return moves;
  }

  function applyMove(b, move, player) {
    const nb = cloneBoard(b);
    nb[move.i][move.j] = player;
    let nti = move.j;
    if (isSubDone(nb[nti])) nti = -1;
    return { board: nb, targetIndex: nti };
  }

  // 判断游戏状态：true=进行中, 'X'/'O'=赢家, null=平局
  function getStatus(b) {
    const result = checkGlobal(b);
    if (result === null) return true;    // 进行中
    if (result === 'T') return null;     // 平局
    return result;                        // 'X' 或 'O'
  }

  // ---------- MCTS ----------

  const EXPLORE = Math.sqrt(2);

  class TreeNode {
    constructor(b, ti, currentPlayer, parent, move) {
      this.board = b;
      this.targetIndex = ti;
      this.currentPlayer = currentPlayer; // 当前该谁下
      this.parent = parent;
      this.move = move;
      this.win = 0;   // 从"刚下完棋的人"的视角统计
      this.sim = 0;
      this.children = [];
      this.status = getStatus(b);
      this.allChildren = this.status === true ? getLegalMoves(b, ti) : [];
    }

    get uct() {
      if (!this.parent) return this.win / this.sim;
      return (this.win / this.sim) +
        EXPLORE * Math.sqrt(Math.log(this.parent.sim) / this.sim);
    }

    get selection() {
      if (this.children.length === 0) return null;
      let best = this.children[0];
      for (let i = 1; i < this.children.length; i++) {
        if (this.children[i].uct > best.uct) best = this.children[i];
      }
      return best;
    }

    get bestChild() {
      if (this.children.length === 0) return null;
      let best = this.children[0];
      for (let i = 1; i < this.children.length; i++) {
        if (this.children[i].sim > best.sim) best = this.children[i];
      }
      return best;
    }

    runMCTS() {
      if (this.status !== true) return;

      // 阶段1：选择
      let child = this;
      while (child.allChildren.length === 0) {
        const sel = child.selection;
        if (!sel) break;
        child = sel;
      }

      if (child.status !== true) {
        backProp(child, child.status);
        return;
      }

      // 阶段2：展开（随机选一个未探索的走法）
      const moveIdx = child.allChildren.length - 1;
      const move = child.allChildren[moveIdx];
      child.allChildren.length = moveIdx; // pop

      const { board: nb, targetIndex: nti } = applyMove(child.board, move, child.currentPlayer);
      const newChild = new TreeNode(nb, nti, opponent(child.currentPlayer), child, move);
      child.children.push(newChild);

      // 阶段3：模拟（纯随机到终局）
      let simBoard = cloneBoard(nb);
      let simTi = nti;
      let simPlayer = opponent(child.currentPlayer);
      let simStatus = getStatus(simBoard);

      while (simStatus === true) {
        const moves = getLegalMoves(simBoard, simTi);
        if (moves.length === 0) break;
        const randMove = moves[Math.floor(Math.random() * moves.length)];
        simBoard[randMove.i][randMove.j] = simPlayer;
        const subResult = checkWinner(simBoard[randMove.i]);
        // 更新 targetIndex
        if (subResult !== null || isSubDone(simBoard[randMove.j])) {
          simTi = -1;
        } else {
          simTi = randMove.j;
        }
        simPlayer = opponent(simPlayer);
        simStatus = getStatus(simBoard);
      }

      // 阶段4：回溯
      backProp(newChild, simStatus);
    }
  }

  // 回溯：win 从"刚下完棋的人"的视角统计
  function backProp(node, finalStatus) {
    let n = node;
    while (n !== null) {
      n.sim++;
      if (finalStatus === null) {
        // 平局
        n.win += 0.5;
      } else if (n.status !== true) {
        // 终局节点
        n.win += n.status === null ? 0.5 : 1;
      } else {
        // "刚下的人"是 opponent(n.currentPlayer)
        // 如果赢家 !== 当前该下的人，说明刚下的人赢了
        n.win += finalStatus !== n.currentPlayer ? 1 : 0;
      }
      n = n.parent;
    }
  }

  // ---------- 执行 ----------

  const root = new TreeNode(board, targetIndex, AI, null, null);

  if (root.allChildren.length === 0) return null;
  if (root.allChildren.length === 1) return root.allChildren[0];

  const startTime = Date.now();
  const endTime = Date.now() + 5000;
  while (Date.now() < endTime) {
    root.runMCTS();
  }

  console.log(`${AI} iterations: ${root.sim}, time: ${Date.now() - startTime}ms`);

  const best = root.bestChild;
  return best ? best.move : root.allChildren[0];
}