import { Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home/Home.jsx';
import Game from '@/pages/Game/Game.jsx';
import AIGame from '@/pages/AIGame/AIGame.jsx';

function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game" element={<Game />} />
            <Route path="/ai-game" element={<AIGame />} />
        </Routes>
    );
}

export default AppRouter;