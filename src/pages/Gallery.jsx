import { useState, useEffect } from 'react';
import { PublicPhotoUploadModal } from '../components/PublicPhotoUploadModal';
import { fetchArray } from '../utils/publicData';
import '../pages/pages.css';
import './Gallery.css';

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchPhotos = async () => {
    const data = await fetchArray('/gallery');
    setPhotos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleUploadSuccess = () => {
    setUploadSuccess(true);
    setUploadModalOpen(false);
    fetchPhotos();
    window.setTimeout(() => setUploadSuccess(false), 5000);
  };

  const closeLightbox = () => setLightbox(null);

  return (
    <div className="page">
      <div className="gallery-header">
        <div>
          <h1>Photo Gallery</h1>
          <p>Browse photos from our celebration.</p>
        </div>
        <button className="form-btn gallery-share-button" onClick={() => setUploadModalOpen(true)}>
          + Share Photo
        </button>
      </div>

      {uploadSuccess && (
        <div className="gallery-success-message">
          Thank you! Your photo has been submitted and will appear after admin approval.
        </div>
      )}

      {/* ── Photo grid ─────────────────────────────── */}
      {loading ? (
        <p className="gallery-loading">Loading photos…</p>
      ) : photos.length === 0 ? (
        <div className="demo-card">
          <p className="gallery-empty-text">No photos approved yet — check back soon!</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {photos.map(photo => (
            <button
              key={photo.id}
              className="gallery-card"
              onClick={() => setLightbox(photo)}
              aria-label={`View photo: ${photo.caption || 'Untitled'}`}
            >
              <img src={photo.url} alt={photo.caption || ''} className="gallery-img" />
              {photo.caption && <p className="gallery-caption">{photo.caption}</p>}
            </button>
          ))}
        </div>
      )}

      {/* ── Lightbox ───────────────────────────────── */}
      {lightbox && (
        <div
          className="gallery-lightbox"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.caption || 'Photo'}
        >
          <div className="gallery-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="gallery-lightbox-close" onClick={closeLightbox} aria-label="Close">&times;</button>
            <img src={lightbox.url} alt={lightbox.caption || ''} className="gallery-lightbox-img" />
            {lightbox.caption && <p className="gallery-lightbox-caption">{lightbox.caption}</p>}
            {lightbox.submitter_name && (
              <p className="gallery-lightbox-submitter">Shared by {lightbox.submitter_name}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Upload Modal ───────────────────────────── */}
      {uploadModalOpen && (
        <PublicPhotoUploadModal
          onSuccess={handleUploadSuccess}
          onClose={() => setUploadModalOpen(false)}
        />
      )}
    </div>
  );
}
