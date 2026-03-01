import styles from './PieceFlip.module.css';
import { useEffect, useState } from 'react';

export default function PieceFlip({ piece }) {
    const [isFlip, setIsFlip] = useState(false);
    const cardClassName = `${styles['card']} 
        ${isFlip ? (piece === 'X' ? styles['flip-x'] : styles['flip-o']) : ''}`;
    useEffect(() => {
        // 用requestAnimationFrame解决浏览器合并一次渲染动画不显示问题
         const rafId = requestAnimationFrame(() => { 
            setIsFlip(true);
        });
        return () => cancelAnimationFrame(rafId);
    }, [piece]);

    return (
        <div className={styles['card-wrap']}>
            <div className={cardClassName}>
                <div className={`${styles['card-front']}`}>X</div>
                <div className={`${styles['card-back']}`}>O</div>
            </div>
        </div>
    )
}
