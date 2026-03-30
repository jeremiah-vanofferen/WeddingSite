import { useState } from 'react';
import PropTypes from 'prop-types';

export default function ChangePasswordModal({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [formError, setFormError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError('');
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.newPassword.length < 8) {
      setFormError('New password must be at least 8 characters long.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setFormError('New password and confirmation do not match.');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="change-password-heading">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2 id="change-password-heading">Change Password</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>

        <form className="admin-modal-body admin-form" onSubmit={handleSubmit} data-testid="change-password-modal">
          {formError && (
            <p style={{ color: '#b42318', marginTop: 0 }}>{formError}</p>
          )}

          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </form>

        <div className="admin-modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="save-btn" onClick={handleSubmit}>Update Password</button>
        </div>
      </div>
    </div>
  );
}

ChangePasswordModal.propTypes = {
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
