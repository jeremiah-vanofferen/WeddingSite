// PhotoGalleryModal.jsx
import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { API_BASE_URL } from '../utils/api';
import { getAuthHeaders, requestJson } from '../utils/http';

export function PhotoGalleryModal({ photos, onSave, onClose }) {
  const [photoList, setPhotoList] = useState(photos);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const handleEdit = (photo) => {
    setEditingPhoto(photo);
  };

  const handleSaveEdit = (updatedPhoto) => {
    const updatedList = photoList.map(photo =>
      photo.id === updatedPhoto.id ? updatedPhoto : photo
    );
    setPhotoList(updatedList);
    onSave(updatedList);
    setEditingPhoto(null);
  };

  const handleDelete = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;
    setDeleteError('');
    setDeletingId(photoId);
    try {
      await requestJson(
        `${API_BASE_URL}/gallery/${photoId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
        'Delete failed'
      );
      const updatedList = photoList.filter(photo => photo.id !== photoId);
      setPhotoList(updatedList);
      onSave(updatedList);
    } catch (error) {
      setDeleteError(error.message || 'Delete failed. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleFeatured = async (photoId) => {
    const photo = photoList.find(p => p.id === photoId);
    if (!photo) return;
    
    try {
      const updatedPhoto = await requestJson(
        `${API_BASE_URL}/gallery/${photoId}/featured`,
        {
          method: 'PUT',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ featured: !photo.featured }),
        },
        'Failed to update featured status'
      );
      const updatedList = photoList.map(p =>
        p.id === photoId ? updatedPhoto : p
      );
      setPhotoList(updatedList);
      onSave(updatedList);
    } catch (error) {
      setDeleteError(error.message || 'Failed to update featured status');
    }
  };

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Photo Gallery Management</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="admin-modal-body">
          {deleteError && <p className="form-error">{deleteError}</p>}
          <div className="photo-grid">
            {photoList.map(photo => (
              <div key={photo.id} className="photo-item">
                <div className="photo-image-container">
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentNode.querySelector('.photo-placeholder').style.display = 'flex';
                    }}
                  />
                  <div className="photo-placeholder">
                    <span>📷 Image</span>
                  </div>
                </div>
                <div className="photo-info">
                  {photo.featured && <span className="featured-badge">Featured</span>}
                  <h4>{photo.caption}</h4>
                  <div className="photo-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(photo)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(photo.id)}
                      disabled={deletingId === photo.id}
                    >
                      {deletingId === photo.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  <button
                    className="feature-btn"
                    onClick={() => toggleFeatured(photo.id)}
                  >
                    {photo.featured ? 'Unfeature' : 'Feature'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>Close</button>
        </div>
      </div>

      {editingPhoto && (
        <EditPhotoModal
          photo={editingPhoto}
          onSave={handleSaveEdit}
          onClose={() => setEditingPhoto(null)}
        />
      )}
    </div>
  );
}

export function AddPhotoModal({ onSave, onClose }) {
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

      const data = await requestJson(
        `${API_BASE_URL}/gallery/upload-file-admin`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        },
        'Upload failed'
      );

      onSave(data.photo);
    } catch (error) {
      setUploadError(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Add New Photo</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="admin-modal-body admin-form" onSubmit={handleSubmit}>
          {uploadError && <p className="form-error">{uploadError}</p>}
          <div className="form-group">
            <label htmlFor="photo">Photo File</label>
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
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Describe the photo"
            />
          </div>
          <div className="form-group">
            <label htmlFor="submitterName">Submitter name</label>
            <input
              id="submitterName"
              name="submitterName"
              type="text"
              value={submitterName}
              onChange={e => setSubmitterName(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {previewUrl && (
            <div className="photo-preview">
              <h4>Preview:</h4>
              <div className="photo-image-container photo-preview-frame">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="photo-preview-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.querySelector('.photo-placeholder').style.display = 'flex';
                  }}
                />
                <div className="photo-placeholder">
                  <span>📷 Preview</span>
                </div>
              </div>
            </div>
          )}
        </form>
        <div className="admin-modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="save-btn" onClick={handleSubmit} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Add Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPhotoModal({ photo, onSave, onClose }) {
  const [formData, setFormData] = useState(photo);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);

    try {
      const updatedPhoto = await requestJson(
        `${API_BASE_URL}/gallery/${photo.id}`,
        {
          method: 'PUT',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            url: formData.url,
            caption: formData.caption,
            featured: Boolean(formData.featured),
          }),
        },
        'Failed to save photo changes'
      );

      onSave(updatedPhoto);
    } catch (error) {
      setSaveError(error.message || 'Failed to save photo changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Edit Photo</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="admin-modal-body admin-form" onSubmit={handleSubmit}>
          {saveError && <p className="form-error">{saveError}</p>}
          <div className="form-group">
            <label htmlFor="edit-url">Photo URL</label>
            <input
              id="edit-url"
              name="url"
              type="url"
              value={formData.url}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-caption">Caption</label>
            <input
              id="edit-caption"
              name="caption"
              type="text"
              value={formData.caption}
              onChange={handleChange}
              required
            />
          </div>
          <div className="checkbox-group">
            <input
              id="edit-featured"
              name="featured"
              type="checkbox"
              checked={formData.featured}
              onChange={handleChange}
            />
            <label htmlFor="edit-featured">Feature this photo</label>
          </div>
          {formData.url && (
            <div className="photo-preview">
              <h4>Preview:</h4>
              <div className="photo-image-container photo-preview-frame">
                <img
                  src={formData.url}
                  alt="Preview"
                  className="photo-preview-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.querySelector('.photo-placeholder').style.display = 'flex';
                  }}
                />
                <div className="photo-placeholder">
                  <span>📷 Preview</span>
                </div>
              </div>
            </div>
          )}
        </form>
        <div className="admin-modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="save-btn" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

PhotoGalleryModal.propTypes = {
  photos: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    url: PropTypes.string,
    caption: PropTypes.string,
    featured: PropTypes.bool,
  })).isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

AddPhotoModal.propTypes = {
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

EditPhotoModal.propTypes = {
  photo: PropTypes.shape({
    id: PropTypes.number,
    url: PropTypes.string,
    caption: PropTypes.string,
    featured: PropTypes.bool,
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};