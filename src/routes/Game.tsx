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
    const [selectedMusic, setSelectedMusic] = useState<string | null>(null); 
    const [beatInterval, setBeatInterval] = useState<number>((60 / 120) * 1000 * 2); 
    const [fallingLetters, setFallingLetters] = useState<string[]>([]); 
    const gameBoxRef = useRef<HTMLDivElement | null>(null); 
    const [errorVisible, setErrorVisible] = useState<boolean>(false); 
    const [score, setScore] = useState<number>(0); 
    const [isGameActive, setIsGameActive] = useState<boolean>(true); 
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null); 
    const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false); 
    const [playerName, setPlayerName] = useState<string>(''); 

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
                    setSelectedMusic(formattedData[0]?.song_url ?? null); 
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
                const newBeatInterval = (1 / beatsPerSecond) * 1000; 
                setBeatInterval(newBeatInterval); 
            } catch (error) {
                console.error("Error detecting BPM:", error);
            }
        };

        if (selectedMusic) {
            fetchSongBPM(selectedMusic); 
        }
    }, [selectedMusic]);

    // Letter generation based on BPM
    useEffect(() => {
        if (!selectedMusic) return;

        const audio = document.getElementById('game-audio') as HTMLAudioElement;

        const handleMusicStart = () => {
            if (intervalId) clearInterval(intervalId);

            setFallingLetters([]);
            setIsGameActive(true); 

            const newIntervalId = setInterval(() => {
                if (isGameActive) {
                    generateFallingLetter(); 
                }
            }, beatInterval);
            setIntervalId(newIntervalId);

            audio.addEventListener('ended', () => {
                if (intervalId) clearInterval(intervalId); 
                setIsGameActive(false); 
            });

            if (gameBoxRef.current) {
                gameBoxRef.current.focus();
            }
        };

        audio.addEventListener('play', handleMusicStart);

        return () => {
            if (audio) audio.removeEventListener('play', handleMusicStart);
            if (intervalId) clearInterval(intervalId); 
        };
    }, [beatInterval, selectedMusic, isGameActive, intervalId]);

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


    // LETTER GAME Functions
    const generateFallingLetter = () => {
        const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const letterElement = document.createElement('div');
        letterElement.classList.add('falling-letter');
        letterElement.textContent = letter;

        const gameBox = gameBoxRef.current;
        const boxRect = gameBox?.getBoundingClientRect();

        const randomX = Math.random() * (boxRect?.width ?? 0 - 50); 
        letterElement.style.left = `${randomX}px`; 
        letterElement.style.position = 'absolute'; 
        letterElement.style.top = '0px'; 

        if (gameBox) gameBox.appendChild(letterElement);

        const fallDuration = 3000; 
        letterElement.animate([ { transform: 'translateY(0px)' }, { transform: `translateY(${boxRect?.height ?? 0}px)` } ], {
            duration: fallDuration,
            fill: 'forwards',
            easing: 'linear'
        });

        setFallingLetters((prev) => [...prev, letter]);

        setTimeout(() => {
            letterElement.remove(); 
            setFallingLetters((prev) => prev.filter((l) => l !== letter)); 
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
    
    const endGame = () => {
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
    

    return (
        <div>
            <h1 className="game-title">ALPHABEAT</h1>
            <label htmlFor="music-select">Choose music:</label>
            <select id="music-select" value={selectedMusic ?? ''} onChange={handleMusicChange}>
                <option value="no-song">Choose a song</option>
                {musicList.map(song => (
                    <option key={song.id} value={song.song_url}>
                        {`${song.artist} - ${song.song_title}`}
                    </option>
                ))}
            </select>

            <div ref={gameBoxRef} className="game-box" tabIndex={0}>
                {errorVisible && <div className="error-message">Oops! Try again!</div>}
            </div>
            <Button text="End Game" onClick={endGame} />
            <div className="score-box">Score: {score}</div>
            {isPopupVisible && (
                <div className="popup">
                    <h2>Game Over</h2>
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
