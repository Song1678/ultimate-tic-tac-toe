import styles from './Home.module.css'
import singlePng from '@/assets/single.png'
import multiPng from '@/assets/multi.png'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>终极井字棋</h1>
            <OptionView />
        </div>
    );
}

function OptionView() {
    const [currView, setCurrView] = useState("start");
    const navigate = useNavigate();

    const viewConfig = {
        start: {
            startSecClassName: "",
            diffiSecClassName: styles['hide-down'],
            webSecClassName: styles['hide-down'],
            roomSecClassName: styles['hide-down'],
        },
        difficulty: {
            startSecClassName: styles['hide-up'],
            diffiSecClassName: "",
            webSecClassName: styles['hide-down'],
            roomSecClassName: styles['hide-down'],
        },
        web: {
            startSecClassName: styles['hide-up'],
            diffiSecClassName: styles['hide-down'],
            webSecClassName: "",
            roomSecClassName: styles['hide-down'],
        },
        room: {
            startSecClassName: styles['hide-up'],
            diffiSecClassName: styles['hide-down'],
            webSecClassName: styles['hide-up'],
            roomSecClassName: "",
        }
    };
    const { startSecClassName, diffiSecClassName, webSecClassName, roomSecClassName } =
        viewConfig[currView] || viewConfig.start;
    const resetBtnClassName = styles['reset-btn'] + (currView === "start" ? ` ${styles.hide}` : "");

    return (
        <>
            <div className={styles['option-wrap']}>
                <section className={startSecClassName}>
                    <div className={`${styles['opt']} ${styles['start-opt']}`}
                        onClick={() => { setCurrView("difficulty") }}
                    >
                        <img src={singlePng} />
                        <p>单人模式</p>
                    </div>
                    <div className={`${styles['opt']} ${styles['start-opt']}`}
                        onClick={() => { setCurrView("web") }}
                    >
                        <img src={multiPng} />
                        <p>双人模式</p>
                    </div>
                </section>
                <section className={diffiSecClassName}>
                    <div className={`${styles['opt']} ${styles['difficulty-opt']}`}
                        onClick={() => navigate("/ai-game?difficulty=easy")}
                    >
                        <h2>简单</h2>
                        <p>AI随机落子</p>
                    </div>
                    <div className={`${styles['opt']} ${styles['difficulty-opt']}`}
                        onClick={() => navigate("/ai-game?difficulty=medium")}
                    >
                        <h2>中等</h2>
                        <p>AI避免愚蠢落子</p>
                    </div>
                    <div className={`${styles['opt']} ${styles['difficulty-opt']}`}
                        onClick={() => navigate("/ai-game?difficulty=hard")}
                    >
                        <h2>困难</h2>
                        <p>AI选择较佳落子</p>
                    </div>
                </section>
                <section className={webSecClassName}>
                    <div className={`${styles['opt']} ${styles['web-opt']}`}
                        onClick={() => navigate('/game')}
                    >
                        <h2>本地</h2>
                        <p>在同一个设备上进行游戏</p>
                    </div>
                    <div className={`${styles['opt']} ${styles['web-opt']}`}
                        onClick={() => { setCurrView("room") }}
                    >
                        <h2>联网</h2>
                        <p>在互联网上进行游戏</p>
                    </div>
                </section>
                <section className={roomSecClassName}>
                    <div className={`${styles['opt']} ${styles['room-opt']}`}>
                        <h2>创建游戏</h2>
                        <p>创建一个新游戏并让你的朋友加入</p>
                    </div>
                    <div className={`${styles['opt']} ${styles['room-opt']}`}>
                        <h2>加入游戏</h2>
                        <p>加入你的朋友创建的一个游戏</p>
                    </div>
                </section>
            </div>
            <button className={resetBtnClassName} onClick={() => { setCurrView("start") }}>重置</button>
        </>
    )
}