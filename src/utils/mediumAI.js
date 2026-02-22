import { checkResult, findWinningMove } from "./boardHelper.js";

export default function calculateMediumAIMove(board, targetIndex) {
    let i, j;
    //选择在哪个小棋盘下
    if (targetIndex === -1) {
        const availableSubBoardIndex = board
            .map((subBoard, index) => ({ subBoard, index }))
            .filter(({ subBoard }) => checkResult(subBoard) === null)
            .map(({ index }) => index);
        //如果有可以直接形成3连的小棋盘，则直接在对应位置落子
        for (let index of availableSubBoardIndex) {
            const winningMove = findWinningMove(board[index], 'O');
            if (winningMove !== -1) {
                i = index;
                j = winningMove;
                return { i, j };
            }
        }
        //否则，随机选一个小棋盘
        i = availableSubBoardIndex[Math.floor(Math.random() * availableSubBoardIndex.length)];
    } else {
        i = targetIndex;
    }
    const targetSubBoard = board[i];    //确定行棋子棋盘

    //如果差1个形成3连，则在该处落子
    const winningMove = findWinningMove(targetSubBoard, 'O');
    if (winningMove !== -1) {
        j = winningMove;
        return { i, j };
    }

    //否则，采取防御，找出不会让下个棋盘出现X能够三连的位置
    const availableCellIndex = targetSubBoard
        .map((cell, index) => ({ cell, index }))
        .filter(({ cell }) => cell === null)
        .map(({ index }) => index);
    const cellIndexCandi = [];
    for (let index of availableCellIndex) {
        if (findWinningMove(board[index], 'X') === -1 || checkResult(board[index]) !== null) {
            cellIndexCandi.push(index);
        }
    }
    if (cellIndexCandi.length !== 0) {
        j = cellIndexCandi[Math.floor(Math.random() * cellIndexCandi.length)];
    } else {
        j = availableCellIndex[Math.floor(Math.random() * availableCellIndex.length)];

    }

    return { i, j };

}
