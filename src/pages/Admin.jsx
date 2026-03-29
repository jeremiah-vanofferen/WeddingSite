import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import '../pages/pages.css';
import './Admin.css';
import { WeddingDetailsModal, ViewDetailsModal } from '../components/WeddingDetailsModal';
import { GuestManagementModal, AddGuestModal } from '../components/GuestManagementModal';
import { ScheduleModal, AddEventModal } from '../components/ScheduleModal';
import { PhotoGalleryModal, AddPhotoModal } from '../components/PhotoGalleryModal';
import { SettingsModal } from '../components/SettingsModal';

const DEFAULT_SETTINGS = {
  theme: 'elegant',
  primaryColor: '#0a20ca',
  primaryColorHover: '#1894dc',
  fontFamily: 'sans-serif',
  showCountdown: true,
  allowRsvp: true,
  welcomeMessage: 'Thank you for visiting our wedding website. We\'re thrilled to share the details of our celebration with you.',
  adminEmail: ''
};

export default function Admin() {
  const { isLoggedIn, logout, adminName } = useAuth();
  const navigate = useNavigate();

  // State for different admin sections
  const [weddingDetails, setWeddingDetails] = useState({
    date: '',
    time: '',
    location: '',
    address: '',
    description: ''
  });

  const [guests, setGuests] = useState([]); // Will be loaded from API

  const [schedule, setSchedule] = useState([]);

  const [photos, setPhotos] = useState([
    { id: 1, url: '/placeholder-photo1.jpg', caption: 'Engagement photos', featured: true },
    { id: 2, url: '/placeholder-photo2.jpg', caption: 'Venue setup', featured: false }
  ]);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Load schedule from backend on mount
  useEffect(() => {
    fetch('/api/schedule')
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setSchedule(data) : setSchedule([]))
      .catch(() => {});
  }, []);

  // Load all settings (includes wedding details) from backend on mount
  const fetchSettings = () => {
    fetch('/api/settings', {
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          // Coerce boolean strings from DB back to actual booleans
          const coerced = { ...data };
          if ('showCountdown' in coerced) coerced.showCountdown = coerced.showCountdown === 'true' || coerced.showCountdown === true;
          if ('allowRsvp' in coerced) coerced.allowRsvp = coerced.allowRsvp === 'true' || coerced.allowRsvp === true;
          setSettings({ ...DEFAULT_SETTINGS, ...coerced });
          // Extract wedding details from settings
          setWeddingDetails(prev => ({
            ...prev,
            ...(coerced.weddingDate && { date: coerced.weddingDate }),
            ...(coerced.weddingTime && { time: coerced.weddingTime }),
            ...(coerced.weddingLocation && { location: coerced.weddingLocation }),
            ...(coerced.weddingAddress && { address: coerced.weddingAddress }),
            ...(coerced.weddingDescription && { description: coerced.weddingDescription }),
          }));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isLoggedIn) fetchSettings();
  }, [isLoggedIn]);

  // Messages state
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    if (isLoggedIn) {
      fetch('/api/messages', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      })
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setMessages(data) : setMessages([]));
    }
  }, [isLoggedIn]);

  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Mark message as read when modal opens
  useEffect(() => {
    if (selectedMessage && !selectedMessage.is_read) {
      fetch(`/api/messages/${selectedMessage.id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      })
        .then(res => res.json())
        .then(updated => {
          setMessages(msgs => msgs.map(m => m.id === updated.id ? { ...m, is_read: true } : m));
        });
    }
  }, [selectedMessage]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedGuests = localStorage.getItem('weddingGuests');
    const savedPhotos = localStorage.getItem('weddingPhotos');

    if (savedGuests) setGuests(JSON.parse(savedGuests));
    if (savedPhotos) setPhotos(JSON.parse(savedPhotos));
    // Settings, schedule, and wedding details are loaded from the database
  }, []);

  // Save data to localStorage
  const saveData = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

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
    setActiveModal(modalType);
    setEditingItem(item);
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingItem(null);
  };

  const handleSaveSettings = async (newSettings) => {
    setSettings(newSettings);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(newSettings)
    });
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: newSettings }));
  };

  return (
    <div className="page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {adminName}!</p>
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
            <button onClick={() => openModal('add-photo')}>Add Photo</button>
          </div>
        </div>

        <div className="demo-card">
          <h3>Website Settings</h3>
          <p>Configure website colors, fonts, and other preferences.</p>
          <button onClick={() => openModal('settings')}>Edit Settings</button>
        </div>

        <div className="demo-card">
          <h3>Contact Messages</h3>
          <p>View messages submitted from the contact form.</p>
          <div style={{ maxHeight: 300, overflowY: 'auto', background: '#fafbfc', border: '1px solid #eee', borderRadius: 6, padding: 8 }}>
            {messages.length === 0 ? (
              <p style={{ color: '#888' }}>No messages yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {messages.map(msg => (
                  <li key={msg.id} style={{ borderBottom: '1px solid #eee', marginBottom: 4, paddingBottom: 4, cursor: 'pointer' }}
                    onClick={() => setSelectedMessage(msg)}>
                    <span style={{ fontWeight: msg.is_read ? 'normal' : 'bold' }}>{msg.name}</span> <span style={{ color: '#999', fontSize: 12 }}>({new Date(msg.created_at).toLocaleDateString()})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <button className="logout-btn" onClick={logout}>Logout</button>

      {/* Modals */}
      {activeModal === 'details' && (
        <WeddingDetailsModal
          details={weddingDetails}
          onSave={(newDetails) => {
            setWeddingDetails(newDetails);
            fetch('/api/settings', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({
                weddingDate: newDetails.date,
                weddingTime: newDetails.time,
                weddingLocation: newDetails.location,
                weddingAddress: newDetails.address,
                weddingDescription: newDetails.description
              })
            }).catch(() => {});
            closeModal();
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
          onSave={(newGuest) => {
            // Guest will be added via API, no need to update local state
            closeModal();
          }}
          onClose={closeModal}
        />
      )}

      {activeModal === 'schedule' && (
        <ScheduleModal
          schedule={schedule}
          onSave={(newSchedule) => {
            // Persist new sort order / edits / deletes to DB then refresh
            fetch('/api/schedule', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({ events: newSchedule })
            })
              .then(res => res.json())
              .then(data => Array.isArray(data) ? setSchedule(data) : setSchedule(newSchedule))
              .catch(() => setSchedule(newSchedule));
          }}
          onClose={closeModal}
        />
      )}

      {activeModal === 'add-event' && (
        <AddEventModal
          onSave={(newEvent) => {
            fetch('/api/schedule', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify(newEvent)
            })
              .then(res => res.json())
              .then(created => setSchedule(prev => [...prev, created]))
              .catch(() => {});
            closeModal();
          }}
          onClose={closeModal}
        />
      )}

      {activeModal === 'photos' && (
        <PhotoGalleryModal
          photos={photos}
          onSave={(newPhotos) => {
            setPhotos(newPhotos);
            saveData('weddingPhotos', newPhotos);
          }}
          onClose={closeModal}
        />
      )}

      {activeModal === 'add-photo' && (
        <AddPhotoModal
          onSave={(newPhoto) => {
            const updatedPhotos = [...photos, { ...newPhoto, id: Date.now() }];
            setPhotos(updatedPhotos);
            saveData('weddingPhotos', updatedPhotos);
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

      {/* Message Details Modal */}
      {selectedMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelectedMessage(null)}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{selectedMessage.name}</h2>
            <div style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>{selectedMessage.email}</div>
            <div style={{ color: '#999', fontSize: 13, marginBottom: 12 }}>{new Date(selectedMessage.created_at).toLocaleString()}</div>
            <div style={{ marginBottom: 16 }}>{selectedMessage.message}</div>
            <button onClick={() => setSelectedMessage(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

