import { Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home/Home.jsx';
import Game from '@/pages/Game/Game.jsx';
import AIGame from '@/pages/AIGame/AIGame.jsx';
import HostGame from '@/pages/HostGame/HostGame.jsx';
import GuestGame from '@/pages/GuestGame/GuestGame.jsx';

function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game" element={<Game />} />
            <Route path="/ai-game" element={<AIGame />} />
            <Route path="/host-game" element={<HostGame />} />
            <Route path="/guest-game" element={<GuestGame />} />
        </Routes>
    );
}

export default AppRouter;