// GuestManagementModal.jsx
import { useState, useEffect } from 'react';
import Papa from 'papaparse';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://backend:5000/api';

export function GuestManagementModal({ onClose }) {
  const [guestList, setGuestList] = useState([]);
  const [editingGuest, setEditingGuest] = useState(null);
  const [uploadedGuests, setUploadedGuests] = useState([]);
  const [uploadMode, setUploadMode] = useState('merge'); // 'merge' or 'replace'
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch guests on component mount
  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/guests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch guests');
      }

      const guests = await response.json();
      setGuestList(guests);
    } catch (error) {
      console.error('Error fetching guests:', error);
      setError('Failed to load guests');
    } finally {
      setLoading(false);
    }
  };

  const saveGuests = async (guests) => {
    setGuestList(guests);
    // No need to call onSave anymore since we're using API
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      setUploadError('Please select a valid CSV file.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsUploading(false);
        const parsedGuests = validateAndParseGuests(results.data);
        if (parsedGuests.length === 0) {
          setUploadError('No valid guest data found in the file. Please check the format.');
          return;
        }
        setUploadedGuests(parsedGuests);
      },
      error: (error) => {
        setIsUploading(false);
        setUploadError(`Error parsing file: ${error.message}`);
      }
    });
  };

  const validateAndParseGuests = (data) => {
    const validGuests = [];
    const errors = [];

    if (!Array.isArray(data)) {
      setUploadError('Invalid data format');
      return [];
    }

    data.forEach((row, index) => {
      if (!row || typeof row !== 'object') {
        errors.push(`Row ${index + 1}: Invalid row data`);
        return;
      }

      // Check for required fields (case insensitive)
      const name = row.Name || row.name || row.NAME;
      const email = row.Email || row.email || row.EMAIL || row.EmailAddress || row.emailAddress;

      if (!name || !email) {
        errors.push(`Row ${index + 1}: Missing name or email`);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Row ${index + 1}: Invalid email format`);
        return;
      }

      // Parse RSVP status
      const rsvpRaw = row.RSVP || row.rsvp || row.Status || row.status || 'Pending';
      let rsvp = 'Pending';
      if (rsvpRaw.toLowerCase().includes('yes') || rsvpRaw.toLowerCase().includes('attending')) {
        rsvp = 'Yes';
      } else if (rsvpRaw.toLowerCase().includes('no') || rsvpRaw.toLowerCase().includes('not')) {
        rsvp = 'No';
      }

      // Parse plus one
      const plusOneRaw = row['Plus One'] || row.plusOne || row.PlusOne || row['+1'] || 'No';
      const plusOne = plusOneRaw.toLowerCase().includes('yes') || plusOneRaw.toLowerCase().includes('true') || plusOneRaw === '1';

      // Parse address and phone (optional fields)
      const address = row.Address || row.address || row.ADDRESS || '';
      const phone = row.Phone || row.phone || row.PHONE || row['Phone Number'] || row.phoneNumber || '';

      validGuests.push({
        id: Date.now() + index, // Temporary ID, will be replaced when saving
        name: name.trim(),
        email: email.trim().toLowerCase(),
        rsvp,
        plusOne,
        address: address.trim(),
        phone: phone.trim()
      });
    });

    if (errors.length > 0) {
      setUploadError(`Found ${errors.length} validation errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
    }

    return validGuests;
  };

  const handleImportGuests = async () => {
    if (uploadedGuests.length === 0) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/guests/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ guests: uploadedGuests, mode: uploadMode })
      });

      if (!response.ok) {
        throw new Error('Failed to import guests');
      }

      const updatedGuests = await response.json();
      setGuestList(updatedGuests);
      setUploadedGuests([]);
      setUploadError('');
    } catch (error) {
      console.error('Import error:', error);
      setUploadError('Failed to import guests. Please try again.');
    }
  };

  const clearUpload = () => {
    setUploadedGuests([]);
    setUploadError('');
  };

  const handleEdit = (guest) => {
    setEditingGuest(guest);
  };

  const handleSaveEdit = async (updatedGuest) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/guests/${updatedGuest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedGuest)
      });

      if (!response.ok) {
        throw new Error('Failed to update guest');
      }

      const savedGuest = await response.json();
      const updatedList = guestList.map(guest =>
        guest.id === savedGuest.id ? savedGuest : guest
      );
      setGuestList(updatedList);
      setEditingGuest(null);
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update guest. Please try again.');
    }
  };

  const handleDelete = async (guestId) => {
    if (window.confirm('Are you sure you want to delete this guest?')) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/guests/${guestId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete guest');
        }

        const updatedList = guestList.filter(guest => guest.id !== guestId);
        setGuestList(updatedList);
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete guest. Please try again.');
      }
    }
  };

  const handleRSVPChange = async (guestId, rsvp) => {
    try {
      const guest = guestList.find(g => g.id === guestId);
      if (!guest) return;

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/guests/${guestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...guest, rsvp })
      });

      if (!response.ok) {
        throw new Error('Failed to update RSVP');
      }

      const updatedGuest = await response.json();
      const updatedList = guestList.map(guest =>
        guest.id === updatedGuest.id ? updatedGuest : guest
      );
      setGuestList(updatedList);
    } catch (error) {
      console.error('RSVP update error:', error);
      alert('Failed to update RSVP. Please try again.');
    }
  };

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Guest Management</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="admin-modal-body">
          {error && <div className="error-message" role="alert">{error}</div>}
          <div className="guest-stats">
            <div className="stat-card">
              <h4>Total Guests</h4>
              <span className="stat-number">{guestList.length}</span>
            </div>
            <div className="stat-card">
              <h4>Attending</h4>
              <span className="stat-number">{guestList.filter(g => g.rsvp === 'Yes').length}</span>
            </div>
            <div className="stat-card">
              <h4>Pending</h4>
              <span className="stat-number">{guestList.filter(g => g.rsvp === 'Pending').length}</span>
            </div>
            <div className="stat-card">
              <h4>Not Attending</h4>
              <span className="stat-number">{guestList.filter(g => g.rsvp === 'No').length}</span>
            </div>
          </div>

          {/* CSV Upload Section */}
          <div className="csv-upload-section">
            <h3>Import Guests from CSV</h3>
            <div className="upload-controls">
              <div className="file-input-group">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  id="csv-file"
                  className="file-input"
                />
                <label htmlFor="csv-file" className="file-input-label">
                  Choose CSV File
                </label>
              </div>
              <div className="upload-mode">
                <label>
                  <input
                    type="radio"
                    value="merge"
                    checked={uploadMode === 'merge'}
                    onChange={(e) => setUploadMode(e.target.value)}
                  />
                  Merge with existing guests
                </label>
                <label>
                  <input
                    type="radio"
                    value="replace"
                    checked={uploadMode === 'replace'}
                    onChange={(e) => setUploadMode(e.target.value)}
                  />
                  Replace all guests
                </label>
              </div>
            </div>

            {isUploading && <div className="upload-status">Processing file...</div>}

            {uploadError && (
              <div className="upload-error">
                <h4>Upload Error</h4>
                <pre>{uploadError}</pre>
              </div>
            )}

            {uploadedGuests.length > 0 && (
              <div className="upload-preview">
                <h4>Preview ({uploadedGuests.length} guests)</h4>
                <div className="upload-actions">
                  <button onClick={handleImportGuests} className="import-btn">
                    Import Guests
                  </button>
                  <button onClick={clearUpload} className="cancel-upload-btn">
                    Cancel
                  </button>
                </div>
                <div className="preview-table-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Address</th>
                        <th>RSVP</th>
                        <th>Plus One</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedGuests.slice(0, 5).map((guest, index) => (
                        <tr key={index}>
                          <td>{guest.name}</td>
                          <td>{guest.email}</td>
                          <td>{guest.phone || '-'}</td>
                          <td>{guest.address || '-'}</td>
                          <td>{guest.rsvp}</td>
                          <td>{guest.plusOne ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                      {uploadedGuests.length > 5 && (
                        <tr>
                          <td colSpan="6" className="more-rows">
                            ... and {uploadedGuests.length - 5} more guests
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="csv-format-help">
              <h4>CSV Format</h4>
              <p>Your CSV file should include these columns:</p>
              <ul>
                <li><strong>Name</strong> (required) - Guest's full name</li>
                <li><strong>Email</strong> (required) - Guest's email address</li>
                <li><strong>Phone</strong> (optional) - Guest's phone number</li>
                <li><strong>Address</strong> (optional) - Guest's mailing address</li>
                <li><strong>RSVP</strong> (optional) - "Yes", "No", or "Pending"</li>
                <li><strong>Plus One</strong> (optional) - "Yes" or "No"</li>
              </ul>
              <a href="/sample-guests.csv" download>Download Sample CSV</a>
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>RSVP</th>
                <th>Plus One</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guestList.map(guest => (
                <tr key={guest.id}>
                  <td>{guest.name}</td>
                  <td>{guest.email}</td>
                  <td>{guest.phone || '-'}</td>
                  <td>{guest.address || '-'}</td>
                  <td>
                    <select
                      value={guest.rsvp}
                      onChange={(e) => handleRSVPChange(guest.id, e.target.value)}
                      className="rsvp-select"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td>{guest.plusOne ? 'Yes' : 'No'}</td>
                  <td className="table-actions">
                    <button className="edit-btn" onClick={() => handleEdit(guest)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDelete(guest.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>Close</button>
        </div>
      </div>

      {editingGuest && (
        <EditGuestModal
          guest={editingGuest}
          onSave={handleSaveEdit}
          onClose={() => setEditingGuest(null)}
        />
      )}
    </div>
  );
}

export function AddGuestModal({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    rsvp: 'Pending',
    plusOne: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Add New Guest</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="admin-modal-body admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Guest Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter guest name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
          </div>
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter mailing address"
            />
          </div>
          <div className="form-group">
            <label htmlFor="rsvp">RSVP Status</label>
            <select
              id="rsvp"
              name="rsvp"
              value={formData.rsvp}
              onChange={handleChange}
            >
              <option value="Pending">Pending</option>
              <option value="Yes">Attending</option>
              <option value="No">Not Attending</option>
            </select>
          </div>
          <div className="checkbox-group">
            <input
              id="plusOne"
              name="plusOne"
              type="checkbox"
              checked={formData.plusOne}
              onChange={handleChange}
            />
            <label htmlFor="plusOne">Plus One Allowed</label>
          </div>
        </form>
        <div className="admin-modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="save-btn" onClick={handleSubmit}>Add Guest</button>
        </div>
      </div>
    </div>
  );
}

function EditGuestModal({ guest, onSave, onClose }) {
  const [formData, setFormData] = useState(guest);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="admin-modal">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>Edit Guest</h2>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="admin-modal-body admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="edit-name">Guest Name</label>
            <input
              id="edit-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-email">Email Address</label>
            <input
              id="edit-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-phone">Phone Number</label>
            <input
              id="edit-phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-address">Address</label>
            <input
              id="edit-address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter mailing address"
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-rsvp">RSVP Status</label>
            <select
              id="edit-rsvp"
              name="rsvp"
              value={formData.rsvp}
              onChange={handleChange}
            >
              <option value="Pending">Pending</option>
              <option value="Yes">Attending</option>
              <option value="No">Not Attending</option>
            </select>
          </div>
          <div className="checkbox-group">
            <input
              id="edit-plusOne"
              name="plusOne"
              type="checkbox"
              checked={formData.plusOne}
              onChange={handleChange}
            />
            <label htmlFor="edit-plusOne">Plus One Allowed</label>
          </div>
        </form>
        <div className="admin-modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="save-btn" onClick={handleSubmit}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}