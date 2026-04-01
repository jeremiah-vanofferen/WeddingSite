import { useState, useEffect } from 'react';
import { PhotoCarousel } from '../components/PhotoCarousel';
import { DEFAULT_SETTINGS, DEFAULT_WEDDING_TIME_ZONE } from '../utils/constants';
import { formatWeddingDate, formatTimeOfDay, getTimeZoneLabel, resolveTimeZone } from '../utils/dateTime';
import { fetchPublicSettings } from '../utils/publicData';
import { mergeSettings, mergeWeddingDetails } from '../utils/settings';
import '../pages/pages.css';

export default function Home() {
  const [weddingDetails, setWeddingDetails] = useState({
    date: '2026-08-08',
    time: '16:00',
    timeZone: DEFAULT_WEDDING_TIME_ZONE,
    location: 'Windpoint Lighthouse',
    address: '4725 Lighthouse Drive, Wind Point, WI 53402',
    description: 'Join us for a beautiful outdoor ceremony followed by an elegant reception.',
    registryUrl: ''
  });

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
  const { date, time, timeZone } = weddingDetails;

  useEffect(() => {
    fetchPublicSettings().then(data => {
      if (!data) {
        return;
      }

      setSettings(prev => mergeSettings(prev, data));
      setWeddingDetails(prev => mergeWeddingDetails(prev, data));
    });
  }, []);

  useEffect(() => {
    if (!settings.showCountdown) return;

    const computeCountdown = () => {
      try {
        const [y, m, d] = date.split('-').map(Number);
        const [h, min] = time.split(':').map(Number);
        const tz = resolveTimeZone(timeZone);

        // Find the UTC epoch for the wedding date+time in the target timezone.
        // Step 1: treat the desired local time as if it were UTC.
        const utcGuess = Date.UTC(y, m - 1, d, h, min, 0);
        // Step 2: find what local clock time that UTC corresponds to in the target TZ.
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
        }).formatToParts(new Date(utcGuess));
        const get = type => Number(parts.find(p => p.type === type)?.value ?? 0);
        const localInTzAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
        // Step 3: the true target UTC = utcGuess + offset difference.
        const target = utcGuess + (utcGuess - localInTzAsUtc);

        const diff = target - Date.now();
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
      } catch {
        // Ignore calculation errors silently
      }
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

  return (
    <div className="page">
      <div className="demo-card home-hero-card">
        <PhotoCarousel />
          <h3>Welcome</h3>
          <p>{settings.welcomeMessage}</p>
      </div>

      {settings.showCountdown && (
        <div className="demo-card" data-testid="countdown-section">
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

      <div className="demo-card">
        <h3>Wedding Details</h3>
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
  );
}
