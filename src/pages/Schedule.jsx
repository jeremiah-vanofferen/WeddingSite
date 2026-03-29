import { useState, useEffect } from 'react';
import '../pages/pages.css';

export default function Services() {
  const [schedule, setSchedule] = useState([
    { id: 1, time: '16:00', event: 'Ceremony', description: 'Outdoor wedding ceremony' },
    { id: 2, time: '17:00', event: 'Cocktail Hour', description: 'Drinks and appetizers' },
    { id: 3, time: '18:00', event: 'Reception', description: 'Dinner and dancing' },
    { id: 4, time: '22:00', event: 'End of Evening', description: 'Farewell and thank you' }
  ]);

  useEffect(() => {
    const savedSchedule = localStorage.getItem('weddingSchedule');
    if (savedSchedule) {
      try {
        setSchedule(JSON.parse(savedSchedule));
      } catch (error) {
        console.error('Error parsing wedding schedule:', error);
      }
    }
  }, []);

  return (
    <div className="page">
      <h1>Wedding Schedule</h1>
      <p>Here's the timeline for our special day.</p>
      <div className="schedule-timeline">
        {schedule
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((event) => (
            <div key={event.id} className="timeline-item">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <h3>{new Date(`2000-01-01T${event.time}`).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })} - {event.event}</h3>
                <p>{event.description}</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
