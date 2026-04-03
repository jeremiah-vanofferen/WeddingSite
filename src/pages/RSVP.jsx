// Copyright 2026 Jeremiah Van Offeren
import '../pages/pages.css';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../utils/api';
import { getPublicAuthHeaders } from '../utils/http';
import { fetchGuestLookupSuggestions } from '../utils/publicData';

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

  useEffect(() => {
    let isMounted = true;

    const loadGuestNames = async () => {
      const data = await fetchGuestLookupSuggestions();
      if (isMounted) {
        setGuestSuggestions(data.suggestions);
      }
    };

    loadGuestNames();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
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

        try {
          data = await response.json();
        } catch {
          data = null;
        }

        setError(data?.error || 'Submission failed. Please try again.');
      }
    } catch (error) {
      if (error instanceof TypeError) {
        setError('Network error. Please try again.');
      } else {
        setError('Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
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
            <div className="form-group">
              <label htmlFor="rsvp-name">Name</label>
              <input id="rsvp-name" name="name" type="text" list="rsvp-guest-suggestions" value={form.name} onChange={handleChange} required />
              <datalist id="rsvp-guest-suggestions">
                {guestSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
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
