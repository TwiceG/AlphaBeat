import React, { useEffect, useState } from 'react';
import supabase from '../SupaBaseClient';
import '../style/Highscores.css';

const Highscores: React.FC = () => {
    const [highscores, setHighscores] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch highscores from Supabase
    const fetchHighscores = async () => {
        const { data, error } = await supabase
            .from('highscores')
            .select('id, player_name, highscore, songs(artist, song_title)');

        if (error) {
            console.error('Error fetching highscores:', error);
            setError(error.message);
            setLoading(false);
        } else {
            console.log(data);
            setHighscores(data);
            setLoading(false); // Update loading state
        }
    };

    useEffect(() => {
        fetchHighscores();
    }, []);

    return (
        <div className="highscores-container"> {/* Add the container class here */}
            <h1>Highscores</h1>
            {loading && <p>Loading...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {!loading && !error && (
                <table>
                    <thead>
                        <tr>
                            <th>Player Name</th>
                            <th>Highscore</th>
                            <th>Song</th>
                        </tr>
                    </thead>
                    <tbody>
                        {highscores.map((highscore, index) => (
                            <tr key={index}>
                                <td>{highscore.player_name}</td>
                                <td>{highscore.highscore}</td>
                                <td>{highscore.songs?.artist} - {highscore.songs?.song_title}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Highscores;
