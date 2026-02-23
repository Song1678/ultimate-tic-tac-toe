import styles from './ToggleBtn.module.css';

export default function ToggleBtn({ isChecked, callback }) {
    return (
        <input
            className={styles['toggle-btn']}
            type="checkbox"
            checked={isChecked}
            onClick={callback}
        />
    );
}