import { useState, useEffect, useRef, useReducer, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import styles from './HostGame.module.css';
import { checkResult } from '@/utils/boardHelper.js';
import Board from '@/components/Board/Board.jsx';
import BackBtn from '@/components/Buttons/BackBtn.jsx';
import ResetBtn from '@/components/Buttons/ResetBtn.jsx';

// const serverUrl = 'http://localhost:3001';
const serverUrl = 'https://ultimate-tic-tac-toe-28m2.onrender.com';


export default function HostGame() {
    const [roomCode, setRoomCode] = useState(null);
    const [isGameStart, setIsGameStart] = useState(false);
    const socketRef = useRef(null);
    const roomCodeRef = useRef(null);   // 用ref防止初始化useEffect里的闭包
    const [gameState, dispatch] = useReducer(gameReducer, {
        board: Array.from({ length: 9 }, () => Array(9).fill(null)),
        targetIndex: -1,
        nextPiece: 'X',
        myPiece: 'X'            // 我方执有的棋子，默认为X
    });
    const { board, targetIndex, nextPiece, myPiece } = gameState;
    const subResults = useMemo(() =>
        Array.from({ length: 9 }, (_, i) => checkResult(board[i])), [board]);
    const result = useMemo(() => checkResult(subResults), [subResults]);

    const handlePlay = useCallback((i) => {
        return (j) => {
            dispatch({ type: 'PLAY', payload: { i, j } });
            socketRef.current.emit('makeMove', {
                roomCode,
                move: { i, j }
            });
        };
    }, [roomCode]);

    function reset() {
        dispatch({ type: 'RESET' });
        socketRef.current.emit('resetGame', { roomCode });
    }

    useEffect(() => {
        // 连接到后端服务器
        const socket = io(serverUrl);
        socketRef.current = socket;

        // 连接/重连时触发（connect 在初连和重连都会触发）
        socket.on('connect', () => {
            if (roomCodeRef.current) {
                // 重连：重新加入已有房间
                socket.emit('rejoinRoom', { roomCode: roomCodeRef.current });
            } else {
                // 初次连接：创建新房间
                socket.emit('createRoom');
            }
        });

        // 监听房间创建成功
        socket.on('roomCreated', (data) => {
            setRoomCode(data.roomCode);
            roomCodeRef.current = data.roomCode;    // 同时更新ref
        });

        // 监听房间过期
        socket.on('roomExpired', () => {
            socket.emit('createRoom');  // 房间没了（服务器重启），重新创建
        });

        // 监听游戏开始
        socket.on('gameStart', () => {
            console.log("游戏开始");
            setIsGameStart(true);
        });

        // 监听对手落子
        socket.on('moveMade', ({ move }) => {
            console.log("Host监听到对方落子:", move);
            dispatch({ type: 'PLAY', payload: move });
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
                reset={reset}
                myPiece={myPiece}
            />
        </div>
    ) : (
        <>
            <p>房间号：{roomCode ?? "加载中..."}</p>
            {roomCode && <p>{"请将该房间号告诉你的朋友"}</p>}
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
            }
        }
        default:
            return state;
    }
}