// Copyright 2026 Jeremiah Van Offeren
import PropTypes from 'prop-types';
import './LoadingSpinner.css';

export default function LoadingSpinner({ fullscreen = false }) {
  return (
    <div className={fullscreen ? 'loading-spinner-fullscreen' : 'loading-spinner'}>
      <div className="spinner-ring" role="status" aria-label="Loading">
        <span
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          Loading...
        </span>
      </div>
    </div>
  );
}

LoadingSpinner.propTypes = {
  fullscreen: PropTypes.bool,
};
