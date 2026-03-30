import { useState } from 'react';
import { API_BASE_URL } from '../utils/api';
import '../pages/pages.css';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

        setError(data.error || 'Submission failed. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="page">
        <h1>Message Sent</h1>
        <p>Thank you for reaching out! We&apos;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Contact Us</h1>
      <p>Get in touch with us for any inquiries.</p>
      <div className="demo-card">
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="contact-name">Name</label>
            <input id="contact-name" name="name" type="text" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="contact-email">Email</label>
            <input id="contact-email" name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="contact-message">Message</label>
            <textarea id="contact-message" name="message" value={form.message} onChange={handleChange} rows="5" required></textarea>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send Message'}</button>
        </form>
      </div>
    </div>
  );
}
