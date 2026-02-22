import calculateEasyAIMove from "./easyAI.js";
import calculateMediumAIMove from "./mediumAI.js";
import calculateHardAIMove from "./testAI.js";

function calculateAIMove(board, targetIndex, difficulty) {
    switch (difficulty) {
        case 'easy':
            return calculateEasyAIMove(board, targetIndex);
        case 'medium':
            return calculateMediumAIMove(board, targetIndex);
        case 'hard':
            return calculateHardAIMove(board, targetIndex);
        default:
            return calculateEasyAIMove(board, targetIndex);
    }
}

self.onmessage = (e) => {
    const { flatBoard, targetIndex, difficulty } = e.data;
    //在worker线程里复原二维数组
    const board = [];
    for (let i = 0; i < 9; i++) {
        board.push(flatBoard.slice(i * 9, (i + 1) * 9));
    }
    const aiMove = calculateAIMove(board, targetIndex, difficulty);
    self.postMessage(aiMove);
}