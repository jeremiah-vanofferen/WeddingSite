// Copyright 2026 Jeremiah Van Offeren
import '../pages/pages.css';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../utils/api';
import { getPublicAuthHeaders } from '../utils/http';
import { fetchGuestLookupSuggestions } from '../utils/publicData';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

const PRIVACY_KEY = 'wedding_privacy_accepted';

export default function RSVP() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    attending: '',
    guests: 0
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [guestSuggestions, setGuestSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Autocomplete guest name as user types
  useEffect(() => {
    let active = true;
    const fetchSuggestions = async () => {
      if (form.name && form.name.length >= 2) {
        const data = await fetchGuestLookupSuggestions(form.name);
        if (active) setGuestSuggestions(data.suggestions);
      } else {
        setGuestSuggestions([]);
      }
    };
    fetchSuggestions();
    return () => { active = false; };
  }, [form.name]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'name') {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setForm((prev) => ({ ...prev, name: suggestion }));
    setShowSuggestions(false);
  };

  const submitRsvp = async () => {
    setSubmitting(true);
    setError('');
    try {
      const headers = await getPublicAuthHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch(`${API_BASE_URL}/rsvp`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          rsvp: form.attending,
          guests: Number(form.guests)
        })
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        let data = null;
        try { data = await response.json(); } catch { data = null; }
        setError(data?.error || 'Submission failed. Please try again.');
      }
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Network error. Please try again.');
      } else {
        setError('Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localStorage.getItem(PRIVACY_KEY)) {
      setShowPrivacy(true);
      return;
    }
    await submitRsvp();
  };

  const handlePrivacyAccept = () => {
    localStorage.setItem(PRIVACY_KEY, 'true');
    setShowPrivacy(false);
    submitRsvp();
  };

  const handlePrivacyDecline = () => {
    setShowPrivacy(false);
  };

  if (submitted) {
    return (
      <div className="page page-rsvp">
        <h1>RSVP Received</h1>
        <p>Thank you for your response! We look forward to celebrating with you.</p>
      </div>
    );
  }

  return (
    <div className="page page-rsvp">
      {showPrivacy && (
        <PrivacyPolicyModal onAccept={handlePrivacyAccept} onDecline={handlePrivacyDecline} />
      )}

      <section className="page-hero">
        <div className="page-hero-copy narrow-copy">
          <p className="page-eyebrow">Please respond</p>
          <h1>RSVP</h1>
          <p className="page-lede">Please let us know if you can join us for our special day.</p>
        </div>
      </section>

      <section className="page-section page-split-layout">
        <div className="demo-card info-card">
          <p className="section-kicker">Helpful notes</p>
          <h3>Before you submit</h3>
          <ul className="feature-list">
            <li>Include yourself in the guest count.</li>
            <li>If you cannot attend, set guests to 0.</li>
            <li>Use the name on your invitation for faster matching.</li>
          </ul>
          <p className="supporting-copy">You can update us again later if your plans change.</p>
        </div>

        <div className="demo-card form-card">
          <p className="section-kicker">Attendance form</p>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group" style={{ position: 'relative' }}>
              <label htmlFor="rsvp-name">Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="rsvp-name"
                  name="name"
                  type="text"
                  autoComplete="off"
                  value={form.name}
                  onChange={handleChange}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
                  onFocus={() => form.name.length >= 2 && setShowSuggestions(true)}
                  required
                  aria-autocomplete="list"
                  aria-controls="rsvp-guest-suggestions-list"
                />
                {showSuggestions && guestSuggestions.length > 0 && (
                  <ul
                    className="autocomplete-suggestions"
                    id="rsvp-guest-suggestions-list"
                    style={{ top: '100%', left: 0, right: 0, position: 'absolute' }}
                  >
                    {guestSuggestions.map((name) => (
                      <li key={name} onMouseDown={() => handleSuggestionClick(name)}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="rsvp-email">Email</label>
              <input id="rsvp-email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="rsvp-attending">Will you attend?</label>
                <select id="rsvp-attending" name="attending" value={form.attending} onChange={handleChange} required>
                  <option value="">Select</option>
                  <option value="yes">Yes, I will attend</option>
                  <option value="no">No, I cannot attend</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="rsvp-guests">Number of Guests (including you)</label>
                <input id="rsvp-guests" name="guests" type="number" min="0" max="10" value={form.guests} onChange={handleChange} required />
              </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit RSVP'}</button>
          </form>
        </div>
      </section>
    </div>
  );
}
