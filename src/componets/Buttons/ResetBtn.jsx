import styles from './ResetBtn.module.css';

export default function ResetBtn({callback}) {
    return (
        <button className={styles['reset-btn']} onClick={callback}>重置</button>
    )
}