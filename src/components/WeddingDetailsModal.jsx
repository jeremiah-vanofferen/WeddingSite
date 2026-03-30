// WeddingDetailsModal.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';

export function WeddingDetailsModal({ details, onSave, onClose }) {
  const [formData, setFormData] = useState(details);

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
          <h2>Edit Wedding Details</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="admin-modal-body admin-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Wedding Date</label>
              <input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="time">Wedding Time</label>
              <input
                id="time"
                name="time"
                type="time"
                value={formData.time}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="location">Venue Name</label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter venue name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="address">Venue Address</label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter full address"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your wedding celebration"
              rows="4"
            />
          </div>
          <div className="form-group">
            <label htmlFor="registryUrl">Registry Link</label>
            <input
              id="registryUrl"
              name="registryUrl"
              type="url"
              value={formData.registryUrl}
              onChange={handleChange}
              placeholder="https://example.com/registry"
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

export function ViewDetailsModal({ details, onClose }) {
  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Wedding Details Preview</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="admin-modal-body">
          <div className="demo-card">
            <h3>Wedding Information</h3>
            <p><strong>Date:</strong> {new Date(details.date + 'T' + details.time).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: details.timeZone
            })}</p>
            <p><strong>Time:</strong> {new Date(details.date + 'T' + details.time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: details.timeZone
            })}</p>
            <p><strong>Venue:</strong> {details.location}</p>
            <p><strong>Address:</strong> {details.address}</p>
            <p><strong>Description:</strong> {details.description}</p>
            {details.registryUrl && (
              <p><strong>Registry:</strong> <a href={details.registryUrl} target="_blank" rel="noopener noreferrer">View Our Registry</a></p>
            )}
          </div>
        </div>
        <div className="admin-modal-footer">
          <button
            type="button"
            className="save-btn"
            style={{ backgroundColor: 'var(--primary-color, #0a20ca)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-color-hover, #1894dc)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--primary-color, #0a20ca)'}
            onClick={onClose}
          >Close</button>
        </div>
      </div>
    </div>
  );
}

WeddingDetailsModal.propTypes = {
  details: PropTypes.shape({
    date: PropTypes.string,
    time: PropTypes.string,
    location: PropTypes.string,
    address: PropTypes.string,
    description: PropTypes.string,
    registryUrl: PropTypes.string,
    timeZone: PropTypes.string,
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

ViewDetailsModal.propTypes = {
  details: PropTypes.shape({
    date: PropTypes.string,
    time: PropTypes.string,
    location: PropTypes.string,
    address: PropTypes.string,
    description: PropTypes.string,
    registryUrl: PropTypes.string,
    timeZone: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};