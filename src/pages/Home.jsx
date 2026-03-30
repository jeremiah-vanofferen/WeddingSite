import { useState, useEffect } from 'react';
import { PhotoCarousel } from '../components/PhotoCarousel';
import { DEFAULT_SETTINGS } from '../utils/constants';
import { fetchPublicSettings } from '../utils/publicData';
import { mergeSettings, mergeWeddingDetails } from '../utils/settings';
import '../pages/pages.css';

export default function Home() {
  const [weddingDetails, setWeddingDetails] = useState({
    date: '2026-08-08',
    time: '16:00',
    location: 'Windpoint Lighthouse',
    address: '4725 Lighthouse Drive, Wind Point, WI 53402',
    description: 'Join us for a beautiful outdoor ceremony followed by an elegant reception.',
    registryUrl: ''
  });

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    fetchPublicSettings().then(data => {
      if (!data) {
        return;
      }

      setSettings(prev => mergeSettings(prev, data));
      setWeddingDetails(prev => mergeWeddingDetails(prev, data));
    });
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
      <div className="demo-card home-hero-card">
        <PhotoCarousel />
        <div className="home-welcome">
          <h3>Welcome</h3>
          <p>{settings.welcomeMessage}</p>
        </div>
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
        {weddingDetails.registryUrl && (
          <p><strong>Registry:</strong> <a href={weddingDetails.registryUrl} target="_blank" rel="noopener noreferrer">View Our Registry</a></p>
        )}
      </div>
    </div>
  );
}
