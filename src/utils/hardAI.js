export default function calculateHardAIMove(board, targetIndex, nextPiece) {
  const AI = nextPiece;
  const HUMAN = nextPiece === 'O' ? 'X' : 'O';

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  // 预计算：每个格子所在的线路索引
  const CELL_LINES = Array.from({ length: 9 }, (_, i) =>
    LINES.reduce((acc, line, li) => (line.includes(i) ? [...acc, li] : acc), [])
  );

  // ---------- 基础工具 ----------

  function checkWinner(cells) {
    for (const [a, b, c] of LINES) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
    }
    if (!cells.includes(null)) return 'T';
    return null;
  }

  function opponent(p) { return p === AI ? HUMAN : AI; }

  function isSubDone(sub) { return checkWinner(sub) !== null; }

  function getSubResults(b) { return b.map(sub => checkWinner(sub)); }

  function cloneBoard(b) { return b.map(s => s.slice()); }

  function getLegalMoves(b, ti, subResults) {
    const moves = [];
    const subs = [];
    if (ti === -1 || subResults[ti] !== null) {
      for (let i = 0; i < 9; i++) {
        if (subResults[i] === null) subs.push(i);
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

  // 只检查经过 cell j 的线路是否形成三连
  function checkCellWin(sub, j) {
    for (const li of CELL_LINES[j]) {
      const [a, b, c] = LINES[li];
      if (sub[a] && sub[a] === sub[b] && sub[a] === sub[c]) return sub[a];
    }
    return null;
  }

  // ---------- 优化2：即时必胜/必堵 ----------

  function findImmediateWin(b, ti, player) {
    const sr = getSubResults(b);
    const moves = getLegalMoves(b, ti, sr);
    for (const move of moves) {
      const sub = b[move.i];
      sub[move.j] = player;
      const won = checkCellWin(sub, move.j) === player;
      sub[move.j] = null;
      if (won) {
        sr[move.i] = player;
        const globalWin = checkWinner(sr) === player;
        sr[move.i] = checkWinner(b[move.i]); // 还原
        if (globalWin) return move;
      }
    }
    return null;
  }

  function findBlockMove(b, ti) {
    // 模拟：如果对手下一步能在任意位置赢，找到那个位置并堵
    const sr = getSubResults(b);
    const myMoves = getLegalMoves(b, ti, sr);
    // 对手可能落子的所有位置
    for (const move of myMoves) {
      const sub = b[move.i];
      sub[move.j] = HUMAN;
      const won = checkCellWin(sub, move.j) === HUMAN;
      sub[move.j] = null;
      if (won) {
        sr[move.i] = HUMAN;
        const globalWin = checkWinner(sr) === HUMAN;
        sr[move.i] = checkWinner(b[move.i]);
        if (globalWin) return move;
      }
    }
    return null;
  }

  // ---------- 优化3+4：快速启发评分 ----------

  function heuristicMoveScore(b, move, player, subResults) {
    let score = 0;
    const sub = b[move.i];
    const opp = opponent(player);

    // 原地修改检查，不拷贝
    sub[move.j] = player;
    if (checkCellWin(sub, move.j) === player) {
      score += 100;
      // 赢了小棋盘还能赢全局？
      subResults[move.i] = player;
      if (checkWinner(subResults) === player) score += 500;
      subResults[move.i] = null;
    }
    sub[move.j] = opp;
    if (checkCellWin(sub, move.j) === opp) {
      score += 80;
      subResults[move.i] = opp;
      if (checkWinner(subResults) === opp) score += 400;
      subResults[move.i] = null;
    }
    sub[move.j] = null; // 还原

    // 位置分
    if (move.j === 4) score += 5;
    else if (move.j === 0 || move.j === 2 || move.j === 6 || move.j === 8) score += 3;

    // 送子惩罚
    const destIdx = move.j;
    if (subResults[destIdx] !== null) {
      score -= 10; // 送对手自由选择
    } else {
      const destSub = b[destIdx];
      for (const [a, bIdx, c] of LINES) {
        const vals = [destSub[a], destSub[bIdx], destSub[c]];
        const oppCount = vals.filter(v => v === opp).length;
        const emptyCount = vals.filter(v => v === null).length;
        if (oppCount === 2 && emptyCount === 1) {
          score -= 60;
          subResults[destIdx] = opp;
          if (checkWinner(subResults) === opp) score -= 500;
          subResults[destIdx] = null;
          break;
        }
      }
    }

    return score;
  }

  // ---------- 优化1：快速模拟（就地修改 + 增量检查） ----------

  function simulate(b, ti, startPlayer) {
    const simBoard = cloneBoard(b); // 只拷贝一次
    const sr = getSubResults(simBoard);
    let player = startPlayer;

    for (let depth = 0; depth < 50; depth++) {
      const moves = getLegalMoves(simBoard, ti, sr);
      if (moves.length === 0) return 0;

      // 70% 启发选择，30% 随机
      let chosen;
      if (Math.random() < 0.7 && moves.length > 1) {
        let bestS = -Infinity, bestMs = [];
        for (const m of moves) {
          const s = heuristicMoveScore(simBoard, m, player, sr);
          if (s > bestS) { bestS = s; bestMs = [m]; }
          else if (s === bestS) bestMs.push(m);
        }
        chosen = bestMs[Math.floor(Math.random() * bestMs.length)];
      } else {
        chosen = moves[Math.floor(Math.random() * moves.length)];
      }

      // 就地落子
      simBoard[chosen.i][chosen.j] = player;

      // 增量更新：只检查被修改的小棋盘
      sr[chosen.i] = checkWinner(simBoard[chosen.i]);

      // 用缓存的 subResults 检查全局
      const globalResult = checkWinner(sr);
      if (globalResult === AI) return 1;
      if (globalResult === HUMAN) return -1;
      if (globalResult === 'T' || sr.every(r => r !== null)) return 0;

      ti = sr[chosen.j] !== null ? -1 : chosen.j;
      player = opponent(player);
    }
    return 0;
  }

  // ---------- MCTS 核心 ----------

  class Node {
    constructor(b, ti, player, parent, move) {
      this.board = b;
      this.targetIndex = ti;
      this.player = player;
      this.parent = parent || null;
      this.move = move || null;
      this.children = [];
      this.visits = 0;
      this.wins = 0;
      this.sr = getSubResults(b);
      this.untried = getLegalMoves(b, ti, this.sr);
      this.result = checkWinner(this.sr);
      if (this.result === 'T' || (this.result === null && this.sr.every(r => r !== null))) {
        this.result = this.result || 'T';
      }
    }
    get isTerminal() {
      return this.result !== null || (this.untried.length === 0 && this.children.length === 0);
    }
    get isFullyExpanded() {
      return this.untried.length === 0;
    }
  }

  const C = 1.414;

  function uctSelect(node) {
    let best = null, bestVal = -Infinity;
    const logP = Math.log(node.visits);
    for (const child of node.children) {
      const wr = node.player === AI
        ? child.wins / child.visits
        : 1 - child.wins / child.visits;
      const uct = wr + C * Math.sqrt(logP / child.visits);
      if (uct > bestVal) { bestVal = uct; best = child; }
    }
    return best;
  }

  // 优化4：智能展开——优先展开启发评分高的走法
  function expand(node) {
    if (node.untried.length === 0) return null;

    let bestIdx = 0;
    if (node.untried.length > 1) {
      let bestScore = -Infinity;
      const sr = node.sr.slice();
      for (let i = 0; i < node.untried.length; i++) {
        const s = heuristicMoveScore(node.board, node.untried[i], node.player, sr);
        if (s > bestScore) { bestScore = s; bestIdx = i; }
      }
    }

    const move = node.untried.splice(bestIdx, 1)[0];
    const nb = cloneBoard(node.board);
    nb[move.i][move.j] = node.player;
    let nti = move.j;
    if (isSubDone(nb[nti])) nti = -1;

    const child = new Node(nb, nti, opponent(node.player), node, move);
    node.children.push(child);
    return child;
  }

  function backpropagate(node, result) {
    while (node !== null) {
      node.visits++;
      if (result === 1) node.wins += 1;
      else if (result === 0) node.wins += 0.5;
      node = node.parent;
    }
  }

  // ---------- 执行 ----------

  // 优化2：先检查即时必胜/必堵
  const instantWin = findImmediateWin(board, targetIndex, AI);
  if (instantWin) return instantWin;

  const mustBlock = findBlockMove(board, targetIndex);
  if (mustBlock) return mustBlock;

  const root = new Node(board, targetIndex, AI, null, null);

  if (root.untried.length === 1 && root.children.length === 0) {
    return root.untried[0];
  }

  const TIME_LIMIT = 5000;
  const MIN_ITERATIONS = 10000;
  const MAX_ITERATIONS = 200000;
  const startTime = Date.now();
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    if (iterations >= MIN_ITERATIONS && (iterations & 255) === 0) {
      if (Date.now() - startTime >= TIME_LIMIT) break;
    }

    let node = root;
    while (node.isFullyExpanded && node.children.length > 0) {
      node = uctSelect(node);
    }

    if (!node.isTerminal && !node.isFullyExpanded) {
      node = expand(node) || node;
    }

    // 优化1：快速模拟
    let result;
    if (node.result !== null) {
      result = node.result === AI ? 1 : (node.result === HUMAN ? -1 : 0);
    } else {
      result = simulate(node.board, node.targetIndex, node.player);
    }

    backpropagate(node, result);
    iterations++;
  }

  let bestMove = null, mostVisits = -1;
  for (const child of root.children) {
    if (child.visits > mostVisits) {
      mostVisits = child.visits;
      bestMove = child.move;
    }
  }
  console.log(`${AI} iterations: ${iterations}, time: ${Date.now()-startTime}ms`);

  return bestMove;
}