import styles from './Game.module.css';
import Board from '@/componets/Board/Board.jsx';
import BackBtn from '@/componets/Buttons/BackBtn.jsx';
import ResetBtn from '@/componets/Buttons/ResetBtn.jsx';
import { useReducer, useMemo, useCallback } from 'react';
import { checkResult } from '@/utils/boardHelper.js';

export default function Game() {
    const [state, dispatch] = useReducer(gameReducer, {
        board: Array.from({ length: 9 }, () => Array(9).fill(null)),
        targetIndex: -1,
        nextPiece: 'X'
    });
    const { board, targetIndex, nextPiece } = state;
    //用useMemo优化计算，当仅设置ai思考状态board未改变时，无需重新计算
    const subResults = useMemo(() =>
        Array.from({ length: 9 }, (_, i) => checkResult(board[i])), [board]);
    const result = useMemo(() => checkResult(subResults), [subResults]);

    const handlePlay = useCallback((i) => {
        return (j) => {
            dispatch({ type: 'PLAY', payload: { i, j } });
        };
    }, []);

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
                    isGameOver={result !== null}
                    isWaiting={false}
                />
                <InfoBox
                    result={result}
                    nextPiece={nextPiece}
                    targetIndex={targetIndex}
                    reset={reset}
                />
            </div>
            <BackBtn />
        </div>
    );
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
            {result && <ResetBtn callback={reset} />}
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