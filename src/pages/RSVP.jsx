import '../pages/pages.css';
import { useState } from 'react';
import { API_BASE_URL } from '../utils/api';

export default function RSVP() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    attending: '',
    guests: 0,
    dietary: ''
  });
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
      const response = await fetch(`${API_BASE_URL}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          rsvp: form.attending,
          guests: Number(form.guests),
          dietary: form.dietary
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
        <h1>RSVP Received</h1>
        <p>Thank you for your response! We look forward to celebrating with you.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>RSVP</h1>
      <p>Please let us know if you can join us for our special day.</p>
      <div className="demo-card">
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="rsvp-name">Name</label>
            <input id="rsvp-name" name="name" type="text" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="rsvp-email">Email</label>
            <input id="rsvp-email" name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
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
          <div className="form-group">
            <label htmlFor="rsvp-dietary">Dietary Restrictions</label>
            <input id="rsvp-dietary" name="dietary" type="text" value={form.dietary} onChange={handleChange} placeholder="Optional" />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit RSVP'}</button>
        </form>
      </div>
    </div>
  );
}
