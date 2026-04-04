// Copyright 2026 Jeremiah Van Offeren
import { useState, useEffect } from 'react';
import { PhotoCarousel } from '../components/PhotoCarousel';
import { DEFAULT_SETTINGS, DEFAULT_WEDDING_TIME_ZONE } from '../utils/constants';
import { formatWeddingDate, formatTimeOfDay, getTimeZoneLabel, resolveTimeZone, dateTimeToUTC } from '../utils/dateTime';
import { fetchPublicSettings } from '../utils/publicData';
import { mergeSettings, mergeWeddingDetails } from '../utils/settings';
import LoadingSpinner from '../components/LoadingSpinner';
import '../pages/pages.css';

export default function Home() {
  const [weddingDetails, setWeddingDetails] = useState({
    date: '2030-06-20',
    time: '16:00',
    timeZone: DEFAULT_WEDDING_TIME_ZONE,
    location: 'Celebration Venue',
    address: '123 Celebration Ave, Hometown, ST 12345',
    description: 'Join us for our ceremony and reception.',
    registryUrl: ''
  });

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
  const { date, time, timeZone } = weddingDetails;

  useEffect(() => {
    fetchPublicSettings().then(data => {
      if (!data) {
        return;
      }

      setSettings(prev => mergeSettings(prev, data));
      setWeddingDetails(prev => mergeWeddingDetails(prev, data));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!settings.showCountdown) return;

    const computeCountdown = () => {
      // Convert wedding date/time/timezone to UTC milliseconds
      const weddingUTC = dateTimeToUTC(date, time, timeZone);

      // If parsing failed, mark as expired
      if (weddingUTC === null) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      // Compare with current time
      const diff = weddingUTC - Date.now();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };

    computeCountdown();
    const interval = window.setInterval(computeCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [settings.showCountdown, date, time, timeZone]);

  const timeZoneLabel = getTimeZoneLabel(
    resolveTimeZone(timeZone),
    undefined,
    date
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page page-home">
      <section className="page-hero page-hero-home">
        <div className="page-hero-copy">
          <p className="page-eyebrow">Celebration weekend</p>
          <h3 className="home-welcome-heading">Welcome</h3>
          <div className="home-welcome home-welcome-inline">
            <p>{settings.welcomeMessage}</p>
          </div>
        </div>

        <div className="demo-card home-hero-card home-hero-media">
          <PhotoCarousel />
        </div>
      </section>

      <section className="page-section page-section-grid page-section-grid-home">
        {settings.showCountdown && (
          <div className="demo-card" data-testid="countdown-section">
            <p className="section-kicker">Stay on schedule</p>
            <h3>Counting Down to the Big Day</h3>
            {countdown.expired ? (
              <p>The wedding day has arrived!</p>
            ) : (
              <div className="countdown-timer">
                <div className="countdown-unit">
                  <span className="countdown-number">{countdown.days}</span>
                  <span className="countdown-label">Days</span>
                </div>
                <div className="countdown-unit">
                  <span className="countdown-number">{String(countdown.hours).padStart(2, '0')}</span>
                  <span className="countdown-label">Hours</span>
                </div>
                <div className="countdown-unit">
                  <span className="countdown-number">{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className="countdown-label">Minutes</span>
                </div>
                <div className="countdown-unit">
                  <span className="countdown-number">{String(countdown.seconds).padStart(2, '0')}</span>
                  <span className="countdown-label">Seconds</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="demo-card detail-card">
          <p className="section-kicker">Need the essentials?</p>
          <h3>Wedding Details</h3>
          <div className="detail-list">
            <p><strong>Date:</strong> {formatWeddingDate(date)}</p>
            <p><strong>Time:</strong> {formatTimeOfDay(time)} ({timeZoneLabel})</p>
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
      </section>
    </div>
  );
}
