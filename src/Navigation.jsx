// Copyright 2026 Jeremiah Van Offeren
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from './utils/AuthContext';
import LoginModal from './components/LoginModal';
import PropTypes from 'prop-types';
import './Navigation.css';

export default function Navigation({ settings }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 900) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLoginSuccess = () => {
    setLoginOpen(false);
    setMobileMenuOpen(false);
    navigate('/admin');
  };

  const handleOpenLogin = () => {
    setMobileMenuOpen(false);
    setLoginOpen(true);
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-brand" onClick={handleNavClick}>{settings?.websiteName || 'Wedding'}</Link>
          <ul className="nav-menu nav-menu-desktop">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/schedule">Schedule</Link></li>
            <li><Link to="/gallery">Gallery</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            {settings?.allowRsvp && <li><Link to="/rsvp">RSVP</Link></li>}
            {isLoggedIn && <li><Link to="/admin">Admin</Link></li>}
          </ul>
          <div className="nav-auth nav-auth-desktop">
            {isLoggedIn ? (
              <button className="logout-nav-btn" onClick={handleLogout}>Logout</button>
            ) : (
              <button className="login-nav-btn" onClick={handleOpenLogin}>Login</button>
            )}
          </div>
          <button
            className="nav-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="site-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
          </button>
        </div>
      </nav>
      <div id="site-navigation" className={`nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <ul className="nav-menu nav-menu-mobile">
          <li><Link to="/" onClick={handleNavClick}>Home</Link></li>
          <li><Link to="/schedule" onClick={handleNavClick}>Schedule</Link></li>
          <li><Link to="/gallery" onClick={handleNavClick}>Gallery</Link></li>
          <li><Link to="/contact" onClick={handleNavClick}>Contact</Link></li>
          {settings?.allowRsvp && <li><Link to="/rsvp" onClick={handleNavClick}>RSVP</Link></li>}
          {isLoggedIn && <li><Link to="/admin" onClick={handleNavClick}>Admin</Link></li>}
        </ul>
        <div className="nav-auth nav-auth-mobile">
          {isLoggedIn ? (
            <button className="logout-nav-btn" onClick={handleLogout}>Logout</button>
          ) : (
            <button className="login-nav-btn" onClick={handleOpenLogin}>Login</button>
          )}
        </div>
      </div>
      <button
        type="button"
        className={`nav-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-label="Close navigation menu"
      />
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} onLoginSuccess={handleLoginSuccess} />
    </>
  );
}

Navigation.propTypes = {
  settings: PropTypes.shape({
    websiteName: PropTypes.string,
    allowRsvp: PropTypes.bool,
  }),
};
