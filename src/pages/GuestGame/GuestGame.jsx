import { useState, useEffect, useRef, useReducer, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import styles from './GuestGame.module.css';
import { checkResult } from '@/utils/boardHelper.js';
import Board from '@/components/Board/Board.jsx';
import BackBtn from '@/components/Buttons/BackBtn.jsx';

// const serverUrl = 'http://localhost:3001';
const serverUrl = 'https://ultimate-tic-tac-toe-28m2.onrender.com';

export default function GuestGame() {
    const socketRef = useRef(null);
    const roomCodeRef = useRef(null);   // 用ref防止初始化useEffect里的闭包
    const [roomCode, setRoomCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isGameStart, setIsGameStart] = useState(false);
    const [gameState, dispatch] = useReducer(gameReducer, {
        board: Array.from({ length: 9 }, () => Array(9).fill(null)),
        targetIndex: -1,
        nextPiece: 'X',
        myPiece: 'O'        // 我方执有的棋子，默认为O
    });
    const { board, targetIndex, nextPiece, myPiece } = gameState;
    const subResults = useMemo(() =>
        Array.from({ length: 9 }, (_, i) => checkResult(board[i])), [board]);
    const result = useMemo(() => checkResult(subResults), [subResults]);

    const handlePlay = useCallback((i) => {
        return (j) => {
            dispatch({ type: 'PLAY', payload: { i, j } });
            socketRef.current.emit('makeMove', {
                roomCode: roomCodeRef.current,  // 用ref保证始终是最新值
                move: { i, j }
            });
        };
    }, []);

    function reset() {
        dispatch({ type: 'RESET' });
    }

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
        // 连接到后端服务器
        const socket = io(serverUrl);
        socketRef.current = socket;

        // 连接/重连时触发（connect 在初连和重连都会触发）
        socket.on('connect', () => {
            if (roomCodeRef.current) {
                // 重连：重新加入已有房间
                socket.emit('rejoinRoom', { roomCode: roomCodeRef.current, role: 'guest' });
            }
            // 未加入房间时不做任何事，等待用户输入
        });

        // 监听加入成功
        socket.on('roomJoined', (data) => {
            setIsJoining(false);
            roomCodeRef.current = data.roomCode;    // 存储规范化的小写房间号
            setRoomCode(data.roomCode);
        });

        // 监听游戏开始
        socket.on('gameStart', () => {
            setIsGameStart(true);
        });

        // 监听房间过期（重连时房间已消失）
        socket.on('roomExpired', () => {
            roomCodeRef.current = null;
            setErrorMsg("房间已失效，请重新输入房间号");
            setIsGameStart(false);
            setRoomCode('');
            reset();
        });

        // 监听加入房间错误
        socket.on('joinError', ({ message }) => {
            setErrorMsg(message);
            setIsJoining(false);
        });

        // 监听对手落子
        socket.on('moveMade', ({ move }) => {
            dispatch({ type: 'PLAY', payload: move });
        });

        // 监听游戏重置
        socket.on('gameReset', () => {
            reset();
        });

        // 清理函数
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
                isWaiting={nextPiece !== myPiece}
            />
            <InfoBox
                result={result}
                nextPiece={nextPiece}
                targetIndex={targetIndex}
                myPiece={myPiece}
            />
        </div>
    ) : (
        <>
            <label>请输入房间号：</label>
            <span>
                <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    disabled={isJoining}
                    maxLength="5"
                    placeholder="xxxxx"
                    size="12"
                />
                <button onClick={handleJoinRoom} disabled={isJoining}>连接</button>
            </span>

            <p>不知道这是什么？问问你创建房间的朋友，他们会知道的</p>

            <p className={styles['error-msg']}>{errorMsg}</p>
        </>
    )

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
        case 'RESET': {
            return {
                ...state,
                board: Array.from({ length: 9 }, () => Array(9).fill(null)),
                targetIndex: -1,
                nextPiece: 'X'
            }
        }
        default:
            return state;
    }
}