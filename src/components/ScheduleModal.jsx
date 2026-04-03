// Copyright 2026 Jeremiah Van Offeren
// ScheduleModal.jsx
import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { formatTimeOfDay } from '../utils/dateTime';

const sortEventsByTime = (events) => [...events].sort((a, b) => a.time.localeCompare(b.time));

export function ScheduleModal({
  schedule,
  onSave,
  onClose,
}) {
  const [scheduleList, setScheduleList] = useState(() => sortEventsByTime(schedule));
  const [editingEvent, setEditingEvent] = useState(null);
  const [swapAnimation, setSwapAnimation] = useState(null);
  const swapTimerRef = useRef(null);

  useEffect(() => () => {
    if (swapTimerRef.current) {
      clearTimeout(swapTimerRef.current);
    }
  }, []);

  const handleEdit = (event) => {
    setEditingEvent(event);
  };

  const handleSaveEdit = (updatedEvent) => {
    const updatedList = scheduleList.map(event =>
      event.id === updatedEvent.id ? updatedEvent : event
    );
    const sortedList = sortEventsByTime(updatedList);
    setScheduleList(sortedList);
    onSave(sortedList);
    setEditingEvent(null);
  };

  const handleDelete = (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      const updatedList = scheduleList.filter(event => event.id !== eventId);
      const sortedList = sortEventsByTime(updatedList);
      setScheduleList(sortedList);
      onSave(sortedList);
    }
  };

  const moveEvent = (eventId, direction) => {
    const currentIndex = scheduleList.findIndex(event => event.id === eventId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= scheduleList.length) {
      return;
    }

    const newList = [...scheduleList];
    const currentEvent = newList[currentIndex];
    const targetEvent = newList[targetIndex];

    newList[currentIndex] = {
      ...currentEvent,
      time: targetEvent.time,
    };

    newList[targetIndex] = {
      ...targetEvent,
      time: currentEvent.time,
    };

    const sortedList = sortEventsByTime(newList);
    setScheduleList(sortedList);
    onSave(sortedList);

    setSwapAnimation({ fromId: currentEvent.id, toId: targetEvent.id, direction });
    if (swapTimerRef.current) {
      clearTimeout(swapTimerRef.current);
    }
    swapTimerRef.current = setTimeout(() => {
      setSwapAnimation(null);
    }, 360);
  };

  const getSwapClassName = (eventId) => {
    if (!swapAnimation) {
      return '';
    }

    if (eventId === swapAnimation.fromId) {
      return swapAnimation.direction === 'up'
        ? 'timeline-item-nudge-up'
        : 'timeline-item-nudge-down';
    }

    if (eventId === swapAnimation.toId) {
      return swapAnimation.direction === 'up'
        ? 'timeline-item-nudge-down'
        : 'timeline-item-nudge-up';
    }

    return '';
  };

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Wedding Schedule</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="admin-modal-body">
          <div className="schedule-timeline">
            {scheduleList
              .map((event, index) => (
                <div key={event.id} className={`timeline-item ${getSwapClassName(event.id)}`}>
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <div className="event-header">
                      <h4 className="event-title-row">
                        <span
                          className={`event-time-badge ${swapAnimation && (event.id === swapAnimation.fromId || event.id === swapAnimation.toId) ? 'event-time-badge-swapped' : ''}`}
                        >
                          {formatTimeOfDay(event.time)}
                        </span>
                        <span className="event-title-text">{event.event}</span>
                      </h4>
                      <div className="event-actions">
                        <button
                          className="move-btn"
                          onClick={() => moveEvent(event.id, 'up')}
                          disabled={index === 0}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          className="move-btn"
                          onClick={() => moveEvent(event.id, 'down')}
                          disabled={index === scheduleList.length - 1}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button className="edit-btn" onClick={() => handleEdit(event)}>Edit</button>
                        <button className="delete-btn" onClick={() => handleDelete(event.id)}>Delete</button>
                      </div>
                    </div>
                    <p>{event.description}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>Close</button>
        </div>
      </div>

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onSave={handleSaveEdit}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}

export function AddEventModal({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    time: '',
    event: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Add New Event</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="admin-modal-body admin-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="time">Event Time</label>
              <input
                id="time"
                name="time"
                type="time"
                value={formData.time}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="event">Event Name</label>
              <input
                id="event"
                name="event"
                type="text"
                value={formData.event}
                onChange={handleChange}
                placeholder="e.g., Ceremony, Reception"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the event"
              rows="3"
            />
          </div>
        </form>
        <div className="admin-modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="save-btn" onClick={handleSubmit}>Add Event</button>
        </div>
      </div>
    </div>
  );
}

function EditEventModal({ event, onSave, onClose }) {
  const [formData, setFormData] = useState(event);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Edit Event</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="admin-modal-body admin-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-time">Event Time</label>
              <input
                id="edit-time"
                name="time"
                type="time"
                value={formData.time}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-event">Event Name</label>
              <input
                id="edit-event"
                name="event"
                type="text"
                value={formData.event}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
          </div>
        </form>
        <div className="admin-modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="save-btn" onClick={handleSubmit}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

ScheduleModal.propTypes = {
  schedule: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    time: PropTypes.string,
    event: PropTypes.string,
    description: PropTypes.string,
  })).isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

AddEventModal.propTypes = {
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

EditEventModal.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.number,
    time: PropTypes.string,
    event: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};