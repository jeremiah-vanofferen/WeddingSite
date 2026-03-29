import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './AuthContext'
import Navigation from './Navigation'
import Home from './pages/Home'
import Services from './pages/Schedule'
import Contact from './pages/Contact'
import Admin from './pages/Admin'
import RSVP from './pages/RSVP'
import './App.css'

function App() {
  const [settings, setSettings] = useState({
    websiteName: 'My Wedding',
    theme: 'elegant',
    primaryColor: '#0a20ca',
    primaryColorHover: '#1894dc',
    fontFamily: 'serif',
    showCountdown: true,
    allowRsvp: true,
    welcomeMessage: 'Thank you for visiting our wedding website. We\'re thrilled to share the details of our celebration with you.'
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('weddingSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Error parsing saved settings:', error);
        // Reset to defaults if parsing fails
        localStorage.removeItem('weddingSettings');
      }
    }
  }, []);

  useEffect(() => {
    const handleSettingsChange = (event) => {
      setSettings(event.detail);
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
          <Route path="/schedule" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/rsvp" element={<RSVP />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
