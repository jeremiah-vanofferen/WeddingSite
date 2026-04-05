// Copyright 2026 Jeremiah Van Offeren
import { useState, useEffect } from 'react';
import { PublicPhotoUploadModal } from '../components/PublicPhotoUploadModal';
import { fetchArray } from '../utils/publicData';
import LoadingSpinner from '../components/LoadingSpinner';
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
    <div className="page page-gallery">
      <section className="gallery-hero-shell">
        <div className="gallery-header gallery-header-card">
          <div>
            <p className="page-eyebrow">Shared memories</p>
            <h1>Photo Gallery</h1>
            <p>Browse photos from our celebration.</p>
          </div>
          <button className="form-btn gallery-share-button" onClick={() => setUploadModalOpen(true)}>
            + Share Photo
          </button>
        </div>

        <div className="demo-card gallery-info-card">
          <p className="section-kicker">Guest uploads welcome</p>
          <h3>Help us collect the full story</h3>
          <p>Share your favorite moments from the day. New uploads are reviewed before they appear in the gallery.</p>
          <div className="gallery-stat-row">
            <div className="gallery-stat-pill">
              <span className="gallery-stat-label">Approved</span>
              <strong>{photos.length}</strong>
            </div>
            <div className="gallery-stat-pill">
              <span className="gallery-stat-label">Status</span>
              <strong>{loading ? 'Loading' : 'Live'}</strong>
            </div>
          </div>
        </div>
      </section>

      {uploadSuccess && (
        <div className="gallery-success-message">
          Thank you! Your photo has been submitted and will appear after admin approval.
        </div>
      )}

      {/* ── Photo grid ─────────────────────────────── */}
      {loading ? (
        <LoadingSpinner />
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
              <div className="gallery-img-wrap">
                <img src={photo.url} alt={photo.caption || ''} className="gallery-img" />
              </div>
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
