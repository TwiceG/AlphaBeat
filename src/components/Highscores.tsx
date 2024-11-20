import React, { useEffect, useState } from 'react';
import supabase from '../SupaBaseClient';
import { Highscore } from '../types/highscore';

const Highscores: React.FC = () => {
    const [highscores, setHighscores] = useState<Highscore[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch highscores from Supabase
    const fetchHighscores = async () => {
        const { data, error } = await supabase
            .from('highscores')
            .select('player_name, highscore,songs(artist, song_title))');

        if (error) {
            console.error('Error fetching highscores:', error);
            setError(error.message);
            setLoading(false);
        } else {
            setHighscores(data);
            setLoading(false); // Update loading state
        }
    };

    useEffect(() => {
        fetchHighscores();
    }, []);

    return (
        <div>
            <h1>Highscores</h1>
            {loading && <p>Loading...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {!loading && !error && (
                <table>
                    <thead>
                        <tr>
                            <th>Player Name</th>
                            <th>Highscore</th>
                            <th>Artist</th>
                            <th>Song Title</th>
                        </tr>
                    </thead>
                    <tbody>
                        {highscores.map((highscore, index) => (
                            <tr key={index}>
                                <td>{highscore.player_name}</td>
                                <td>{highscore.highscore}</td>
                                <td>{highscore.songs?.artist}</td> 
                                <td>{highscore.songs?.song_title}</td> 
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Highscores;
