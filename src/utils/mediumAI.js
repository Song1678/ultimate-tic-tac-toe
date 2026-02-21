import { checkResult, priorityOrder, isFull, isEmpty } from "./boardHelper.js";

export default function calculateMediumAIMove(board, targetIndex) {
    let i, j;
    let availableSubBoardIndex = [];
    if (targetIndex === -1) {
        availableSubBoardIndex = board
            .map((subBoard, index) => ({ subBoard, index }))
            .filter(({ subBoard }) => checkResult(subBoard) === null)
            .map(({ index }) => index);
        for(let index of priorityOrder) {
            if(availableSubBoardIndex.includes(index)) {
                i = index;
                break;
            }
        }
    } else {
        i = targetIndex;
    }
    const targetSubBoard = board[i];    //确定行棋子棋盘

    const subBoardCopy = [...targetSubBoard];
    j = findBestMove(subBoardCopy);

    return { i, j };

}

function evaluate(board, depth) {
    const result = checkResult(board);
    if (result === 'O') return 10 - depth;
    if (result === 'X') return depth - 10;
    return 0;
}

function minmax(board, depth, isMaximizing, alpha, beta) {
    const score = evaluate(board, depth);
    if (score !== 0 || isFull(board)) return score;

    if (isMaximizing) {
        let best = -Infinity;
        for (let i of priorityOrder) {
            if (board[i] === null) {
                board[i] === 'O';
                best = Math.max(best, minmax(board, depth + 1, false));
                board[i] = null;
                alpha = Math.max(alpha, best);
                if(alpha >= beta) break;
            }
        }
        return best;
    } else {
        let best = Infinity;
        for (let i of priorityOrder) {
            if (board[i] === null) {
                board[i] = 'X';
                best = Math.min(best, minmax(board, depth + 1, true));
                board[i] = null;
                beta = Math.min(beta, best);
                if(alpha >= beta) break;
            }
        }
        return best;
    }
}

function findBestMove(board) {
    //如果棋盘为空，则在任意位置落子，减少分支数
    if (isEmpty(board)) return Math.floor(Math.random() * 9);
    
    let bestScore = -Infinity;
    let bestMove = -1;
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = 'O';
            const score = minmax(board, 0, false, -Infinity, Infinity);
            board[i] = null;
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    return bestMove;
}