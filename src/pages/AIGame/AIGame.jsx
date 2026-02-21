import styles from './AIGame.module.css'
import { useReducer, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';

export default function Game() {
    const [state, dispatch] = useReducer(gameReducer, {
        board: Array.from({ length: 9 }, () => Array(9).fill(null)),
        targetIndex: -1,
        nextPiece: 'X',
        isAIThinking: false
    });
    const { board, targetIndex, nextPiece, isAIThinking } = state;
    const subWinners = Array.from({ length: 9 }, (_, i) => calculateWinner(board[i]));
    const winner = calculateWinner(subWinners);
    const navigate = useNavigate();

    function handlePlay(i) {
        return function (j) {
            dispatch({
                type: 'PLAY',
                payload: { i, j }
            });
        };
    }

    function reset() {
        dispatch({
            type: 'RESET'
        });
    }

    useEffect(() => {
        if (nextPiece === 'X' || winner !== null) return;

        dispatch({ type: 'SET_AI_THINKING', payload: true });
        const aiTimer = setTimeout(() => {
            const aiMove = calculateAIMove(board, targetIndex);
            dispatch({
                type: 'PLAY',
                payload: { i: aiMove.i, j: aiMove.j }
            });
            dispatch({ type: 'SET_AI_THINKING', payload: false });
        }, 1200)

        return () => clearTimeout(aiTimer);

    }, [nextPiece])

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>终极井字棋</h1>
            <div className={styles['game-wrap']}>
                <Board
                    board={board}
                    targetIndex={targetIndex}
                    onPlay={handlePlay}
                    subWinners={subWinners}
                    isGameOVer={winner !== null}
                    isAIThinking={isAIThinking}
                />
                <InfoBox
                    winner={winner}
                    nextPiece={nextPiece}
                    targetIndex={targetIndex}
                    reset={reset}
                    isAIThinking={isAIThinking}
                />
            </div>
            <button className={styles['back-btn']} onClick={() => navigate('/')}>返回</button>
        </div>
    );
}

function Board({ board, targetIndex, onPlay, subWinners, isGameOVer, isAIThinking }) {
    return (
        <div className={styles['board']}>
            {Array.from({ length: 3 }).map((_, row) => (
                <div key={row}>
                    {Array.from({ length: 3 }).map((_, col) => {
                        const index = row * 3 + col;
                        return (
                            <SubBoard
                                key={index}
                                subBoard={board[index]}
                                onPlay={onPlay(index)}
                                isTarget={!isGameOVer && index === targetIndex}
                                isActive={!isGameOVer && !isAIThinking && (targetIndex === -1 || index === targetIndex)}
                                winner={subWinners[index]}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function SubBoard({ subBoard, onPlay, isTarget, isActive, winner }) {
    let subBoardClassName = styles['sub-board'];
    if (winner === 'X') subBoardClassName += ` ${styles['x-board']}`;
    if (winner === 'O') subBoardClassName += ` ${styles['o-board']}`;
    if (winner === 'T') subBoardClassName += ` ${styles['t-board']}`;
    if (!isActive) subBoardClassName += ` ${styles['no-play']}`;
    if (isTarget) subBoardClassName += ` ${styles['target']}`;

    function handleCellClick(i) {
        if (subBoard[i] === 'X' || subBoard[i] === 'O') return;
        onPlay(i);
    }

    return (
        <div className={subBoardClassName}>
            <div className={`${styles['board-label']}`}></div>
            <div>
                <Cell mark={subBoard[0]} onCellClick={() => handleCellClick(0)} />
                <Cell mark={subBoard[1]} onCellClick={() => handleCellClick(1)} />
                <Cell mark={subBoard[2]} onCellClick={() => handleCellClick(2)} />
            </div>
            <div>
                <Cell mark={subBoard[3]} onCellClick={() => handleCellClick(3)} />
                <Cell mark={subBoard[4]} onCellClick={() => handleCellClick(4)} />
                <Cell mark={subBoard[5]} onCellClick={() => handleCellClick(5)} />
            </div>
            <div>
                <Cell mark={subBoard[6]} onCellClick={() => handleCellClick(6)} />
                <Cell mark={subBoard[7]} onCellClick={() => handleCellClick(7)} />
                <Cell mark={subBoard[8]} onCellClick={() => handleCellClick(8)} />
            </div>
        </div>
    )

}

function Cell({ mark, onCellClick }) {
    let cellClassName = styles['cell'];
    if (mark === 'O') {
        cellClassName += ` ${styles['o-cell']}`;
    } else if (mark === 'X') {
        cellClassName += ` ${styles['x-cell']}`
    }
    return (
        <div onClick={onCellClick} className={cellClassName}>
            <div className={styles['piece']}></div>
        </div>
    )
}

function InfoBox({ winner, nextPiece, targetIndex, reset, isAIThinking }) {
    const XElement = <span style={{ color: '#c0392b' }}>X</span>;
    const OElement = <span style={{ color: '#16a085' }}>O</span>;

    const currentPieceElement = winner ?
        (winner === 'X' ? XElement : OElement) :
        (nextPiece === 'X' ? XElement : OElement);

    const titleContent = winner ? (
        <> {currentPieceElement} <span>方获胜</span> </>
    ) : (
        <> {currentPieceElement} <span>方落子</span> </>
    );

    const hintText = isAIThinking ? 
        "AI正在思考...." : 
        (targetIndex !== -1 ? "请在指定区域落子" : "请在任意区域落子");

    return (
        <aside className={styles['info-box']}>
            <h2>{titleContent}</h2>
            {!winner && <p>{hintText}</p>}
            {winner && <button className={styles['reset-btn']} onClick={() => reset()}>重置</button>}
        </aside>
    );
}

function calculateWinner(board) {
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

function gameReducer(state, action) {
    switch (action.type) {
        case 'PLAY': {
            const { i, j } = action.payload;
            const newBoard = [...state.board];
            newBoard[i] = [...state.board[i]];
            newBoard[i][j] = state.nextPiece;
            const newTargetIndex = calculateWinner(newBoard[j]) === null ? j : -1;
            const newNextPiece = state.nextPiece === 'X' ? 'O' : 'X';
            return {
                ...state,
                board: newBoard,
                targetIndex: newTargetIndex,
                nextPiece: newNextPiece
            };
        }
        case 'RESET': {
            return {
                ...state,
                board: Array.from({ length: 9 }, () => Array(9).fill(null)),
                targetIndex: -1,
                nextPiece: 'X',
                isAIThinking: false
            }
        }
        case 'SET_AI_THINKING': {
            return {
                ...state,
                isAIThinking: action.payload
            }
        }
        default:
            return state;
    }
}

function calculateAIMove(board, targetIndex) {
    let i, j;
    let availableSubBoardIndex = [];
    let availableCellIndex = [];
    if (targetIndex === -1) {
        availableSubBoardIndex = board
            .map((subBoard, index) => ({ subBoard, index }))
            .filter(({ subBoard }) => calculateWinner(subBoard) === null)
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