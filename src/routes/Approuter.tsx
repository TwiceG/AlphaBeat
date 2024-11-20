import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import Highscore from "./Highscore";
import Game from  './Game';



function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/highscores" element={<Highscore />} />
            <Route path="/game" element={<Game />} />
        </Routes>
    );
}

export default AppRouter;