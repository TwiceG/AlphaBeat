
import { Link } from 'react-router-dom';
import '../style/NavBar.css';

const NavBar: React.FC = () => {

    return (

        <nav className="navbar">
            <ul className="nav-list">
                <li className="nav-item">
                    <Link to="/" className="nav-link">Home</Link>
                </li>
                <li className="nav-item">
                    <Link to="/game" className="nav-link">Play</Link>
                </li>
                <li className="nav-item">
                    <Link to="/highscores" className="nav-link">Highscores</Link>
                </li>
                <li className='nav-item'>
                    <Link to="https://calendarling-dia.vercel.app/">Calendarling</Link>
                </li>
            </ul>
        </nav>
    );
};

export default NavBar;

