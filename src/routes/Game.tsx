import { useState, useEffect, useRef } from 'react';
import Button from '../components/Button'; 
import { guess } from 'web-audio-beat-detector'; 
import '../style/Game.css';  
import supabase from '../SupaBaseClient';

interface Music {
    id: number;
    artist: string;
    song_title: string;
    song_url: string;
}

const Game: React.FC = () => {
    const [musicList, setMusicList] = useState<Music[]>([]); 
    const [selectedMusic, setSelectedMusic] = useState<string | null>('no-song'); 
    const [beatInterval, setBeatInterval] = useState<number>((60 / 120) * 1000 * 2); 
    const [fallingLetters, setFallingLetters] = useState<string[]>([]); 
    const gameBoxRef = useRef<HTMLDivElement | null>(null); 
    const [errorVisible, setErrorVisible] = useState<boolean>(false); 
    const [score, setScore] = useState<number>(0); 
    const [isGameActive, setIsGameActive] = useState<boolean>(false); 
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null); 
    const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false); 
    const [playerName, setPlayerName] = useState<string>(''); 
    const intervalRef = useRef<NodeJS.Timeout | null>(null); 
    const [fallDuration, setFallDuration] = useState<number>(3000); // Default to medium difficulty


    const audioContext = new (window.AudioContext)(); 


    // Music Handle
    const handleMusicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMusic(e.target.value);
    };

    // Fetch music list from Supabase
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

                if (Array.isArray(data)) {
                    const formattedData = data.map(song => ({
                        ...song,
                        song_url: `${song.audio_file_url}`
                    }));
                    setMusicList(formattedData);
                }
            } catch (error) {
                console.error("Error fetching music list:", error);
            }
        };

        fetchMusicList();
    }, []);

    // Fetch and calculate BPM from the selected song
    useEffect(() => {
        const fetchSongBPM = async (songUrl: string) => {
            try {
                const response = await fetch(songUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const { bpm } = await guess(audioBuffer);
                const beatsPerSecond = bpm / 60;
                const newBeatInterval = (2 / beatsPerSecond) * 1000; 
                setTimeout(() => {
                    setBeatInterval(newBeatInterval); 
                }, 0);// No delay, just defers execution
            } catch (error) {
                console.error("Error detecting BPM:", error);
            }
        };

        if (selectedMusic && selectedMusic !== "no-song") {
            // Fetch the BPM only if selectedMusic is a valid string and not "no-song"
            fetchSongBPM(selectedMusic); 
        } else {
            console.log("No song selected or song is 'no-song', skipping BPM fetch.");
        }
    }, [selectedMusic]);

    // Letter generation based on BPM
    useEffect(() => {
        if (!selectedMusic) return;
    
        const audio = document.getElementById('game-audio') as HTMLAudioElement;
    
        const handleMusicStart = () => {
            // Clear previous interval if exists
            if (intervalRef.current) clearInterval(intervalRef.current);
    
            // Reset falling letters and start game
            setFallingLetters([]);
            setIsGameActive(true); // Set the game as active when music starts
    
            // Set interval for falling letters based on the beat interval
            intervalRef.current = setInterval(() => {
                if (isGameActive) {
                    generateFallingLetter();  // Generate a falling letter at each interval
                }
            }, beatInterval);
    
            // Add event listener for when audio ends
            audio.addEventListener('ended', () => {
                // Clear the interval and stop the game when audio ends
                if (intervalRef.current) clearInterval(intervalRef.current);
                setIsGameActive(false);
            });
    
            // Focus on game area if available
            if (gameBoxRef.current) {
                gameBoxRef.current.focus();
            }
        };
    
        // Start the game when the music starts playing
        audio.addEventListener('play', handleMusicStart);
    
        // Cleanup function to remove event listeners and clear interval when component unmounts or changes
        return () => {
            if (audio) {
                audio.removeEventListener('play', handleMusicStart);
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [beatInterval, selectedMusic, isGameActive]);
    

    // Handle key press
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (!isGameActive) return; 

            const letter = e.key.toUpperCase(); 
            const isLetterPresent = removeFallingLetter(letter);

            if (!isLetterPresent) {
                setErrorVisible(true);
                setScore(prev => Math.max(prev - 5, 0)); 
                setTimeout(() => setErrorVisible(false), 1000); 
            } else {
                setScore(prev => prev + 10); 
            }
        };

        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [fallingLetters, isGameActive]);


    useEffect(() => {
        // Call resetGameLetters when either beatInterval or fallDuration changes
        resetGameLetters();
    }, [fallDuration]);

    // LETTER GAME Functions

    const getRandomLetter = () => {
        const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        return letter; // Only return the letter, don't create or append the element here
    };
    
    const generateFallingLetter = () => {
        const letter = getRandomLetter();
    
        const letterElement = document.createElement('div');
        letterElement.classList.add('falling-letter');
        letterElement.textContent = letter;
    
        const gameBox = gameBoxRef.current;
        const boxRect = gameBox?.getBoundingClientRect();
    
        const letterWidth = 30; // Approximate width of the letter
        const randomX = Math.random() * ((boxRect?.width ?? 0) - letterWidth);
    
        letterElement.style.left = `${randomX}px`;
        letterElement.style.position = 'absolute';
        letterElement.style.top = '0px';
    
        // Add the letter to the gameBox
        if (gameBox) gameBox.appendChild(letterElement);
    
        // Apply animation duration dynamically
        requestAnimationFrame(() => {
            letterElement.style.animationDuration = `${fallDuration}ms`;
        });
    
        // Clean up the letter after the animation ends
        setTimeout(() => {
            letterElement.remove();
        }, fallDuration);
    };
    

    
    const removeFallingLetter = (letter: string) => {
        const letterElements = document.querySelectorAll('.falling-letter');
        let found = false;
    
        letterElements.forEach((element) => {
            if (element.textContent === letter) {
                // Apply highlight effect
                element.classList.add('highlight');

                setTimeout(() => {
                    element.classList.remove('highlight'); 
                    element.remove(); 
                    setFallingLetters((prev) => prev.filter((l) => l !== letter)); 
                }, 200); 
    
                found = true; 
            }
        });
    
        return found;
    };
    



    //END GAME
    const getSongId = async () => {
        console.log(selectedMusic);
        const { data, error } = await supabase
        .from('songs')
        .select('id') 
        .eq('audio_file_url', selectedMusic); 

    if (error) {
        console.error('Error fetching song:', error);
    } else {
        const songId = data?.[0]?.id;
        return songId;
    }
    }

    const handleSubmit = async () => {
      
        const songId = await getSongId();

        try {
            const { data, error } = await supabase
            .from('highscores')
            .insert([{ player_name: playerName, highscore: score, song_id: songId }]);
            
            if (error) {
                console.error("Error inserting highscore:", error.message);
            } else {
                console.log("Highscore submitted:", data);
                setIsPopupVisible(false); 
            }
        } catch (error) {
            console.error("Error submitting highscore:", error);
        } finally {
            setScore(0); 
            setIsPopupVisible(false);
        }
    };
    
    const pauseGame = () => {
        const audio = document.getElementById('game-audio') as HTMLAudioElement;
        if (audio) audio.pause(); 
        if (intervalId) clearInterval(intervalId); 
        setIsGameActive(false); 
        setIsPopupVisible(true); 
    };
    
    const handleCancel = () => {
        const audio = document.getElementById('game-audio') as HTMLAudioElement;
        if (audio) {
            audio.play(); 
        } 
        setIsGameActive(true); 
        setIsPopupVisible(false); 
    
        // Restart the interval for generating falling letters
        const newIntervalId = setInterval(() => {
            if (isGameActive) {
                generateFallingLetter();
            }
        }, beatInterval);
        setIntervalId(newIntervalId);
    };
 
    const handleDifficultyChange = (selectedDifficulty: 'easy' | 'medium' | 'hard') => {
        let newFallDuration: number;
        let newBeatInterval: number;
    
        // Set fall duration and beat interval based on the selected difficulty
        switch (selectedDifficulty) {
            case 'easy':
                newFallDuration = 5000;
                newBeatInterval = (60 / 100) * 1000 * 2; 
                break;
            case 'medium':
                newFallDuration = 3000;
                newBeatInterval = (60 / 120) * 1000 * 2; 
                break;
            case 'hard':
                newFallDuration = 1500;
                newBeatInterval = (60 / 150) * 1000 * 2; 
                break;
            default:
                newFallDuration = 3000;
                newBeatInterval = (60 / 120) * 1000 * 2; 
        }
    
        // Update fall duration and beat interval immediately
        setFallDuration(newFallDuration);
        setBeatInterval(newBeatInterval);
    
        // Reset the game letters and clear the previous interval
        resetGameLetters();
    };
    
    // Function to reset game letters after difficulty change
    const resetGameLetters = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    
        // Clear existing falling letters
        setFallingLetters([]);
        const letterElements = document.querySelectorAll('.falling-letter');
        letterElements.forEach(letter => letter.remove());
    
        // Restart the game loop with the new fall duration
        intervalRef.current = setInterval(() => {
            if (isGameActive) {
                generateFallingLetter();
            }
        }, beatInterval);
    };
    
    
    

    return (
        <div>
            {/* <h1 className="game-title">ALPHABEAT</h1>
            <label htmlFor="music-select">Choose music:</label> */}
            <select id="music-select" value={selectedMusic ?? ''} onChange={handleMusicChange}>
                <option value="no-song">Choose a song</option>
                {musicList.map(song => (
                    <option key={song.id} value={song.song_url}>
                        {`${song.artist} - ${song.song_title}`}
                    </option>
                ))}
            </select>
          
            <div>
                <button onClick={() => handleDifficultyChange('easy')}>Easy</button>
                <button onClick={() => handleDifficultyChange('medium')}>Medium</button>
                <button onClick={() => handleDifficultyChange('hard')}>Hard</button>
            </div>

            <div ref={gameBoxRef} className="game-box" tabIndex={0}>
            <div className="score-box">Score: {score}</div>
                {errorVisible && <div className="error-message">Oops! Try again!</div>}
            </div>
            <div className='game-footer'>
            <Button text="Pause Game" className='pause-btn' onClick={pauseGame} />
            </div>
            {isPopupVisible && (
                <div className="popup">
                    <h2>Game Paused</h2>
                    <p>Final Score: {score}</p>
                    <input 
                        type="text" 
                        placeholder="Enter your name" 
                        value={playerName}
                        onChange={e => setPlayerName(e.target.value)} 
                    />
                    <Button text="Submit" onClick={handleSubmit} />
                    <Button text='Cancel' onClick={handleCancel} />
                </div>
            )}
            <audio id="game-audio" src={selectedMusic || ''} controls autoPlay />
        </div>
    );
};

export default Game;
