// Copyright 2026 Jeremiah Van Offeren
// GalleryApprovalModal.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { API_BASE_URL } from '../utils/api';
import { getAuthHeaders, requestJson } from '../utils/http';
import { formatIsoDateTime } from '../utils/dateTime';

export function GalleryApprovalModal({ onClose }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState(null); // id currently being approved/rejected

  useEffect(() => {
    requestJson(`${API_BASE_URL}/gallery/pending`, { headers: getAuthHeaders() }, 'Failed to load pending photos')
      .then(data => {
        setPending(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load pending photos');
        setLoading(false);
      });
  }, []);

  const handleAction = async (id, status) => {
    setActioning(id);
    try {
      await requestJson(
        `${API_BASE_URL}/gallery/${id}/status`,
        {
          method: 'PUT',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ status }),
        },
        'Action failed'
      );
      setPending(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message || 'Action failed. Please try again.');
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="admin-modal" data-testid="gallery-approval-modal">
      <div className="admin-modal-content gallery-approval-content">
        <div className="admin-modal-header">
          <h2>Pending Photo Approvals</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="admin-modal-body">
          {error && <p style={{ color: '#b42318' }}>{error}</p>}
          {loading ? (
            <p>Loading…</p>
          ) : pending.length === 0 ? (
            <p className="gallery-approval-empty">No pending submissions.</p>
          ) : (
            <div className="gallery-approval-list">
              {pending.map(photo => (
                <div key={photo.id} className="gallery-approval-item">
                  <img
                    src={photo.url}
                    alt={photo.caption || ''}
                    className="gallery-approval-image"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div className="gallery-approval-meta">
                    <p className="gallery-approval-caption">
                      {photo.caption || <em className="gallery-approval-no-caption">No caption</em>}
                    </p>
                    {photo.submitter_name && (
                      <p className="gallery-approval-submitter">
                        Submitted by: {photo.submitter_name}
                      </p>
                    )}
                    <p className="gallery-approval-date">
                      {formatIsoDateTime(photo.uploaded_at, Intl.DateTimeFormat().resolvedOptions().timeZone)}
                    </p>
                    <div className="gallery-approval-actions">
                      <button
                        className="save-btn"
                        disabled={actioning === photo.id}
                        onClick={() => handleAction(photo.id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="delete-btn"
                        disabled={actioning === photo.id}
                        onClick={() => handleAction(photo.id, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="admin-modal-footer">
          <button className="cancel-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

GalleryApprovalModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default GalleryApprovalModal;
