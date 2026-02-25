import styles from './Board.module.css'

export default function Board({ board, targetIndex, onPlay, subResults, isGameOver, isWaiting }) {
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
                                isTarget={!isGameOver && index === targetIndex}
                                isActive={!isGameOver && !isWaiting && (targetIndex === -1 || index === targetIndex)}
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