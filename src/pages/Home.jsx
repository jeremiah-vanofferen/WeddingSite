import { useState, useEffect } from 'react';
import '../pages/pages.css';

export default function Home() {
  const [weddingDetails, setWeddingDetails] = useState({
    date: '2026-08-08',
    time: '16:00',
    location: 'Windpoint Lighthouse',
    address: '4725 Lighthouse Drive, Wind Point, WI 53402',
    description: 'Join us for a beautiful outdoor ceremony followed by an elegant reception.'
  });

  const [settings, setSettings] = useState({
    theme: 'elegant',
    primaryColor: '#0a20ca',
    primaryColorHover: '#1894dc',
    fontFamily: 'serif',
    showCountdown: true,
    allowRsvp: true,
    welcomeMessage: 'Thank you for visiting our wedding website. We\'re thrilled to share the details of our celebration with you.'
  });

  useEffect(() => {
    const savedDetails = localStorage.getItem('weddingDetails');
    if (savedDetails) {
      try {
        setWeddingDetails(JSON.parse(savedDetails));
      } catch (error) {
        console.error('Error parsing wedding details:', error);
      }
    }

    const savedSettings = localStorage.getItem('weddingSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        // Merge with defaults to ensure all fields exist
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
      } catch (error) {
        console.error('Error parsing settings:', error);
      }
    }
  }, []);

  // Function to get time zone from address
  const getTimeZoneFromAddress = (address) => {
    // Simple mapping based on state/country in address
    if (address.includes('WI') || address.includes('Wisconsin')) {
      return 'America/Chicago'; // Central Time
    }
    if (address.includes('CA') || address.includes('California')) {
      return 'America/Los_Angeles'; // Pacific Time
    }
    if (address.includes('NY') || address.includes('New York')) {
      return 'America/New_York'; // Eastern Time
    }
    // Default to browser's local time zone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const timeZone = getTimeZoneFromAddress(weddingDetails.address);

  return (
    <div className="page">
      <h1 style={{ color: 'black' }}>{settings.websiteName}</h1>
      <p>Join us as we celebrate our special day!</p>

      <div className="demo-card">
        <h3>Welcome</h3>
        <p>{settings.welcomeMessage}</p>
      </div>
      
      <div className="demo-card">
        <h3>Wedding Details</h3>
        <p><strong>Date:</strong> {new Date(weddingDetails.date + 'T' + weddingDetails.time).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: timeZone
        })}</p>
        <p><strong>Time:</strong> {new Date(weddingDetails.date + 'T' + weddingDetails.time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: timeZone
        })}</p>
        <p><strong>Venue:</strong> {weddingDetails.location}</p>
        <p><strong>Address:</strong> {weddingDetails.address}</p>
        {weddingDetails.description && (
          <p><strong>Description:</strong> {weddingDetails.description}</p>
        )}
      </div>
    </div>
  );
}
