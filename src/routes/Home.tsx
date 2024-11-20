import React from 'react';
import Highscores from "../components/Highscores";
import Button from "../components/Button";
import '../style/Home.css';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
    const navigate = useNavigate();

    const handlePlayClick = (): void => {
        navigate('/game');
    };

    return (
        <div className="home-container">
            <h1 className="game-title">Welcome to AlphaBeat!</h1>
            <div className="intro-section">
                <h2 className="game-tagline">Are you ready to smash some letters?</h2>
                {/* Play Button */}
                <Button text="Play Now" onClick={handlePlayClick} className="btn-large" />

                {/* Highscores */}
                <Highscores />
            </div>
        </div>
    );
}

export default Home;
