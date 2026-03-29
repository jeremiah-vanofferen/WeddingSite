import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './AuthContext'
import Navigation from './Navigation'
import Home from './pages/Home'
import Schedule from './pages/Schedule'
import Contact from './pages/Contact'
import Admin from './pages/Admin'
import RSVP from './pages/RSVP'
import { DEFAULT_SETTINGS } from './utils/constants'
import './App.css'

function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/public/settings');
        const data = await res.json();
        if (data && !data.error) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch {
        // Silently use defaults if unreachable
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const handleSettingsChange = (event) => {
      setSettings(prev => ({ ...prev, ...event.detail }));
    };
    window.addEventListener('settingsChanged', handleSettingsChange);
    return () => window.removeEventListener('settingsChanged', handleSettingsChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    try {
      root.style.setProperty('--primary-color', settings.primaryColor);
      root.style.setProperty('--primary-color-hover', settings.primaryColorHover);
      // Apply font family
      const fontMap = {
        serif: '"Times New Roman", serif',
        'sans-serif': '"Helvetica Neue", Arial, sans-serif',
        script: '"Brush Script MT", cursive',
        monospace: '"Courier New", monospace'
      };
      root.style.setProperty('--font-family', fontMap[settings.fontFamily] || fontMap.serif);
      document.body.style.fontFamily = fontMap[settings.fontFamily] || fontMap.serif;
    } catch (error) {
      console.error('Error setting CSS variables:', error);
    }
  }, [settings.primaryColor, settings.primaryColorHover, settings.fontFamily]);

  useEffect(() => {
    const body = document.body;
    // Remove all theme classes
    body.classList.remove('theme-elegant', 'theme-modern', 'theme-rustic', 'theme-vintage');
    // Add the current theme class
    body.classList.add(`theme-${settings.theme}`);
  }, [settings.theme]);

  return (
    <AuthProvider>
      <Router>
        <Navigation settings={settings} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/rsvp" element={<RSVP />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
