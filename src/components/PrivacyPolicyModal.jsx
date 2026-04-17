// Copyright 2026 Jeremiah Van Offeren
import './PrivacyPolicyModal.css';
import PropTypes from 'prop-types';

export default function PrivacyPolicyModal({ onAccept, onDecline }) {
  return (
    <div className="privacy-overlay" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="privacy-modal">
        <h2 id="privacy-title">Privacy Notice</h2>

        <div className="privacy-body">
          <p>
            Before you submit, here is how we handle the information you share with us.
          </p>

          <h3>What we collect</h3>
          <p>
            We collect your name and email address so we can track your RSVP or respond
            to your message.
          </p>

          <h3>How we use it</h3>
          <ul>
            <li>To record your attendance and guest count.</li>
            <li>To reply to your message or question by email.</li>
            <li>To send you any important wedding day updates.</li>
          </ul>

          <h3>What we do not do</h3>
          <p>
            We do not sell, rent, or share your information with any third parties.
            Your data is used only for this event and nothing else.
          </p>

          <h3>Email responses</h3>
          <p>
            By submitting this form you agree that we may reply to you at the email
            address you provide.
          </p>
        </div>

        <div className="privacy-actions">
          <button className="privacy-accept-btn" onClick={onAccept}>
            I Understand &amp; Accept
          </button>
          <button className="privacy-decline-btn" onClick={onDecline}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

PrivacyPolicyModal.propTypes = {
  onAccept: PropTypes.func.isRequired,
  onDecline: PropTypes.func.isRequired,
};
