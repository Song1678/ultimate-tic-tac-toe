import {Routes, Route} from 'react-router-dom';
import Home from '@/pages/Home/Home.jsx';
import Game from '@/pages/Game/Game.jsx'

function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game" element={<Game />} />
        </Routes>
    );
}

export default AppRouter;