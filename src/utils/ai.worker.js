import calculateEasyAIMove from "./easyAI.js";
import calculateMediumAIMove from "./mediumAI.js";
import calculateHardAIMove from "./hardAI.js";
import calculateTestAIMove from "./testAI.js"

const AI_DELAY_CONFIG = { easy: 500, medium: 1000, hard: 300, test: 50 };

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
    console.log("worker收到任务并准备开始计算");
    const aiMove = calculateAIMove(board, targetIndex, nextPiece, difficulty );

    //将模拟思考的延时逻辑放在worker返回信息时
    const aiDelayTime = AI_DELAY_CONFIG[difficulty] ?? AI_DELAY_CONFIG['easy'];
    console.log(`worker计算完成，并延时${aiDelayTime}ms后返回结果`);
    setTimeout(() => {
        self.postMessage(aiMove);
    }, aiDelayTime);
    
}