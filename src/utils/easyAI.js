import { checkResult } from "./boardHelper.js";

export default function calculateEasyAIMove(board, targetIndex) {
    let i, j;
    let availableSubBoardIndex = [];
    let availableCellIndex = [];
    if (targetIndex === -1) {
        availableSubBoardIndex = board
            .map((subBoard, index) => ({ subBoard, index }))
            .filter(({ subBoard }) => checkResult(subBoard) === null)
            .map(({ index }) => index);
        i = availableSubBoardIndex[Math.floor(Math.random() * availableSubBoardIndex.length)];
    } else {
        i = targetIndex;
    }

    const targetSubBoard = board[i];
    availableCellIndex = targetSubBoard
        .map((cell, index) => ({ cell, index }))
        .filter(({ cell }) => cell === null)
        .map(({ index }) => index);
    j = availableCellIndex[Math.floor(Math.random() * availableCellIndex.length)];

    return { i, j };
}