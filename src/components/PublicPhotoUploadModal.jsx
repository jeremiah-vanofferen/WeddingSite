// Copyright 2026 Jeremiah Van Offeren
import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { API_BASE_URL } from '../utils/api';
import { getPublicAuthHeaders } from '../utils/http';

export function PublicPhotoUploadModal({ onSuccess, onClose }) {
  const [caption, setCaption] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewUrl('');
      return;
    }
    setPreviewUrl(window.URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setUploadError('Please select an image file.');
      return;
    }

    try {
      setUploading(true);
      const formData = new window.FormData();
      formData.append('photo', file);
      if (caption) formData.append('caption', caption);
      if (submitterName) formData.append('submitterName', submitterName);

      const headers = await getPublicAuthHeaders();

      const res = await fetch(`${API_BASE_URL}/gallery/upload-file`, {
        method: 'POST',
        headers,
        body: formData,
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Upload failed');
      }

      onSuccess();
    } catch (error) {
      if (error instanceof TypeError) {
        setUploadError('Network error. Please try again.');
      } else {
        setUploadError(error.message || 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="gallery-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="gallery-modal-content" onClick={e => e.stopPropagation()}>
        <div className="gallery-modal-header">
          <h2 id="upload-modal-title">Share a Photo</h2>
          <button className="gallery-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <form className="gallery-modal-body" onSubmit={handleSubmit}>
          {uploadError && <p className="form-error">{uploadError}</p>}
          <div className="form-group">
            <label htmlFor="photo">Photo File <span aria-hidden="true">*</span></label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              ref={fileInputRef}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="caption">Caption</label>
            <input
              id="caption"
              name="caption"
              type="text"
              maxLength={255}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Describe the photo"
            />
          </div>
          <div className="form-group">
            <label htmlFor="submitterName">Your name</label>
            <input
              id="submitterName"
              name="submitterName"
              type="text"
              maxLength={255}
              value={submitterName}
              onChange={e => setSubmitterName(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {previewUrl && (
            <div className="photo-preview">
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Preview:</p>
              <img src={previewUrl} alt="Preview" className="preview-img" />
            </div>
          )}
          <div className="gallery-modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="form-btn" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Submit Photo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

PublicPhotoUploadModal.propTypes = {
  onSuccess: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
