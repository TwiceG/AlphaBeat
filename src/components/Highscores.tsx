import React, { useEffect, useState } from 'react';
import supabase from '../SupaBaseClient';
import '../style/Highscores.css';

const Highscores: React.FC = () => {
    const [highscores, setHighscores] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

    // Fetch highscores from Supabase
    const fetchHighscores = async () => {
        const { data, error } = await supabase
            .from('highscores')
            .select('id, player_name, highscore, difficulty, songs(artist, song_title)');

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
    // Sorting function
    const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });

    // Sort highscores
    const sortedData = [...highscores].sort((a, b) => {
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    setHighscores(sortedData);
    };

    const getSortArrow = (key) => {
    if (sortConfig.key === key) {
        return <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    }
    return null;
    };


    return (
        <div className="highscores-container">
            <h1>Highscores</h1>
            {loading && <p>Loading...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {!loading && !error && (
                <table>
                    <thead>
                        <tr>
                        <th onClick={() => handleSort('player_name')}>
                                Player Name {getSortArrow('player_name')}
                            </th>
                            <th onClick={() => handleSort('highscore')}>
                                Highscore {getSortArrow('highscore')}
                            </th>
                            <th onClick={() => handleSort('difficulty')}>
                                Difficulty {getSortArrow('difficulty')}
                            </th>
                            <th>
                                Song
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {highscores.map((highscore, index) => (
                            <tr key={index}>
                                <td>{highscore.player_name}</td>
                                <td>{highscore.highscore}</td>
                                <td>{highscore.difficulty}</td>
                                <td>
                                    {highscore.songs?.artist} - {highscore.songs?.song_title}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Highscores;
