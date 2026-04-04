// Copyright 2026 Jeremiah Van Offeren
import './LoadingSpinner.css';

export default function LoadingSpinner({ fullscreen = false }) {
  return (
    <div className={fullscreen ? 'loading-spinner-fullscreen' : 'loading-spinner'}>
      <div className="spinner-ring" role="status" aria-label="Loading" />
    </div>
  );
}
