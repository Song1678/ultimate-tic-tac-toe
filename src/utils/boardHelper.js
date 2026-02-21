export const priorityOrder = [4, 0, 2, 6, 8, 1, 3, 5, 7]; // 中心 > 角落 > 边

export function checkResult(board) {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];
    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    if (!board.includes(null)) return 'T'
    return null;
}

export function isFull(board) {
    return board.every(cell => cell !== null);
}

export function isEmpty(board) {
    return board.every(cell => cell === null);
}