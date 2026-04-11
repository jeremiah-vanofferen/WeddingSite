// Copyright 2026 Jeremiah Van Offeren
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../utils/api';
import { getPublicAuthHeaders } from '../utils/http';
import { fetchGuestLookupSuggestions } from '../utils/publicData';
import '../pages/pages.css';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [guestSuggestions, setGuestSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const headers = await getPublicAuthHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form)
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
      <div className="page page-contact">
        <h1>Message Sent</h1>
        <p>Thank you for reaching out! We&apos;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <div className="page page-contact">
      <section className="page-hero">
        <div className="page-hero-copy narrow-copy">
          <p className="page-eyebrow">Questions and updates</p>
          <h1>Contact Us</h1>
          <p className="page-lede">Get in touch with us for any inquiries.</p>
        </div>
      </section>

      <section className="page-section page-split-layout">
        <div className="demo-card info-card">
          <p className="section-kicker">Before you send</p>
          <h3>What this form is best for</h3>
          <ul className="feature-list">
            <li>Travel and schedule questions.</li>
            <li>Accessibility or logistics notes.</li>
            <li>Anything that does not fit inside RSVP.</li>
          </ul>
          <p className="supporting-copy">If you are sharing attendance details, use the RSVP page so we can track your response correctly.</p>
        </div>

        <div className="demo-card form-card">
          <p className="section-kicker">Send a note</p>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group" style={{ position: 'relative' }}>
              <label htmlFor="contact-name">Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="off"
                  value={form.name}
                  onChange={handleChange}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
                  onFocus={() => form.name.length >= 2 && setShowSuggestions(true)}
                  required
                  aria-autocomplete="list"
                  aria-controls="contact-guest-suggestions-list"
                />
                {showSuggestions && guestSuggestions.length > 0 && (
                  <ul
                    className="autocomplete-suggestions"
                    id="contact-guest-suggestions-list"
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
              <label htmlFor="contact-email">Email</label>
              <input id="contact-email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="contact-message">Message</label>
              <textarea id="contact-message" name="message" value={form.message} onChange={handleChange} rows="6" required></textarea>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send Message'}</button>
          </form>
        </div>
      </section>
    </div>
  );
}
