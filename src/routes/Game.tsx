import { useState, useEffect, useRef } from 'react';
import Button from '../components/Button'; 
import { guess } from 'web-audio-beat-detector'; // Import BPM detection library
import '../style/Game.css';  
import supabase from '../SupaBaseClient';
import { Highscore } from '../types/highscore';

// Define types for the music data
interface Music {
    id: number;
    name: string;
    url: string;
}

const Game: React.FC = () => {
    const [musicList, setMusicList] = useState<Music[]>([]); // State for music list
    const [selectedMusic, setSelectedMusic] = useState<string | null>(null); // State for selected music
    // const [BPM, setBPM] = useState<number>(120);  // State for BPM, defaulting to 120
    const [beatInterval, setBeatInterval] = useState<number>((60 / 120) * 1000 * 2); // State for beat interval
    const [fallingLetters, setFallingLetters] = useState<string[]>([]); // State for falling letters
    const gameBoxRef = useRef<HTMLDivElement | null>(null); // Ref for game box
    const [errorVisible, setErrorVisible] = useState<boolean>(false); // State for error visibility
    const [score, setScore] = useState<number>(0); // State for score
    const [isGameActive, setIsGameActive] = useState<boolean>(true); // State to track if the game is active
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null); // State to store interval ID
    const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false); // State for popup visibility
    const [playerName, setPlayerName] = useState<string>(''); // Player's name
    const proxyUrl = 'http://localhost:8000';

    const audioContext = new (window.AudioContext || window.webkitAudioContext)(); // Audio context for decoding audio

    // Fetch music list from SupaBase
    useEffect(() => {
        const fetchMusicList = async () => {
            try {
                const { data, error } = await supabase
                    .from('songs') 
                    .select('*');

                if (error) {
                    console.error('Error fetching music list:', error.message);
                    return;
                }

                console.log("Music List:", data);

                if (Array.isArray(data)) {
                    setMusicList(data);
                    setSelectedMusic(data[0]?.url); 
                } else {
                    console.error("Expected an array but received:", data);
                }
            } catch (error) {
                console.error("Error fetching music list", error);
            }
        };

        fetchMusicList();
    }, []);

    // Fetch and calculate BPM from the selected song
    useEffect(() => {
        const fetchSongBPM = async (songUrl: string) => {
            try {
                // Trim the URL from the proxyUrl
                const trimmedUrl = songUrl.replace(proxyUrl, '');

                // Encode only the parts that need it
                const encodedUrl = trimmedUrl.split('/').map(part => encodeURIComponent(part)).join('/');

                // Combine it with the proxyUrl to get the full URL
                const fullUrl = `${encodedUrl}`;
                console.log("Full URL for BPM calculation:", fullUrl); // Log the full URL for debugging

                const response = await fetch(fullUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();

                // Create an audio buffer
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                // Use BPM detection logic
                const { bpm } = await guess(audioBuffer); // Use the guess function to detect BPM
                // setBPM(bpm); // Update BPM state

                // Calculate beatInterval based on the detected BPM
                const beatsPerSecond = bpm / 60;  // Consistent with the calculation in the second useEffect
                const newBeatInterval = (1 / beatsPerSecond) * 1000; // Convert to milliseconds
                setBeatInterval(newBeatInterval); // Update beatInterval based on new BPM

                console.log("Calculated BPM:", bpm);
                console.log("Calculated Beat Interval:", newBeatInterval);
            } catch (error) {
                console.error("Error detecting BPM:", error);
            }
        };

        if (selectedMusic) {
            fetchSongBPM(selectedMusic); // Fetch BPM for the trimmed song URL
        }
    }, [selectedMusic]);

    // Letter generation effect based on BPM
    useEffect(() => {
        if (!selectedMusic) return;

        const audio = document.getElementById('game-audio') as HTMLAudioElement;

        const handleMusicStart = () => {
            // Clear any existing interval before setting a new one
            if (intervalId) clearInterval(intervalId);

            // Reset falling letters and score when music changes
            setFallingLetters([]); // Clear any existing falling letters
            setScore(0); // Reset score or maintain based on your game logic
            setIsGameActive(true); // Activate the game when music starts

            // Use the beatInterval that's now calculated consistently
            const newIntervalId = setInterval(() => {
                if (isGameActive) {
                    generateFallingLetter(); // Generate a new falling letter
                }
            }, beatInterval); // Use the updated beat interval from BPM detection
            setIntervalId(newIntervalId); // Store the interval ID

            audio.addEventListener('ended', () => {
                if (intervalId) clearInterval(intervalId); // Stop generating letters when music ends
                setIsGameActive(false); // Set game as inactive when music ends
            });

            // Set focus on the game box when music starts
            if (gameBoxRef.current) {
                gameBoxRef.current.focus();
            }
        };

        audio.addEventListener('play', handleMusicStart);

        // Cleanup function to clear interval and remove event listeners
        return () => {
            if (audio) audio.removeEventListener('play', handleMusicStart);
            if (intervalId) clearInterval(intervalId); // Clear interval on component unmount
        };
    }, [beatInterval, selectedMusic, isGameActive, intervalId]); // Dependencies: beatInterval, selectedMusic, and isGameActive

    // Keyboard listener
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (!isGameActive) return; // Do nothing if the game is not active

            const letter = e.key.toUpperCase();  // Convert key to uppercase
            const isLetterPresent = removeFallingLetter(letter);

            // Show error if letter is not present
            if (!isLetterPresent) {
                setErrorVisible(true);
                setScore(prev => Math.max(prev - 5, 0)); // Decrease score for a miss
                setTimeout(() => setErrorVisible(false), 1000); // Hide error after 1 second
            } else {
                setScore(prev => prev + 10); // Increase score for a hit
            }
        };

        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [fallingLetters, isGameActive]);

    const generateFallingLetter = () => {
        const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));  // Random A-Z letter
        const letterElement = document.createElement('div');
        letterElement.classList.add('falling-letter');
        letterElement.textContent = letter;

        // Get the game box dimensions
        const gameBox = gameBoxRef.current;
        const boxRect = gameBox?.getBoundingClientRect();

        // Generate random position within the game box
        const randomX = Math.random() * (boxRect?.width ?? 0 - 50);  // 50 is approximate width of the letter element
        letterElement.style.left = `${randomX}px`;  // Position from the left
        letterElement.style.position = 'absolute'; // Position letters absolutely within the game box
        letterElement.style.top = '0px';  // Start from the top

        if (gameBox) gameBox.appendChild(letterElement);

        // Animate the falling letter
        const fallDuration = 3000; // Reduced duration for the letter to fall (3 seconds)
        letterElement.animate([
            { transform: 'translateY(0px)' },
            { transform: `translateY(${boxRect?.height ?? 0}px)` }
        ], {
            duration: fallDuration,
            fill: 'forwards',
            easing: 'linear'
        });

        // Store the letter in state to track it
        setFallingLetters((prev) => [...prev, letter]);

        setTimeout(() => {
            letterElement.remove(); // Remove letter after it has fallen
            setFallingLetters((prev) => prev.filter((l) => l !== letter)); // Update state
        }, fallDuration);
    };

    const removeFallingLetter = (letter: string) => {
        const letterElements = document.querySelectorAll('.falling-letter');
        let found = false;

        letterElements.forEach((element) => {
            if (element.textContent === letter) {
                // Apply highlight effect
                element.classList.add('highlight');

                // Remove highlight effect after a short duration
                setTimeout(() => element.classList.remove('highlight'), 500);
                element.remove();
                found = true;
            }
        });

        // Remove the letter from fallingLetters state
        setFallingLetters((prev) => prev.filter((l) => l !== letter));

        return found;
    };


    const handleSubmit = async (): Promise<void> => {
        try {
            const playerData: Highscore = {
                id: 0, // Assuming id is auto-generated by Supabase
                name: playerName,
                score,
                songs: {
                    artist: '',  // Add the artist from your game state or other relevant data
                    song_title: '', // Add the song title from your game state or other relevant data
                }
            };

            // Insert into Supabase highscores table
            const { data, error } = await supabase
                .from('highscores') // Replace with your actual table name
                .insert([{
                    name: playerName,
                    score,
                    songs: playerData.songs, // Ensure the 'songs' field is correctly set up in your table
                }]);

            if (error) {
                console.error("Error inserting highscore:", error.message);
            } else {
                console.log("Highscore submitted:", data);
                setIsPopupVisible(false); // Close popup after successful submission
            }
        } catch (error) {
            console.error("Error submitting highscore:", error.message);
        }

        setScore(0); // Reset score
    };

    return (
        <div className="game-container">
            <div ref={gameBoxRef} className="game-box" tabIndex={0}>
                {errorVisible && <div className="error-message">Wrong letter! Try again.</div>}
                <div className="score-board">Score: {score}</div>
                <audio id="game-audio" controls src={selectedMusic ?? ''}></audio>
            </div>
            <div className="music-selection">
                <select onChange={(e) => setSelectedMusic(e.target.value)} value={selectedMusic || ''}>
                    {musicList.map((song) => (
                        <option key={song.id} value={song.url}>
                            {song.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="game-popup" style={{ display: isPopupVisible ? 'block' : 'none' }}>
                <div>Game Over</div>
                <Button onClick={() => setIsPopupVisible(false)}>Close</Button>
            </div>
             {/* Popup for game over */}
             {isPopupVisible && (
                <div style={{
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '20px', border: '2px solid black', zIndex: 1000
                }}>
                    <h2>Game Over!</h2>
                    <p>Your Score: {score}</p>
                    <label htmlFor="player-name">Enter your name:</label>
                    <input
                        id="player-name"
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        style={{ marginBottom: '10px', padding: '5px', fontSize: '16px' }}
                    />
                    <Button text={"Add Highscore"} onClick={handleSubmit}>Submit</Button>
                </div>
            )}
        </div>
    );
};

export default Game;
