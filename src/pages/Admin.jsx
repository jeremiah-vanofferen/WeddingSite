// Copyright 2026 Jeremiah Van Offeren
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../utils/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../pages/pages.css';
import './Admin.css';
import { DEFAULT_SETTINGS, DEFAULT_WEDDING_TIME_ZONE } from '../utils/constants';
import { API_BASE_URL } from '../utils/api';
import { getAuthHeaders, requestJson } from '../utils/http';
import { fetchArray } from '../utils/publicData';
import { formatIsoDate, formatIsoDateTime, resolveTimeZone } from '../utils/dateTime';
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
    timeZone: DEFAULT_WEDDING_TIME_ZONE,
    location: '',
    address: '',
    description: '',
    registryUrl: ''
  });

  const [schedule, setSchedule] = useState([]);
  const [guestList, setGuestList] = useState([]);

  const [photos, setPhotos] = useState([]);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Load schedule from backend on mount
  useEffect(() => {
    fetchArray('/schedule')
      .then(setSchedule)
      .catch(() => {
        setSchedule([]);
      });
  }, []);

  const fetchPhotos = () => {
    fetchArray('/gallery')
      .then(setPhotos)
      .catch(() => {
        setPhotos([]);
      });
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetch(`${API_BASE_URL}/guests`, {
        headers: getAuthHeaders()
      })
        .then(res => (res.ok ? res.json() : []))
        .then(data => setGuestList(Array.isArray(data) ? data : []))
        .catch(() => {
          setGuestList([]);
        });
    }
  }, [isLoggedIn]);

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
        .then(data => Array.isArray(data) ? setMessages(data) : setMessages([]))
        .catch(() => {
          setMessages([]);
        });
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
  const [selectedMessage, setSelectedMessage] = useState(null);
  const unreadMessageCount = messages.filter(message => !message.is_read).length;
  const totalPartySize = guestList.reduce((sum, guest) => {
    const rawCount = guest.guest_count ?? guest.guestCount;
    if (Number.isInteger(rawCount) && rawCount >= 0) {
      return sum + rawCount;
    }
    return sum + (guest.plusOne ? 2 : 1);
  }, 0);

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

  const openModal = (modalType, _item = null) => {
    if (modalType === 'settings') fetchSettings();
    setSaveError('');
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setSaveError('');
    setActiveModal(null);
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
    <div className="page page-admin">
      <div className="admin-header surface-panel">
        <p className="page-eyebrow">Control center</p>
        <div className="admin-header-top">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Welcome, {adminName}!</p>
          </div>
          <button className="logout-btn secondary-button" onClick={logout}>Logout</button>
        </div>
        {saveError && (
          <p className="admin-error-message">{saveError}</p>
        )}

        <div className="admin-overview-grid">
          <div className="metric-card">
            <span className="metric-label">Guests</span>
            <span className="metric-value">{totalPartySize}</span>
            <span className="metric-meta">Confirmed party size</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Timeline</span>
            <span className="metric-value">{schedule.length}</span>
            <span className="metric-meta">Scheduled events</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Gallery</span>
            <span className="metric-value">{photos.length}</span>
            <span className="metric-meta">Approved photos</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Approvals</span>
            <span className="metric-value">{pendingPhotoCount}</span>
            <span className="metric-meta">Pending submissions</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Messages</span>
            <span className="metric-value">{unreadMessageCount}</span>
            <span className="metric-meta">Unread contact notes</span>
          </div>
        </div>
      </div>

      <div className="admin-layout">
        <div className="admin-section admin-console-grid">
          <div className="demo-card admin-console-card">
            <p className="section-kicker">Presentation</p>
            <h3>Website Settings</h3>
            <p>Configure website colors, fonts, and other preferences.</p>
            <div className="admin-card-meta">Theme and content defaults</div>
            <button onClick={() => openModal('settings')}>Edit Settings</button>
          </div>

          <div className="demo-card admin-console-card">
            <p className="section-kicker">Content</p>
            <h3>Wedding Details</h3>
            <p>Manage wedding date, location, and other important details here.</p>
            <div className="admin-card-meta">Public-facing information</div>
            <div className="admin-actions">
              <button onClick={() => openModal('details')}>Edit Details</button>
              <button className="tonal-button" onClick={() => openModal('view-details')}>View Details</button>
            </div>
          </div>

          <div className="demo-card admin-console-card">
            <p className="section-kicker">Guests</p>
            <h3>Guest Management</h3>
            <p>View RSVPs and manage your guest list ({guestList.length} records).</p>
            <div className="admin-card-meta">Attendance and manual edits - party size {totalPartySize}</div>
            <div className="admin-actions">
              <button onClick={() => openModal('guests')}>Manage Guests</button>
              <button className="tonal-button" onClick={() => openModal('add-guest')}>Add Guest</button>
            </div>
          </div>

          <div className="demo-card admin-console-card">
            <p className="section-kicker">Timeline</p>
            <h3>Schedule & Timeline</h3>
            <p>Update the wedding day schedule and timeline ({schedule.length} events).</p>
            <div className="admin-card-meta">Event ordering and descriptions</div>
            <div className="admin-actions">
              <button onClick={() => openModal('schedule')}>Edit Schedule</button>
              <button className="tonal-button" onClick={() => openModal('add-event')}>Add Event</button>
            </div>
          </div>

          <div className="demo-card admin-console-card">
            <p className="section-kicker">Media</p>
            <h3>Photo Gallery</h3>
            <p>Upload and manage wedding photos and gallery ({photos.length} photos).</p>
            <div className="admin-card-meta">Curated content library</div>
            <div className="admin-actions">
              <button onClick={() => openModal('photos')}>Manage Photos</button>
              <button className="tonal-button" onClick={() => openModal('add-photo')}>Upload Photo</button>
            </div>
          </div>

          <div className="demo-card admin-console-card admin-console-card-accent">
            <p className="section-kicker">Queue</p>
            <h3>Photo Approvals</h3>
            <p>Review guest photo submissions ({pendingPhotoCount} pending).</p>
            <div className="admin-card-meta">Moderation workflow</div>
            <button onClick={() => openModal('gallery-approvals')}>Review Submissions</button>
          </div>

          <div className="demo-card admin-console-card">
            <p className="section-kicker">Security</p>
            <h3>Account Security</h3>
            <p>Update your admin password.</p>
            <div className="admin-card-meta">Admin authentication</div>
            <button onClick={() => openModal('change-password')}>Change Password</button>
          </div>
        </div>

        <aside className="demo-card admin-console-card admin-messages-card">
          <div className="admin-messages-header">
            <div>
              <p className="section-kicker">Inbox</p>
              <h3>Contact Messages</h3>
            </div>
            <span className="admin-message-badge">{messages.length}</span>
          </div>
          <p>View messages submitted from the contact form.</p>
          <div className="admin-messages-actions">
            <button className="tonal-button" type="button" onClick={() => setSelectedMessage(messages[0] || null)} disabled={messages.length === 0}>
              Open Latest
            </button>
          </div>
          <div className="admin-messages-panel">
            {messages.length === 0 ? (
              <p className="admin-messages-empty">No messages yet.</p>
            ) : (
              <ul className="admin-messages-list">
                {messages.map(msg => (
                  <li key={msg.id} className="admin-messages-item"
                    onClick={() => setSelectedMessage(msg)}>
                    <span className={`admin-messages-name${msg.is_read ? '' : ' admin-messages-name-unread'}`}>{msg.name}</span>
                    <span className="admin-messages-date">({formatIsoDate(msg.created_at, undefined, resolveTimeZone(weddingDetails.timeZone))})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

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
                      weddingTimeZone: resolveTimeZone(newDetails.timeZone),
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
            onSave={(newPhotos) => {
              const photosToAdd = Array.isArray(newPhotos) ? newPhotos : [newPhotos];
              const updatedPhotos = [...photosToAdd, ...photos];
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
            <div className="admin-message-modal-date">
              {formatIsoDateTime(selectedMessage.created_at, undefined, resolveTimeZone(weddingDetails.timeZone))}
            </div>
            <div className="admin-message-modal-body">{selectedMessage.message}</div>
            <button className="admin-message-modal-close" onClick={() => setSelectedMessage(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

