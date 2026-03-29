import '../pages/pages.css';
import { useState } from 'react';

export default function RSVP() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    attending: '',
    guests: 0,
    dietary: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/rsvp', {
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
        const data = await response.json();
        alert(data.error || 'Submission failed. Please try again.');
      }
    } catch (err) {
      alert('Network error. Please try again.');
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
            <label>Name</label>
            <input name="name" type="text" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Will you attend?</label>
            <select name="attending" value={form.attending} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="yes">Yes, I will attend</option>
              <option value="no">No, I cannot attend</option>
            </select>
          </div>
          <div className="form-group">
            <label>Number of Guests (including you)</label>
            <input name="guests" type="number" min="0" max="10" value={form.guests} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Dietary Restrictions</label>
            <input name="dietary" type="text" value={form.dietary} onChange={handleChange} placeholder="Optional" />
          </div>
          <button type="submit">Submit RSVP</button>
        </form>
      </div>
    </div>
  );
}
