import styles from './Game.module.css'
import { useReducer } from 'react'
import { useNavigate } from 'react-router-dom';
import { checkResult } from '@/utils/boardHelper.js';

export default function Game() {
    const [state, dispatch] = useReducer(gameReducer, {
        board: Array.from({ length: 9 }, () => Array(9).fill(null)),
        targetIndex: -1,
        nextPiece: 'X'
    });
    const { board, targetIndex, nextPiece } = state;
    const subResults = Array.from({ length: 9 }, (_, i) => checkResult(board[i]));
    const result = checkResult(subResults);
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

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>终极井字棋</h1>
            <div className={styles['game-wrap']}>
                <Board
                    board={board}
                    targetIndex={targetIndex}
                    onPlay={handlePlay}
                    subResults={subResults}
                    canPlay={result === null}
                />
                <InfoBox
                    result={result}
                    nextPiece={nextPiece}
                    targetIndex={targetIndex}
                    reset={reset}
                />
            </div>
            <button className={styles['back-btn']} onClick={() => navigate('/')}>返回</button>
        </div>
    );
}

function Board({ board, targetIndex, onPlay, subResults, canPlay }) {
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
                                isTarget={canPlay && index === targetIndex}
                                isActive={canPlay && (targetIndex === -1 || index === targetIndex)}
                                result={subResults[index]}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function SubBoard({ subBoard, onPlay, isTarget, isActive, result }) {
    let subBoardClassName = styles['sub-board'];
    if (result === 'X') subBoardClassName += ` ${styles['x-board']}`;
    if (result === 'O') subBoardClassName += ` ${styles['o-board']}`;
    if (result === 'T') subBoardClassName += ` ${styles['t-board']}`;
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

function InfoBox({ result, nextPiece, targetIndex, reset }) {
    const XElement = <span style={{ color: '#c0392b' }}>X</span>;
    const OElement = <span style={{ color: '#16a085' }}>O</span>;

    const currentPieceElement = result ?
        (result === 'X' ? XElement : OElement) :
        (nextPiece === 'X' ? XElement : OElement);

    const titleContent = result ? (
        result === 'T' ? (<span>平局!</span>) : (<> {currentPieceElement} <span>方获胜!</span> </>)
    ) : (
        <> {currentPieceElement} <span>方落子</span> </>
    );

    const hintText = targetIndex !== -1 ? "请在指定区域落子" : "请在任意区域落子";

    return (
        <aside className={styles['info-box']}>
            <h2>{titleContent}</h2>
            {!result && <p>{hintText}</p>}
            {result && <button className={styles['reset-btn']} onClick={() => reset()}>重置</button>}
        </aside>
    );
}

function gameReducer(state, action) {
    switch (action.type) {
        case 'PLAY': {
            const { i, j } = action.payload;
            const newBoard = [...state.board];
            newBoard[i] = [...state.board[i]];
            newBoard[i][j] = state.nextPiece;
            const newTargetIndex = checkResult(newBoard[j]) === null ? j : -1;
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
                board: Array.from({ length: 9 }, () => Array(9).fill(null)),
                targetIndex: -1,
                nextPiece: 'X'
            }
        }
        default:
            return state;
    }
}