export default function calculateEasyAIMove(board, targetIndex, nextPiece) {
  const AI = nextPiece;
  const HUMAN = nextPiece === 'O' ? 'X' : 'O';

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  function checkWinner(cells) {
    for (const [a, b, c] of LINES) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
    }
    if (!cells.includes(null)) return 'T';
    return null;
  }

  function isSubDone(sub) {
    return checkWinner(sub) !== null;
  }

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

  // 检查某步落子后是否能赢下该小棋盘
  function winsSubBoard(sub, j, player) {
    const test = sub.slice();
    test[j] = player;
    return checkWinner(test) === player;
  }

  // 检查赢下某个小棋盘后是否能赢下全局
  function winsGlobal(b, subIdx, player) {
    const meta = b.map(s => checkWinner(s));
    meta[subIdx] = player;
    return checkWinner(meta) === player;
  }

  // 对每步棋打分
  function scoreMove(b, move) {
    const sub = b[move.i];
    let score = 0;

    // ===== 优先级1：能赢全局，直接拿下 =====
    if (winsSubBoard(sub, move.j, AI) && winsGlobal(b, move.i, AI)) {
      return 100000;
    }

    // ===== 优先级2：阻止对手赢全局 =====
    if (winsSubBoard(sub, move.j, HUMAN) && winsGlobal(b, move.i, HUMAN)) {
      // 这步不下的话对手下这里就赢了
      // 但当前是AI落子，要检查：如果AI不堵这个位置，对手能在这赢
      score += 50000;
    }

    // ===== 优先级3：赢下一个小棋盘 =====
    if (winsSubBoard(sub, move.j, AI)) {
      score += 5000;
      // 赢下的是战略要地（中心/角）加分
      if (move.i === 4) score += 800;
      else if ([0, 2, 6, 8].includes(move.i)) score += 400;
    }

    // ===== 优先级4：阻止对手赢小棋盘 =====
    if (winsSubBoard(sub, move.j, HUMAN)) {
      score += 3000;
      if (move.i === 4) score += 600;
      else if ([0, 2, 6, 8].includes(move.i)) score += 300;
    }

    // ===== 优先级5：避免把对手送到好位置 =====
    const sendTo = move.j;
    if (isSubDone(b[sendTo])) {
      // 送对手去已结束的棋盘 → 对手自由选择，通常不好
      score -= 200;
    } else {
      // 对手被送到的棋盘里，检查对手是否有赢棋机会
      const destSub = b[sendTo];
      let opponentCanWinThere = false;
      for (let j = 0; j < 9; j++) {
        if (destSub[j] === null && winsSubBoard(destSub, j, HUMAN)) {
          opponentCanWinThere = true;
          // 对手赢了那个棋盘还能赢全局就更糟
          if (winsGlobal(b, sendTo, HUMAN)) {
            score -= 8000;
          }
          break;
        }
      }
      if (opponentCanWinThere) {
        score -= 500;
      }
    }

    // ===== 优先级6：线路建设 =====
    for (const [a, b_, c] of LINES) {
      if (![a, b_, c].includes(move.j)) continue;
      const vals = [sub[a], sub[b_], sub[c]];
      // 把当前位置模拟填入
      const idx = [a, b_, c].indexOf(move.j);
      vals[idx] = AI;

      const aiCount = vals.filter(v => v === AI).length;
      const huCount = vals.filter(v => v === HUMAN).length;

      if (huCount === 0 && aiCount === 2) score += 100; // 形成两连
      if (aiCount === 0 && huCount === 2) score += 80;  // 堵对手两连
    }

    // ===== 优先级7：位置偏好 =====
    // 小棋盘内：中心 > 角 > 边
    if (move.j === 4) score += 30;
    else if ([0, 2, 6, 8].includes(move.j)) score += 15;

    // 全局：优先在重要棋盘落子
    if (move.i === 4) score += 20;
    else if ([0, 2, 6, 8].includes(move.i)) score += 10;

    return score;
  }

  // ---------- 执行 ----------

  const moves = getLegalMoves(board, targetIndex);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  // 给所有合法走法打分
  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of moves) {
    const s = scoreMove(board, move);
    if (s > bestScore) {
      bestScore = s;
      bestMoves = [move];
    } else if (s === bestScore) {
      bestMoves.push(move);
    }
  }

  // 同分随机选一个（增加变化性）
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}