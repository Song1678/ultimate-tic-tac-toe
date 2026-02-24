import styles from './AIGame.module.css'
import Board from '@/componets/Board/Board.jsx';
import BackBtn from '@/componets/Buttons/BackBtn.jsx';
import ResetBtn from '@/componets/Buttons/ResetBtn.jsx';
import { useReducer, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom';
import { checkResult } from '@/utils/boardHelper.js';
import AIWorker from '@/utils/ai.worker.js?worker';

export default function Game() {
    const [state, dispatch] = useReducer(gameReducer, {
        board: Array.from({ length: 9 }, () => Array(9).fill(null)),
        targetIndex: -1,
        nextPiece: 'X',
        isAIThinking: false,
        isAutoPlay: false
    });
    const { board, targetIndex, nextPiece, isAIThinking, isAutoPlay } = state;
    //用useMemo优化计算，当仅设置ai思考状态board未改变时，无需重新计算
    const subResults = useMemo(() =>
        Array.from({ length: 9 }, (_, i) => checkResult(board[i])), [board]);
    const result = useMemo(() => checkResult(subResults), [subResults]);
    const [searchParams] = useSearchParams();
    const difficulty = searchParams.get('difficulty') || 'easy';
    const aiWorkerRef = useRef(null);

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

    //初始化Worker（组件挂载时创建一次）
    useEffect(() => {
        aiWorkerRef.current = new AIWorker();
        //监听Worker返回结果
        aiWorkerRef.current.onmessage = (e) => {
            const aiMove = e.data;
            console.log("主线程收到worker返回的结果:", aiMove);
            dispatch({ type: 'PLAY', payload: { i: aiMove.i, j: aiMove.j } });
            dispatch({ type: 'SET_AI_THINKING', payload: false });
        };

        return () => {
            if (aiWorkerRef.current) {
                aiWorkerRef.current.terminate();
                aiWorkerRef.current = null;
            }
        };
    }, []);

    //AI(O)自动落子
    useEffect(() => {
        if (nextPiece !== 'O' || result !== null || isAIThinking) return;

        dispatch({ type: 'SET_AI_THINKING', payload: true });
        //修复派发worker任务时页面卡顿问题：扁平化数组，减少结构化克隆开销
        aiWorkerRef.current.postMessage({ flatBoard: board.flat(), targetIndex, nextPiece, difficulty });
        console.log("O派发aiWorker任务");
        // 故意仅依赖 nextPiece：只在轮次切换时触发，isAIThinking 作为守卫防止重复派发
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nextPiece]);

    //AI托管X落子
    useEffect(() => {
        if (!isAutoPlay || nextPiece !== 'X' || result !== null || isAIThinking) return;

        dispatch({ type: 'SET_AI_THINKING', payload: true });
        aiWorkerRef.current.postMessage({ flatBoard: board.flat(), targetIndex, nextPiece, difficulty: 'test' });
        console.log("X派发aiWorker任务");
        // 故意仅依赖 nextPiece和isAutoPlay：只在轮次切换及开启托管时触发，isAIThinking 作为守卫防止重复派发
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nextPiece, isAutoPlay]);

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
                    isWaiting={isAIThinking}
                />
                <InfoBox
                    result={result}
                    nextPiece={nextPiece}
                    targetIndex={targetIndex}
                    onReset={reset}
                    isAIThinking={isAIThinking}
                    isAutoPlay={isAutoPlay}
                    onToggle={() => dispatch({ type: 'TOGGLE_AUTO_PLAY' })}
                />
            </div>
            <BackBtn />
        </div>
    );
}

function InfoBox({ result, nextPiece, targetIndex, onReset, isAIThinking, onToggle, isAutoPlay }) {
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

    const hintText = isAIThinking ?
        "AI正在思考...." :
        (targetIndex !== -1 ? "请在指定区域落子" : "请在任意区域落子");

    return (
        <aside className={styles['info-box']}>
            <h2>{titleContent}</h2>
            {!result && <p>{hintText}</p>}
            <label className={styles['auto-label']}>测试AI托管X：
                <input
                    className={styles['toggle-btn']}
                    type="checkbox"
                    checked={isAutoPlay}
                    onChange={onToggle}
                />
            </label>
            {result && <ResetBtn callback={onReset} />}
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
                ...state,
                board: Array.from({ length: 9 }, () => Array(9).fill(null)),
                targetIndex: -1,
                nextPiece: 'X',
                isAIThinking: false,
                isAutoPlay: false
            }
        }
        case 'SET_AI_THINKING': {
            return {
                ...state,
                isAIThinking: action.payload
            }
        }
        case 'TOGGLE_AUTO_PLAY': {
            return {
                ...state,
                isAutoPlay: !state.isAutoPlay
            }
        }
        default:
            return state;
    }
}
