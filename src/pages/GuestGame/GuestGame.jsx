import { useState, useEffect, useRef, useReducer, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import styles from './GuestGame.module.css';
import { checkResult } from '@/utils/boardHelper.js';
import Board from '@/components/Board/Board.jsx';
import BackBtn from '@/components/Buttons/BackBtn.jsx';

// const serverUrl = 'http://localhost:3001';
// const serverUrl = 'https://ultimate-tic-tac-toe-28m2.onrender.com';
const serverUrl = 'https://ultimatettt.site'

export default function GuestGame() {
    const socketRef = useRef(null);
    const roomCodeRef = useRef(null);
    const [roomCode, setRoomCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isGameStart, setIsGameStart] = useState(false);
    const [isPending, setIsPending] = useState(false);  // 发送落子请求后加锁防止网络延迟期间多次落子

    const [gameState, dispatch] = useReducer(gameReducer, {
        board: Array.from({ length: 9 }, () => Array(9).fill(null)),
        targetIndex: -1,
        nextPiece: 'X',
        myPiece: 'O'
    });
    const { board, targetIndex, nextPiece, myPiece } = gameState;
    const subResults = useMemo(() =>
        Array.from({ length: 9 }, (_, i) => checkResult(board[i])), [board]);
    const result = useMemo(() => checkResult(subResults), [subResults]);

    const handlePlay = useCallback((i) => {
        return (j) => {
            socketRef.current.emit('makeMove', {
                roomCode: roomCodeRef.current,
                move: { i, j }
            });
            setIsPending(true);
        };
    }, []);

    function handleJoinRoom() {
        const code = roomCode.trim().toLowerCase();
        if (code.length !== 5) {
            setErrorMsg("请输入5位字符的房间号");
            return;
        }
        setIsJoining(true);
        setErrorMsg('');
        socketRef.current.emit('joinRoom', { roomCode: code });
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

            // 恢复失败：如果之前已在游戏中，请求同步
            if (roomCodeRef.current) {
                socket.emit('requestSync', { roomCode: roomCodeRef.current, role: 'guest' });
            }
            // 否则等待用户输入房间号
        });

        // 加入房间成功
        socket.on('roomJoined', (data) => {
            setIsJoining(false);
            roomCodeRef.current = data.roomCode;
            setRoomCode(data.roomCode);
        });

        // 游戏开始（加入房间后触发）
        socket.on('gameStart', ({ gameState: gs }) => {
            setIsPending(false);
            dispatch({ type: 'SYNC', payload: gs });
            setIsGameStart(true);
        });

        // 恢复失败后的状态同步
        socket.on('gameSync', ({ gameState: gs }) => {
            setIsPending(false);
            dispatch({ type: 'SYNC', payload: gs });
            setIsGameStart(true);
        });

        // 房间过期（requestSync 时房间已不存在）
        socket.on('roomExpired', () => {
            roomCodeRef.current = null;
            setErrorMsg("房间已失效，请重新输入房间号");
            setIsGameStart(false);
            setRoomCode('');
            dispatch({ type: 'RESET' });
        });

        // 加入房间错误
        socket.on('joinError', ({ message }) => {
            setErrorMsg(message);
            setIsJoining(false);
        });

        // 落子消息
        socket.on('moveMade', ({ move }) => {
            dispatch({ type: 'PLAY', payload: move });
            setIsPending(false);
        });

        // 重置消息
        socket.on('gameReset', () => {
            setIsPending(false);
            dispatch({ type: 'RESET' });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const mainContent = isGameStart ? (
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
                myPiece={myPiece}
            />
        </div>
    ) : (
        <div className={styles['setup-wrap']}>
            <h2 className={styles['sub-title']}>房间号</h2>
            <p>请输入房间号:</p>
            <p>
                <input
                    type="text"
                    name="room-code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    disabled={isJoining}
                    maxLength="5"
                    placeholder="xxxxx"
                />
            </p>
            <p>
                <button className={styles['connect-btn']} onClick={handleJoinRoom} disabled={isJoining}>连接</button>
            </p>
            <p>不知道房间号是什么？问问你创建房间的好友，他们会知道的</p>
            <p className={styles['error-msg']}>{errorMsg}</p>
        </div>
    );

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>终极井字棋</h1>
            {mainContent}
            <BackBtn />
        </div>
    );
}

function InfoBox({ result, nextPiece, targetIndex, myPiece }) {
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
        case 'SYNC': {
            const { board, targetIndex, nextPiece } = action.payload;
            return {
                ...state,
                board,
                targetIndex,
                nextPiece
            };
        }
        case 'RESET': {
            return {
                ...state,
                board: Array.from({ length: 9 }, () => Array(9).fill(null)),
                targetIndex: -1,
                nextPiece: 'X'
            };
        }
        default:
            return state;
    }
}