// SettingsModal.jsx
import { useState, useEffect } from 'react';

const EMPTY_SETTINGS = {
  websiteName: '',
  theme: '',
  primaryColor: '',
  primaryColorHover: '',
  fontFamily: '',
  showCountdown: false,
  allowRsvp: false,
  welcomeMessage: '',
  adminEmail: ''
};

export function SettingsModal({ settings, onSave, onClose }) {
  const [formData, setFormData] = useState({ ...EMPTY_SETTINGS, ...settings });

  useEffect(() => {
    setFormData({ ...EMPTY_SETTINGS, ...settings });
  }, [settings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const resetToDefaults = () => {
    const defaults = {
      websiteName: 'My Wedding',
      theme: 'elegant',
      primaryColor: '#0a20ca',
      primaryColorHover: '#1894dc',
      fontFamily: 'serif',
      showCountdown: true,
      allowRsvp: true,
      welcomeMessage: 'Thank you for visiting our wedding website. We\'re thrilled to share the details of our celebration with you.',
      adminEmail: 'your@email.com'
    };
    setFormData(defaults);
  };

  return (
    <div className="admin-modal">
      <style>{`
        .preview-card.theme-elegant { background: linear-gradient(135deg, rgba(245, 247, 250, 0.9) 0%, rgba(195, 207, 226, 0.9) 100%) !important; border: 1px solid rgba(44, 62, 80, 0.2) !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important; }
        .preview-card.theme-modern { background: rgba(248, 249, 250, 0.9) !important; border: 1px solid rgba(233, 236, 239, 0.5) !important; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07) !important; }
        .preview-card.theme-rustic { background: rgba(253, 246, 227, 0.9) !important; border: 2px solid rgba(218, 165, 32, 0.3) !important; box-shadow: 0 6px 20px rgba(139, 69, 19, 0.15) !important; }
        .preview-card.theme-vintage { background: rgba(240, 230, 210, 0.9) !important; border: 1px solid rgba(196, 164, 132, 0.3) !important; box-shadow: 0 4px 16px rgba(107, 68, 35, 0.1) !important; }
      `}</style>
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Website Settings</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="admin-modal-body admin-form" onSubmit={handleSubmit}>
          {/* Website Name Section */}
          <div className="settings-section">
            <h3 className="section-title">Basic Information</h3>
            <div className="setting-item">
              <label htmlFor="websiteName">Website Name</label>
              <input
                id="websiteName"
                name="websiteName"
                type="text"
                value={formData.websiteName}
                onChange={handleChange}
                placeholder="Enter your website name"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div className="setting-item">
              <label htmlFor="welcomeMessage">Welcome Message</label>
              <textarea
                id="welcomeMessage"
                name="welcomeMessage"
                value={formData.welcomeMessage}
                onChange={handleChange}
                placeholder="Enter your welcome message"
                rows="3"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div className="setting-item">
              <label htmlFor="adminEmail">Admin Email Address</label>
              <input
                id="adminEmail"
                name="adminEmail"
                type="email"
                value={formData.adminEmail || ''}
                onChange={handleChange}
                placeholder="Enter admin email address"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>
          </div>
          {/* Theme & Colors Section */}
          <div className="settings-section">
            <h3 className="section-title">Theme & Colors</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label htmlFor="theme">Theme</label>
                <select
                  id="theme"
                  name="theme"
                  value={formData.theme}
                  onChange={handleChange}
                >
                  <option value="elegant">Elegant</option>
                  <option value="modern">Modern</option>
                  <option value="rustic">Rustic</option>
                  <option value="vintage">Vintage</option>
                </select>
              </div>
              <div className="setting-item">
                <label htmlFor="fontFamily">Font Family</label>
                <select
                  id="fontFamily"
                  name="fontFamily"
                  value={formData.fontFamily}
                  onChange={handleChange}
                >
                  <option value="serif">Serif</option>
                  <option value="sans-serif">Sans Serif</option>
                  <option value="script">Script</option>
                  <option value="monospace">Monospace</option>
                </select>
              </div>
            </div>
            <div className="settings-grid">
              <div className="setting-item">
                <label htmlFor="primaryColor">Button Color</label>
                <div className="color-picker">
                  <input
                    id="primaryColor"
                    name="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={handleChange}
                  />
                  <span>{formData.primaryColor}</span>
                </div>
              </div>
              <div className="setting-item">
                <label htmlFor="primaryColorHover">Button Color (Hover)</label>
                <div className="color-picker">
                  <input
                    id="primaryColorHover"
                    name="primaryColorHover"
                    type="color"
                    value={formData.primaryColorHover}
                    onChange={handleChange}
                  />
                  <span>{formData.primaryColorHover}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Features Section */}
          <div className="settings-section">
            <h3 className="section-title">Features</h3>
            <div className="settings-grid-full">
              <div className="setting-item">
                <div className="checkbox-group">
                  <input
                    id="showCountdown"
                    name="showCountdown"
                    type="checkbox"
                    checked={formData.showCountdown}
                    onChange={handleChange}
                  />
                  <label htmlFor="showCountdown">Show wedding countdown</label>
                </div>
              </div>
              <div className="setting-item">
                <div className="checkbox-group">
                  <input
                    id="allowRsvp"
                    name="allowRsvp"
                    type="checkbox"
                    checked={formData.allowRsvp}
                    onChange={handleChange}
                  />
                  <label htmlFor="allowRsvp">Allow RSVP submissions</label>
                </div>
              </div>
            </div>
          </div>
          <div className="settings-preview">
            <h4>Preview Theme & Colors</h4>
            <div
              className={`preview-card theme-${formData.theme}`}
              style={{
                backgroundColor: formData.primaryColor,
                fontFamily: formData.fontFamily === 'serif' ? '"Times New Roman", serif' :
                           formData.fontFamily === 'sans-serif' ? '"Helvetica Neue", Arial, sans-serif' :
                           formData.fontFamily === 'script' ? '"Brush Script MT", cursive' :
                           '"Courier New", monospace',
                color: 'white',
                padding: '1rem',
                borderRadius: '8px',
                marginTop: '1rem',
                minHeight: '80px'
              }}
            >
              <h5 style={{ margin: '0 0 0.5rem 0' }}>Sample {formData.theme} Theme</h5>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                This is how your website will look with the current settings.
              </p>
            </div>
          </div>
          <div className="settings-preview">
            <h4>Preview Buttons</h4>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                style={{
                  backgroundColor: formData.primaryColor,
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: formData.fontFamily === 'serif' ? '"Times New Roman", serif' :
                             formData.fontFamily === 'sans-serif' ? '"Helvetica Neue", Arial, sans-serif' :
                             formData.fontFamily === 'script' ? '"Brush Script MT", cursive' :
                             '"Courier New", monospace',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                Normal Button
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: formData.primaryColorHover,
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: formData.fontFamily === 'serif' ? '"Times New Roman", serif' :
                             formData.fontFamily === 'sans-serif' ? '"Helvetica Neue", Arial, sans-serif' :
                             formData.fontFamily === 'script' ? '"Brush Script MT", cursive' :
                             '"Courier New", monospace',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                Hover Button
              </button>
            </div>
          </div>
        </form>
        <div className="admin-modal-footer">
          <button type="button" className="reset-btn" onClick={resetToDefaults}>
            Reset to Defaults
          </button>
          <div style={{ flex: 1 }}></div>
          <button type="button" className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="save-btn" onClick={handleSubmit}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}