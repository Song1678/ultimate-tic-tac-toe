import { useState, useEffect, useRef, useReducer, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import styles from './HostGame.module.css';
import { checkResult } from '@/utils/boardHelper.js';
import Board from '@/components/Board/Board.jsx';
import BackBtn from '@/components/Buttons/BackBtn.jsx';
import ResetBtn from '@/components/Buttons/ResetBtn.jsx';
import PieceFlip from '@/components/PieceFlip/PieceFlip.jsx';

// const serverUrl = 'http://localhost:3001';
const serverUrl = 'https://ultimate-tic-tac-toe-28m2.onrender.com';
// const serverUrl = 'https://ultimatettt.site'

const FLIP_DURATION = 6000; // PieceFlip 动画 5s + 缓冲 1s

export default function HostGame() {
    const [roomCode, setRoomCode] = useState(null);
    const [phase, setPhase] = useState('waiting');   // 'waiting' -> 'reveal' -> 'playing'
    const [isPending, setIsPending] = useState(false);  // 发送落子请求后加锁防止网络延迟期间多次落子
    const socketRef = useRef(null);
    const roomCodeRef = useRef(null);

    const [gameState, dispatch] = useReducer(gameReducer, {
        board: Array.from({ length: 9 }, () => Array(9).fill(null)),
        targetIndex: -1,
        nextPiece: 'X'
    });
    const [myPiece, setMyPiece] = useState(null);
    const { board, targetIndex, nextPiece } = gameState;
    const subResults = useMemo(() =>
        Array.from({ length: 9 }, (_, i) => checkResult(board[i])), [board]);
    const result = useMemo(() => checkResult(subResults), [subResults]);

    const handlePlay = useCallback((i) => {
        return (j) => {
            setIsPending(true);
            socketRef.current.emit('makeMove', {
                roomCode: roomCodeRef.current,
                move: { i, j }
            });
        };
    }, []);

    function reset() {
        socketRef.current.emit('resetGame', { roomCode: roomCodeRef.current });
    }

    // 进入 reveal 阶段，动画结束后自动切到 playing
    function startReveal(gs, myPiece) {
        setMyPiece(myPiece);
        dispatch({ type: 'SYNC', payload: gs });
        setPhase('reveal');
        setTimeout(() => setPhase('playing'), FLIP_DURATION);
    }

    useEffect(() => {
        const socket = io(serverUrl);
        socketRef.current = socket;

        socket.on('connect', () => {
            if (socket.recovered) {
                // 连接恢复成功：socket.id 不变，房间关系保留，无需任何操作
                console.log('Connection recovered successfully');
                return;
            }

            // 恢复失败或首次连接
            if (roomCodeRef.current) {
                // 之前有房间，请求同步
                socket.emit('requestSync', { roomCode: roomCodeRef.current, role: 'host' });
            } else {
                // 首次连接，创建房间
                socket.emit('createRoom');
            }
        });

        // 房间创建成功（首次创建 或 requestSync 时游戏尚未开始）
        socket.on('roomCreated', (data) => {
            setRoomCode(data.roomCode);
            roomCodeRef.current = data.roomCode;
        });

        // 房间过期（requestSync 时房间已不存在）
        socket.on('roomExpired', () => {
            roomCodeRef.current = null;
            setPhase('waiting');
            socket.emit('createRoom');
        });

        // 游戏开始（guest 加入时触发）
        socket.on('gameStart', ({ gameState: gs, myPiece }) => {
            setIsPending(false);
            startReveal(gs, myPiece)
        });

        // 恢复失败后的状态同步
        socket.on('gameSync', ({ gameState: gs, myPiece }) => {
            setIsPending(false);
            setMyPiece(myPiece)
            dispatch({ type: 'SYNC', payload: gs });
            setPhase('playing');
        });

        // 后端落子消息
        socket.on('moveMade', ({ move }) => {
            dispatch({ type: 'PLAY', payload: move });
            setIsPending(false);
        });

        // 后端重置消息
        socket.on('gameReset', ({ myPiece }) => {
            setIsPending(false);
            startReveal(initialGameState(), myPiece);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    let mainContent;
    if (phase === 'waiting') {
        mainContent = (
            <div className={styles['setup-wrap']}>
                <h2 className={styles['sub-title']}>房间号</h2>
                <p>你的房间号是:</p>
                <p><code className={styles['room-code']}>{roomCode ?? "Loading..."}</code></p>
                <p>请将该房间号告诉你的好友,游戏将在你的好友加入该房间后自动开始</p>
                <p>请<strong>不要</strong>长时间离开该页面，并保持页面处于活跃状态，否则该房间号会在你离开3分钟后过期</p>
            </div>
        )
    } else if (phase === 'reveal') {
        mainContent = (
            <div className={styles['reveal-wrap']}>
                <h2>你的棋子是</h2>
                <PieceFlip piece={myPiece} />
            </div>
        )
    } else {
        mainContent = (
            <div className={styles['game-wrap']}>
                <Board
                    board={board}
                    targetIndex={targetIndex}
                    onPlay={handlePlay}
                    subResults={subResults}
                    isGameOver={result !== null}
                    isWaiting={nextPiece !== myPiece || isPending}
                />
                <InfoBox
                    result={result}
                    nextPiece={nextPiece}
                    targetIndex={targetIndex}
                    reset={reset}
                    myPiece={myPiece}
                />
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>终极井字棋</h1>
            {mainContent}
            <BackBtn />
        </div>
    );
}

function InfoBox({ result, nextPiece, targetIndex, reset, myPiece }) {
    const XElement = <span style={{ color: '#c0392b' }}>X</span>;
    const OElement = <span style={{ color: '#16a085' }}>O</span>;
    const myPieceElement = myPiece === 'X' ? XElement : OElement;

    const stateText = result ?
        (result === 'T' ? '平局!' : (result === myPiece ? '你赢了!' : '你输了!')) :
        (myPiece === nextPiece ? "我方回合" : "对手回合");

    const titleContent = <>你是 {myPieceElement} - {stateText}</>;

    const hintText = myPiece === nextPiece ?
        (targetIndex !== -1 ? "请在指定区域落子" : "请在任意区域落子") :
        "请等待你的对手落子";

    return (
        <aside className={styles['info-box']}>
            <h2>{titleContent}</h2>
            {!result && <p>{hintText}</p>}
            {result && <ResetBtn callback={reset} />}
        </aside>
    );
}

function initialGameState() {
    return {
        board: Array.from({ length: 9 }, () => Array(9).fill(null)),
        targetIndex: -1,
        nextPiece: 'X',
    };
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
        case 'SYNC': {
            const { board, targetIndex, nextPiece } = action.payload;
            return {
                ...state,
                board,
                targetIndex,
                nextPiece
            };
        }
        default:
            return state;
    }
}