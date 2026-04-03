// Copyright 2026 Jeremiah Van Offeren
import { createContext, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { API_BASE_URL } from './api';
import { getAuthHeaders, requestJson } from './http';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);

  // Check for existing token on app start
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      requestJson(
        `${API_BASE_URL}/auth/verify`,
        { headers: getAuthHeaders() },
        'Session verification failed'
      )
        .then(data => {
          if (data && data.user) {
            setIsLoggedIn(true);
            setAdminName(data.user.username);
          } else {
            localStorage.removeItem('authToken');
          }
        })
        .catch(() => {
          localStorage.removeItem('authToken');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.ok && data && data.token && data.user && data.user.username) {
        localStorage.setItem('authToken', data.token);
        setIsLoggedIn(true);
        setAdminName(data.user.username);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    setAdminName('');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, adminName, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
