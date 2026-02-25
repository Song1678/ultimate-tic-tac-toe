import { useState, useEffect, useRef, useReducer, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import styles from './HostGame.module.css';
import { checkResult } from '@/utils/boardHelper.js';
import Board from '@/components/Board/Board.jsx';
import BackBtn from '@/components/Buttons/BackBtn.jsx'

const serverUrl = 'http://localhost:3001';  // 部署时需要修改为实际服务器地址

export default function HostGame() {
    const [roomCode, setRoomCode] = useState(null);
    const [isGameStart, setIsGameStart] = useState(false);
    const socketRef = useRef(null); // 使用 useRef 存储 socket 实例
    const [gameState, dispatch] = useReducer(gameReducer, {
        board: Array.from({ length: 9 }, () => Array(9).fill(null)),
        targetIndex: -1,
        nextPiece: 'X'
    });
    const { board, targetIndex, nextPiece } = gameState;
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

    useEffect(() => {
        // 连接到后端服务器
        const socket = io(serverUrl);
        socketRef.current = socket; // 存储到 ref 中

        // 创建房间
        socket.emit('createRoom');

        // 监听房间创建成功
        socket.on('roomCreated', (data) => {
            setRoomCode(data.roomCode);
        });

        // 监听游戏开始
        socket.on('gameStart', () => {
            setIsGameStart(true);
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
                isWaiting={false}
            />
            <InfoBox
                result={result}
                nextPiece={nextPiece}
                targetIndex={targetIndex}
                reset={reset}
            />
        </div>
    ) : (
        <p>房间号：{roomCode ?? "加载中..."}</p>
    )

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>终极井字棋</h1>
            {mainContent}
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