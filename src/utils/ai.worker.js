import calculateEasyAIMove from "./easyAI.js";
import calculateMediumAIMove from "./mediumAI.js";
import calculateHardAIMove from "./hardAI.js";
import calculateTestAIMove from "./testAI.js"

function calculateAIMove(board, targetIndex, nextPiece, difficulty) {
    switch (difficulty) {
        case 'easy':
            return calculateEasyAIMove(board, targetIndex, nextPiece);
        case 'medium':
            return calculateMediumAIMove(board, targetIndex, nextPiece);
        case 'hard':
            return calculateHardAIMove(board, targetIndex, nextPiece);
        case 'test':
            return calculateTestAIMove(board, targetIndex, nextPiece);
        default:
            return calculateEasyAIMove(board, targetIndex, nextPiece);
    }
}

self.onmessage = (e) => {
    const { flatBoard, targetIndex, nextPiece, difficulty } = e.data;
    //在worker线程里复原二维数组
    const board = [];
    for (let i = 0; i < 9; i++) {
        board.push(flatBoard.slice(i * 9, (i + 1) * 9));
    }
    const aiMove = calculateAIMove(board, targetIndex, nextPiece, difficulty );
    self.postMessage(aiMove);
}