import styles from './AIGame.module.css'
import Board from '@/componets/Board/Board.jsx';
import BackBtn from '@/componets/Buttons/BackBtn.jsx';
import ResetBtn from '@/componets/Buttons/ResetBtn.jsx';
import { useReducer, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom';
import { checkResult } from '@/utils/boardHelper.js';
import AIWorker from '@/utils/ai.worker.js?worker';

export default function AIGame() {
    const [state, dispatch] = useReducer(gameReducer, {
        board: Array.from({ length: 9 }, () => Array(9).fill(null)),
        targetIndex: -1,
        nextPiece: 'X',
        isAIThinking: false,
        isAutoPlayX: false,
        isAutoPlayO: true
    });
    const { board, targetIndex, nextPiece, isAIThinking, isAutoPlayX, isAutoPlayO } = state;
    //用useMemo优化计算，当仅设置ai思考状态board未改变时，无需重新计算
    const subResults = useMemo(() =>
        Array.from({ length: 9 }, (_, i) => checkResult(board[i])), [board]);
    const result = useMemo(() => checkResult(subResults), [subResults]);
    const [searchParams] = useSearchParams();
    const difficulty = searchParams.get('difficulty') || 'easy';
    const aiWorkerRef = useRef(null);

    const handlePlay = useCallback((i) => {
        return (j) => {
            dispatch({ type: 'HUMAN_PLAY', payload: { i, j } });
        };
    }, []);

    const initWorker = useCallback(() => {
        aiWorkerRef.current?.terminate();
        aiWorkerRef.current = new AIWorker();
        //监听Worker返回结果
        aiWorkerRef.current.onmessage = (e) => {
            const aiMove = e.data;
            console.log("主线程收到worker返回的结果:", aiMove);
            dispatch({ type: 'AI_PLAY', payload: { i: aiMove.i, j: aiMove.j } });
        };
    }, []);

    function reset() {
        dispatch({
            type: 'RESET'
        });
        initWorker();    // 终止旧任务，重建 Worker
    }

    //初始化Worker（组件挂载时创建一次）
    useEffect(() => {
        initWorker();

        return () => aiWorkerRef.current?.terminate();
    }, [initWorker]);

    //AI托管O落子
    useEffect(() => {
        if (!isAutoPlayO || nextPiece !== 'O' || result !== null || isAIThinking) return;

        dispatch({ type: 'SET_AI_THINKING', payload: true });
        //修复派发worker任务时页面卡顿问题：扁平化数组，减少结构化克隆开销
        aiWorkerRef.current.postMessage({ flatBoard: board.flat(), targetIndex, nextPiece, difficulty });
        console.log("O派发aiWorker任务");
        // 故意仅依赖 nextPiece和isAutoPlayO：只在轮次切换及开启托管时触发，isAIThinking 作为守卫防止重复派发
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nextPiece, isAutoPlayO]);

    //AI托管X落子
    useEffect(() => {
        if (!isAutoPlayX || nextPiece !== 'X' || result !== null || isAIThinking) return;

        dispatch({ type: 'SET_AI_THINKING', payload: true });
        aiWorkerRef.current.postMessage({ flatBoard: board.flat(), targetIndex, nextPiece, difficulty: 'test' });
        console.log("X派发aiWorker任务");
        // 故意仅依赖 nextPiece和isAutoPlayX：只在轮次切换及开启托管时触发，isAIThinking 作为守卫防止重复派发
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nextPiece, isAutoPlayX]);

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
                    isAutoPlayX={isAutoPlayX}
                    isAutoPlayO={isAutoPlayO}
                    onToggleX={() => dispatch({ type: 'TOGGLE_AUTO_PLAY_X' })}
                    onToggleO={() => dispatch({ type: 'TOGGLE_AUTO_PLAY_O' })}
                    difficulty={difficulty}
                />
            </div>
            <BackBtn />
        </div>
    );
}

const DIFFI_CONFIG = {
    'easy': "简单",
    'medium': "中等",
    'hard': "困难"
}

function InfoBox({ result, nextPiece, targetIndex, onReset, isAIThinking, isAutoPlayX, isAutoPlayO, onToggleX, onToggleO, difficulty }) {
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
            <label className={styles['auto-x-label']}>
                内测AI托管X：
                <input
                    className={styles['toggle-btn']}
                    type="checkbox"
                    checked={isAutoPlayX}
                    onChange={onToggleX}
                />
            </label>
            <label className={styles['auto-o-label']}>
                <span>{DIFFI_CONFIG[difficulty] ?? ''}</span>AI托管O：
                <input
                    className={styles['toggle-btn']}
                    type="checkbox"
                    checked={isAutoPlayO}
                    onChange={onToggleO}
                />
            </label>
            {result && <ResetBtn callback={onReset} />}
        </aside>
    );
}

function gameReducer(state, action) {
    switch (action.type) {
        case 'HUMAN_PLAY': {
            const { i, j } = action.payload;
            if (state.board[i][j] !== null) return state;   // 轻量守卫：仅防止覆盖已有棋子
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
        case 'AI_PLAY': {
            const { i, j } = action.payload;
            if (state.board[i][j] !== null) return state;
            const newBoard = [...state.board];
            newBoard[i] = [...state.board[i]];
            newBoard[i][j] = state.nextPiece;
            return {
                ...state,
                board: newBoard,
                targetIndex: checkResult(newBoard[j]) === null ? j : -1,
                nextPiece: state.nextPiece === 'X' ? 'O' : 'X',
                isAIThinking: false  // 重置isAIThinking锁
            };
        }
        case 'RESET': {
            return {
                ...state,
                board: Array.from({ length: 9 }, () => Array(9).fill(null)),
                targetIndex: -1,
                nextPiece: 'X',
                isAIThinking: false,
                isAutoPlayX: false,
                isAutoPlayO: true
            }
        }
        case 'SET_AI_THINKING': {
            return {
                ...state,
                isAIThinking: action.payload
            }
        }
        case 'TOGGLE_AUTO_PLAY_X': {
            return {
                ...state,
                isAutoPlayX: !state.isAutoPlayX
            }
        }
        case 'TOGGLE_AUTO_PLAY_O': {
            return {
                ...state,
                isAutoPlayO: !state.isAutoPlayO
            }
        }
        default:
            return state;
    }
}
