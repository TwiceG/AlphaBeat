import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import Highscore from "./Highscore";



function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/highscores" element={<Highscore />} />
        </Routes>
    );
}

export default AppRouter;