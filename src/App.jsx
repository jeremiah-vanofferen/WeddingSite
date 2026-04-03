// Copyright 2026 Jeremiah Van Offeren
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import { AuthProvider } from './utils/AuthContext'
import Navigation from './Navigation'
import Home from './pages/Home'
import Schedule from './pages/Schedule'
import Contact from './pages/Contact'
import RSVP from './pages/RSVP'
import { DEFAULT_SETTINGS } from './utils/constants'
import { fetchPublicSettings } from './utils/publicData'
import { mergeSettings } from './utils/settings'
import './App.css'

const Admin = lazy(() => import('./pages/Admin'));
const Gallery = lazy(() => import('./pages/Gallery'));

function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    let isActive = true;

    const fetchSettings = async () => {
      const data = await fetchPublicSettings();
      if (isActive && data) {
        setSettings(prev => mergeSettings(prev, data));
      }
    };

    fetchSettings();

    return () => {
      isActive = false;
    };
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
        serif: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
        'sans-serif': '"Aptos", "Segoe UI Variable", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        script: '"Baskerville Old Face", "Palatino Linotype", Georgia, serif',
        monospace: '"Cascadia Mono", "Consolas", "Courier New", monospace'
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
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Navigation settings={settings} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/rsvp" element={<RSVP />} />
          <Route
            path="/gallery"
            element={(
              <Suspense fallback={null}>
                <Gallery />
              </Suspense>
            )}
          />
          <Route
            path="/admin"
            element={(
              <Suspense fallback={null}>
                <Admin />
              </Suspense>
            )}
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
