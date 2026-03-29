import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './AuthContext';
import LoginModal from './LoginModal';
import PropTypes from 'prop-types';
import './Navigation.css';

export default function Navigation({ settings }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const { isLoggedIn, logout } = useAuth();

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-brand">{settings?.websiteName || 'Wedding'}</Link>
          <ul className="nav-menu">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/schedule">Schedule</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/rsvp">RSVP</Link></li>
            {isLoggedIn && <li><Link to="/admin">Admin</Link></li>}
          </ul>
          <div className="nav-auth">
            {isLoggedIn ? (
              <button className="logout-nav-btn" onClick={logout}>Logout</button>
            ) : (
              <button className="login-nav-btn" onClick={() => setLoginOpen(true)}>Admin Login</button>
            )}
          </div>
        </div>
      </nav>
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

Navigation.propTypes = {
  settings: PropTypes.shape({
    websiteName: PropTypes.string,
  }),
};
