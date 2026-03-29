// PhotoGalleryModal.jsx
import { useState } from 'react';

export function PhotoGalleryModal({ photos, onSave, onClose }) {
  const [photoList, setPhotoList] = useState(photos);
  const [editingPhoto, setEditingPhoto] = useState(null);

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

  const handleDelete = (photoId) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      const updatedList = photoList.filter(photo => photo.id !== photoId);
      setPhotoList(updatedList);
      onSave(updatedList);
    }
  };

  const toggleFeatured = (photoId) => {
    const updatedList = photoList.map(photo =>
      photo.id === photoId ? { ...photo, featured: !photo.featured } : photo
    );
    setPhotoList(updatedList);
    onSave(updatedList);
  };

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Photo Gallery Management</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="admin-modal-body">
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
                    >
                      Delete
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
  const [formData, setFormData] = useState({
    url: '',
    caption: '',
    featured: false
  });

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

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Add New Photo</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="admin-modal-body admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="url">Photo URL</label>
            <input
              id="url"
              name="url"
              type="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="https://example.com/photo.jpg"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="caption">Caption</label>
            <input
              id="caption"
              name="caption"
              type="text"
              value={formData.caption}
              onChange={handleChange}
              placeholder="Describe the photo"
              required
            />
          </div>
          <div className="checkbox-group">
            <input
              id="featured"
              name="featured"
              type="checkbox"
              checked={formData.featured}
              onChange={handleChange}
            />
            <label htmlFor="featured">Feature this photo</label>
          </div>
          {formData.url && (
            <div className="photo-preview">
              <h4>Preview:</h4>
              <div className="photo-image-container" style={{ width: '200px', height: '200px', margin: '0 auto' }}>
                <img
                  src={formData.url}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
          <button type="submit" className="save-btn" onClick={handleSubmit}>Add Photo</button>
        </div>
      </div>
    </div>
  );
}

function EditPhotoModal({ photo, onSave, onClose }) {
  const [formData, setFormData] = useState(photo);

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

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Edit Photo</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="admin-modal-body admin-form" onSubmit={handleSubmit}>
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
              <div className="photo-image-container" style={{ width: '200px', height: '200px', margin: '0 auto' }}>
                <img
                  src={formData.url}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
          <button type="submit" className="save-btn" onClick={handleSubmit}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}