import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../utils/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../pages/pages.css';
import './Admin.css';
import { DEFAULT_SETTINGS } from '../utils/constants';
import { API_BASE_URL } from '../utils/api';
import { getAuthHeaders, requestJson } from '../utils/http';
import { mergeSettings, mergeWeddingDetails } from '../utils/settings';

const WeddingDetailsModal = lazy(() =>
  import('../components/WeddingDetailsModal').then(module => ({ default: module.WeddingDetailsModal }))
);
const ViewDetailsModal = lazy(() =>
  import('../components/WeddingDetailsModal').then(module => ({ default: module.ViewDetailsModal }))
);
const GuestManagementModal = lazy(() =>
  import('../components/GuestManagementModal').then(module => ({ default: module.GuestManagementModal }))
);
const AddGuestModal = lazy(() =>
  import('../components/GuestManagementModal').then(module => ({ default: module.AddGuestModal }))
);
const ScheduleModal = lazy(() =>
  import('../components/ScheduleModal').then(module => ({ default: module.ScheduleModal }))
);
const AddEventModal = lazy(() =>
  import('../components/ScheduleModal').then(module => ({ default: module.AddEventModal }))
);
const PhotoGalleryModal = lazy(() =>
  import('../components/PhotoGalleryModal').then(module => ({ default: module.PhotoGalleryModal }))
);
const AddPhotoModal = lazy(() =>
  import('../components/PhotoGalleryModal').then(module => ({ default: module.AddPhotoModal }))
);
const SettingsModal = lazy(() => import('../components/SettingsModal').then(module => ({ default: module.SettingsModal })));
const GalleryApprovalModal = lazy(() => import('../components/GalleryApprovalModal'));
const ChangePasswordModal = lazy(() => import('../components/ChangePasswordModal'));

export default function Admin() {
  const { isLoggedIn, logout, adminName } = useAuth();
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState('');

  // State for different admin sections
  const [weddingDetails, setWeddingDetails] = useState({
    date: '',
    time: '',
    location: '',
    address: '',
    description: '',
    registryUrl: ''
  });

  const [schedule, setSchedule] = useState([]);

  const [photos, setPhotos] = useState([]);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Load schedule from backend on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/schedule`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) ? setSchedule(data) : setSchedule([]))
      .catch(() => {});
  }, []);

  const fetchPhotos = () => {
    fetch(`${API_BASE_URL}/gallery`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setPhotos(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  // Load all settings (includes wedding details) from backend on mount
  const fetchSettings = useCallback(() => {
    requestJson(
      `${API_BASE_URL}/settings`,
      { headers: getAuthHeaders() },
      'Failed to load settings.'
    )
      .then(data => {
        if (data && !data.error) {
          setSettings(prev => mergeSettings(prev, data));
          setWeddingDetails(prev => mergeWeddingDetails(prev, data));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchSettings();
  }, [fetchSettings, isLoggedIn]);

  // Messages state
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    if (isLoggedIn) {
      fetch(`${API_BASE_URL}/messages`, {
        headers: getAuthHeaders()
      })
        .then(res => (res.ok ? res.json() : []))
        .then(data => Array.isArray(data) ? setMessages(data) : setMessages([]));
    }
  }, [isLoggedIn]);

  // Pending photo submissions count
  const [pendingPhotoCount, setPendingPhotoCount] = useState(0);
  useEffect(() => {
    if (isLoggedIn) {
      fetch(`${API_BASE_URL}/gallery/pending`, { headers: getAuthHeaders() })
        .then(res => res.ok ? res.json() : [])
        .then(data => setPendingPhotoCount(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
    }
  }, [isLoggedIn]);

  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [_editingItem, setEditingItem] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Mark message as read when modal opens
  useEffect(() => {
    if (selectedMessage && !selectedMessage.is_read) {
      requestJson(
        `${API_BASE_URL}/messages/${selectedMessage.id}/read`,
        {
          method: 'PUT',
          headers: getAuthHeaders()
        },
        'Failed to mark message as read.'
      )
        .then(updated => {
          setMessages(msgs => msgs.map(m => m.id === updated.id ? { ...m, is_read: true } : m));
        })
        .catch(() => {});
    }
  }, [selectedMessage]);

  if (!isLoggedIn) {
    return (
      <div className="page">
        <h1>Access Denied</h1>
        <p>You must be logged in to access the admin panel.</p>
        <button onClick={() => navigate('/')}>Return Home</button>
      </div>
    );
  }

  const openModal = (modalType, item = null) => {
    if (modalType === 'settings') fetchSettings();
    setSaveError('');
    setActiveModal(modalType);
    setEditingItem(item);
  };

  const closeModal = () => {
    setSaveError('');
    setActiveModal(null);
    setEditingItem(null);
  };

  const handleSaveSettings = async (newSettings) => {
    await requestJson(
      `${API_BASE_URL}/settings`,
      {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newSettings)
      },
      'Failed to save settings.'
    );

    setSettings({ ...DEFAULT_SETTINGS, ...newSettings });
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: newSettings }));
  };

  return (
    <div className="page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {adminName}!</p>
        {saveError && (
          <p className="admin-error-message">{saveError}</p>
        )}
      </div>

      <div className="admin-section">
        <div className="demo-card">
          <h3>Wedding Details</h3>
          <p>Manage wedding date, location, and other important details here.</p>
          <div className="admin-actions">
            <button onClick={() => openModal('details')}>Edit Details</button>
            <button onClick={() => openModal('view-details')}>View Details</button>
          </div>
        </div>

        <div className="demo-card">
          <h3>Guest Management</h3>
          <p>View RSVPs and manage your guest list.</p>
          <div className="admin-actions">
            <button onClick={() => openModal('guests')}>Manage Guests</button>
            <button onClick={() => openModal('add-guest')}>Add Guest</button>
          </div>
        </div>

        <div className="demo-card">
          <h3>Schedule & Timeline</h3>
          <p>Update the wedding day schedule and timeline ({schedule.length} events).</p>
          <div className="admin-actions">
            <button onClick={() => openModal('schedule')}>Edit Schedule</button>
            <button onClick={() => openModal('add-event')}>Add Event</button>
          </div>
        </div>

        <div className="demo-card">
          <h3>Photo Gallery</h3>
          <p>Upload and manage wedding photos and gallery ({photos.length} photos).</p>
          <div className="admin-actions">
            <button onClick={() => openModal('photos')}>Manage Photos</button>
            <button onClick={() => openModal('add-photo')}>Upload Photo</button>
          </div>
        </div>

        <div className="demo-card">
          <h3>Photo Approvals</h3>
          <p>Review guest photo submissions ({pendingPhotoCount} pending).</p>
          <button onClick={() => openModal('gallery-approvals')}>Review Submissions</button>
        </div>

        <div className="demo-card">
          <h3>Website Settings</h3>
          <p>Configure website colors, fonts, and other preferences.</p>
          <button onClick={() => openModal('settings')}>Edit Settings</button>
        </div>

        <div className="demo-card">
          <h3>Account Security</h3>
          <p>Update your admin password.</p>
          <button onClick={() => openModal('change-password')}>Change Password</button>
        </div>

        <div className="demo-card">
          <h3>Contact Messages</h3>
          <p>View messages submitted from the contact form.</p>
          <div className="admin-messages-panel">
            {messages.length === 0 ? (
              <p className="admin-messages-empty">No messages yet.</p>
            ) : (
              <ul className="admin-messages-list">
                {messages.map(msg => (
                  <li key={msg.id} className="admin-messages-item"
                    onClick={() => setSelectedMessage(msg)}>
                    <span className={`admin-messages-name${msg.is_read ? '' : ' admin-messages-name-unread'}`}>{msg.name}</span>
                    <span className="admin-messages-date">({new Date(msg.created_at).toLocaleDateString()})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <button className="logout-btn" onClick={logout}>Logout</button>

      {/* Modals */}
      <Suspense fallback={null}>
        {activeModal === 'details' && (
          <WeddingDetailsModal
            details={weddingDetails}
            onSave={async (newDetails) => {
              setSaveError('');
              try {
                await requestJson(
                  `${API_BASE_URL}/settings`,
                  {
                    method: 'PUT',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                      weddingDate: newDetails.date,
                      weddingTime: newDetails.time,
                      weddingLocation: newDetails.location,
                      weddingAddress: newDetails.address,
                      weddingDescription: newDetails.description,
                      registryUrl: newDetails.registryUrl
                    })
                  },
                  'Failed to save wedding details.'
                );
                setWeddingDetails(newDetails);
                closeModal();
              } catch (error) {
                setSaveError(error.message || 'Failed to save wedding details.');
              }
            }}
            onClose={closeModal}
          />
        )}

        {activeModal === 'view-details' && (
          <ViewDetailsModal
            details={weddingDetails}
            onClose={closeModal}
          />
        )}

        {activeModal === 'guests' && (
          <GuestManagementModal
            onClose={closeModal}
          />
        )}

        {activeModal === 'add-guest' && (
          <AddGuestModal
            onSave={async (newGuest) => {
              setSaveError('');
              try {
                await requestJson(
                  `${API_BASE_URL}/guests`,
                  {
                    method: 'POST',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(newGuest)
                  },
                  'Failed to add guest.'
                );
                closeModal();
              } catch (error) {
                setSaveError(error.message || 'Failed to add guest.');
              }
            }}
            onClose={closeModal}
          />
        )}

        {activeModal === 'schedule' && (
          <ScheduleModal
            schedule={schedule}
            onSave={async (newSchedule) => {
              // Persist new sort order / edits / deletes to DB then refresh
              setSaveError('');
              try {
                const data = await requestJson(
                  `${API_BASE_URL}/schedule`,
                  {
                    method: 'PUT',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ events: newSchedule })
                  },
                  'Failed to save schedule.'
                );
                setSchedule(Array.isArray(data) ? data : newSchedule);
              } catch (error) {
                setSaveError(error.message || 'Failed to save schedule.');
              }
            }}
            onClose={closeModal}
          />
        )}

        {activeModal === 'add-event' && (
          <AddEventModal
            onSave={async (newEvent) => {
              setSaveError('');
              try {
                const created = await requestJson(
                  `${API_BASE_URL}/schedule`,
                  {
                    method: 'POST',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(newEvent)
                  },
                  'Failed to add schedule event.'
                );
                setSchedule(prev => [...prev, created]);
                closeModal();
              } catch (error) {
                setSaveError(error.message || 'Failed to add schedule event.');
              }
            }}
            onClose={closeModal}
          />
        )}

        {activeModal === 'photos' && (
          <PhotoGalleryModal
            photos={photos}
            onSave={(newPhotos) => {
              setPhotos(newPhotos);
            }}
            onClose={closeModal}
          />
        )}

        {activeModal === 'add-photo' && (
          <AddPhotoModal
            onSave={(newPhoto) => {
              const updatedPhotos = [newPhoto, ...photos];
              setPhotos(updatedPhotos);
              closeModal();
            }}
            onClose={closeModal}
          />
        )}

        {activeModal === 'settings' && (
          <SettingsModal
            settings={settings}
            onSave={handleSaveSettings}
            onClose={closeModal}
          />
        )}

        {activeModal === 'gallery-approvals' && (
          <GalleryApprovalModal
            onClose={() => {
              // Refresh pending count when modal closes
              fetch(`${API_BASE_URL}/gallery/pending`, { headers: getAuthHeaders() })
                .then(res => res.ok ? res.json() : [])
                .then(data => setPendingPhotoCount(Array.isArray(data) ? data.length : 0))
                .catch(() => {});
              fetchPhotos();
              closeModal();
            }}
          />
        )}

        {activeModal === 'change-password' && (
          <ChangePasswordModal
            onSave={async (payload) => {
              setSaveError('');
              try {
                await requestJson(
                  `${API_BASE_URL}/auth/change-password`,
                  {
                    method: 'POST',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                  },
                  'Failed to update password.'
                );
                closeModal();
              } catch (error) {
                setSaveError(error.message || 'Failed to update password.');
              }
            }}
            onClose={closeModal}
          />
        )}
      </Suspense>

      {/* Message Details Modal */}
      {selectedMessage && (
        <div className="admin-message-modal-overlay"
          onClick={() => setSelectedMessage(null)}>
          <div className="admin-message-modal" onClick={e => e.stopPropagation()}>
            <h2 className="admin-message-modal-title">{selectedMessage.name}</h2>
            <div className="admin-message-modal-email">{selectedMessage.email}</div>
            <div className="admin-message-modal-date">{new Date(selectedMessage.created_at).toLocaleString()}</div>
            <div className="admin-message-modal-body">{selectedMessage.message}</div>
            <button onClick={() => setSelectedMessage(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

