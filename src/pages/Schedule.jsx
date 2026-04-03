// Copyright 2026 Jeremiah Van Offeren
import { useState, useEffect } from 'react';
import { fetchArray } from '../utils/publicData';
import { formatTimeOfDay } from '../utils/dateTime';
import '../pages/pages.css';

export default function Services() {
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    fetchArray('/schedule').then(data => setSchedule(data));
  }, []);

  const formatTime = (time) => formatTimeOfDay(time);

  return (
    <div className="page">
      <div className="schedule-hero">
        <h1>Wedding Day Schedule</h1>
        <p>Here&apos;s the timeline for our special day.</p>
      </div>

      <div className="public-schedule-timeline">
        {schedule
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((event, index) => (
            <div key={event.id} className="public-timeline-item">
              <div className="public-timeline-left">
                <span className="public-timeline-time">{formatTime(event.time)}</span>
              </div>
              <div className="public-timeline-center">
                <div className="public-timeline-dot"></div>
                {index < schedule.length - 1 && <div className="public-timeline-line"></div>}
              </div>
              <div className="public-timeline-card">
                <h3>{event.event}</h3>
                {event.description && <p>{event.description}</p>}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
