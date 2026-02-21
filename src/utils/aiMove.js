import calculateEasyAIMove from "./easyAI.js";
import calculateMediumAIMove from "./mediumAI.js";
import calculateHardAIMove from "./hardAI.js";

export default function calculateAIMove(board, targetIndex, difficulty) {
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
