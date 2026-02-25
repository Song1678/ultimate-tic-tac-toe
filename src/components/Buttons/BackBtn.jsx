import styles from './BackBtn.module.css'
import { useNavigate } from 'react-router-dom'

export default function BackBtn() {
    const navigate = useNavigate();
    return (
        <button className={styles['back-btn']} onClick={() => navigate('/')}>返回</button>
    )
}