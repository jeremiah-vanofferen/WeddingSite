// Copyright 2026 Jeremiah Van Offeren
// GuestManagementModal.jsx
import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import PropTypes from 'prop-types';
import { API_BASE_URL } from '../utils/api';
import { getAuthHeaders } from '../utils/http';

export function GuestManagementModal({ onClose }) {
  const [guestList, setGuestList] = useState([]);
  const [editingGuest, setEditingGuest] = useState(null);
  const [uploadedGuests, setUploadedGuests] = useState([]);
  const [uploadMode, setUploadMode] = useState('merge'); // 'merge' or 'replace'
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // Fetch guests on component mount
  useEffect(() => {
    fetchGuests();
  }, []);

  const stats = useMemo(() => {
    let attending = 0;
    let pending = 0;
    let notAttending = 0;

    for (const guest of guestList) {
      if (guest.rsvp === 'Yes') attending += 1;
      else if (guest.rsvp === 'No') notAttending += 1;
      else pending += 1;
    }

    return {
      total: guestList.length,
      attending,
      pending,
      notAttending,
    };
  }, [guestList]);

  const fetchGuests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/guests`, {
        headers: getAuthHeaders()
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
      // fetch complete
    }
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

    const getValue = (row, keys) => {
      for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
      return '';
    };

    const normalizeName = (row) => {
      const directName = getValue(row, ['Name', 'name', 'NAME', 'Guest Name', 'guestName']);
      if (directName) return directName;

      const firstName = getValue(row, ['First name', 'First Name', 'firstName', 'first_name']);
      const lastName = getValue(row, ['Last Name', 'Last name', 'lastName', 'last_name', 'Surname']);
      return `${firstName} ${lastName}`.trim();
    };

    if (!Array.isArray(data)) {
      setUploadError('Invalid data format');
      return [];
    }

    data.forEach((row, index) => {
      if (!row || typeof row !== 'object') {
        errors.push(`Row ${index + 1}: Invalid row data`);
        return;
      }

      const name = normalizeName(row);
      if (!name) {
        errors.push(`Row ${index + 1}: Missing guest name`);
        return;
      }

      const rawEmail = getValue(row, ['Email', 'email', 'EMAIL', 'EmailAddress', 'emailAddress']);
      const isEmptyEmail = rawEmail === '' || rawEmail === '-' || rawEmail.toLowerCase() === 'n/a';
      const email = isEmptyEmail ? null : rawEmail.toLowerCase();

      // Only validate email format if one was actually provided (not empty/placeholder).
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push(`Row ${index + 1}: Invalid email format`);
          return;
        }
      }

      // Parse RSVP status
      const rsvpRaw = String(getValue(row, ['RSVP', 'rsvp', 'Status', 'status']) || 'Pending').toLowerCase();
      let rsvp = 'Pending';
      if (rsvpRaw.includes('yes') || rsvpRaw.includes('attending')) {
        rsvp = 'Yes';
      } else if (rsvpRaw.includes('no') || rsvpRaw.includes('not')) {
        rsvp = 'No';
      }

      // Parse plus one (legacy CSV support)
      const plusOneRaw = getValue(row, ['Plus One', 'plusOne', 'PlusOne', '+1', 'Dependants', 'dependants']) || 'No';
      const plusOneValue = String(plusOneRaw).toLowerCase();
      const plusOne =
        plusOneValue.includes('yes') ||
        plusOneValue.includes('true') ||
        plusOneValue === '1' ||
        (plusOneValue !== '' && plusOneValue !== 'no' && plusOneValue !== 'none' && plusOneValue !== '-');

      const guestCountRaw = getValue(row, ['Guest Count', 'guestCount', 'guest_count', 'Guests', 'guests', 'Party Size', 'partySize']);
      let guestCount = Number.parseInt(guestCountRaw, 10);
      if (!Number.isInteger(guestCount) || guestCount < 0) {
        guestCount = plusOne ? 2 : 1;
      }

      // Parse address and phone (optional fields) including address-book export headers.
      const legacyAddress = getValue(row, ['Address', 'address', 'ADDRESS']);
      const street = getValue(row, ['Street address', 'street address', 'Street Address', 'streetAddress']);
      const line2 = getValue(row, ['Address Line 2', 'Addtess Line 2', 'address line 2', 'line2']);
      const city = getValue(row, ['City', 'city']);
      const state = getValue(row, ['State', 'state']);
      const zip = getValue(row, ['Zip', 'ZIP', 'zip', 'Postal Code', 'postalCode']);

      const composedAddressParts = [street, line2, city, `${state} ${zip}`.trim()].filter(Boolean);
      const address = composedAddressParts.length > 0 ? composedAddressParts.join(', ') : legacyAddress;
      const phone = getValue(row, ['Phone', 'phone', 'PHONE', 'Phone Number', 'phoneNumber']);

      validGuests.push({
        id: Date.now() + index, // Temporary ID, will be replaced when saving
        name: name.trim(),
        email,
        rsvp,
        guestCount,
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
      const response = await fetch(`${API_BASE_URL}/guests/bulk`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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

  const handleExportGuests = () => {
    if (guestList.length === 0) {
      return;
    }

    const rows = guestList.map((guest) => ({
      Name: guest.name || '',
      Address: guest.address || '',
      Phone: guest.phone || '',
      Email: guest.email || '',
      RSVP: guest.rsvp || 'Pending',
      'Guest Count': guest.guest_count ?? guest.guestCount ?? (guest.plusOne ? 2 : 1)
    }));

    const csvContent = Papa.unparse(rows);
    const blob = new window.Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);

    link.href = downloadUrl;
    link.download = `guest-list-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  };



  const handleEdit = (guest) => {
    setEditingGuest(guest);
  };

  const handleSaveEdit = async (updatedGuest) => {
    try {
      const response = await fetch(`${API_BASE_URL}/guests/${updatedGuest.id}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
      setError('Failed to update guest. Please try again.');
    }
  };

  const handleDelete = async (guestId) => {
    if (window.confirm('Are you sure you want to delete this guest?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/guests/${guestId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });

        if (!response.ok) {
          throw new Error('Failed to delete guest');
        }

        const updatedList = guestList.filter(guest => guest.id !== guestId);
        setGuestList(updatedList);
      } catch (error) {
        console.error('Delete error:', error);
        setError('Failed to delete guest. Please try again.');
      }
    }
  };

  const handleRSVPChange = async (guestId, rsvp) => {
    try {
      const guest = guestList.find(g => g.id === guestId);
      if (!guest) return;

      const response = await fetch(`${API_BASE_URL}/guests/${guestId}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
      setError('Failed to update RSVP. Please try again.');
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
              <span className="stat-number">{stats.total}</span>
            </div>
            <div className="stat-card">
              <h4>Attending</h4>
              <span className="stat-number">{stats.attending}</span>
            </div>
            <div className="stat-card">
              <h4>Pending</h4>
              <span className="stat-number">{stats.pending}</span>
            </div>
            <div className="stat-card">
              <h4>Not Attending</h4>
              <span className="stat-number">{stats.notAttending}</span>
            </div>
          </div>

          {/* CSV Upload Section */}
          <div className="csv-upload-section">
            <h3>Import Guests from CSV</h3>
            <div className="upload-controls">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                id="csv-file"
                className="file-input"
              />
              <div className="upload-mode upload-mode-import">
                <label htmlFor="csv-file" className="file-input-label">
                  Import CSV File
                </label>
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
                        <th>Address</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>RSVP</th>
                        <th>Guest Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedGuests.slice(0, 5).map((guest, index) => (
                        <tr key={index}>
                          <td>{guest.name}</td>
                          <td>{guest.address || '-'}</td>
                          <td>{guest.phone || '-'}</td>
                          <td>{guest.email || '-'}</td>
                          <td>{guest.rsvp}</td>
                          <td>{guest.guestCount ?? (guest.plusOne ? 2 : 1)}</td>
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
                <li><strong>Name</strong> (required) - Guest&apos;s full name</li>
                <li><strong>Address</strong> (optional) - Guest&apos;s mailing address</li>
                <li><strong>Phone</strong> (optional) - Guest&apos;s phone number</li>
                <li><strong>Email</strong> (optional) - Guest&apos;s email address</li>
                <li><strong>RSVP</strong> (optional) - &quot;Yes&quot;, &quot;No&quot;, or &quot;Pending&quot;</li>
                <li><strong>Guest Count</strong> (optional) - Total party size including the primary guest</li>
              </ul>
              <a href="/sample-guests.csv" download>Download Sample CSV</a>
            </div>
          </div>

          <div className="guest-list-toolbar">
            <div className="guest-list-toolbar-actions">
              <button
                type="button"
                className="export-btn"
                onClick={handleExportGuests}
                disabled={guestList.length === 0}
              >
                Export Guests CSV
              </button>
            </div>
          </div>

          <div className="guest-table-container">
            <table className="admin-table guest-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>RSVP</th>
                  <th>Guest Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {guestList.map(guest => (
                  <tr key={guest.id}>
                    <td>{guest.name}</td>
                    <td>{guest.address || '-'}</td>
                    <td>{guest.phone || '-'}</td>
                    <td>{guest.email || '-'}</td>
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
                    <td>{guest.guest_count ?? guest.guestCount ?? (guest.plusOne ? 2 : 1)}</td>
                    <td className="table-actions">
                      <button className="edit-btn" onClick={() => handleEdit(guest)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDelete(guest.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    guestCount: 1
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'guestCount' ? Number.parseInt(value, 10) || 0 : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedGuestCount = Number.isInteger(formData.guestCount) && formData.guestCount >= 0
      ? formData.guestCount
      : 1;
    onSave({
      ...formData,
      guestCount: normalizedGuestCount,
      plusOne: normalizedGuestCount > 1
    });
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
          <div className="form-group">
            <label htmlFor="guestCount">Guest Count (including this guest)</label>
            <input
              id="guestCount"
              name="guestCount"
              type="number"
              min="0"
              value={formData.guestCount}
              onChange={handleChange}
            />
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
  const [formData, setFormData] = useState({
    ...guest,
    guestCount: guest.guest_count ?? guest.guestCount ?? (guest.plusOne ? 2 : 1)
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'guestCount' ? Number.parseInt(value, 10) || 0 : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedGuestCount = Number.isInteger(formData.guestCount) && formData.guestCount >= 0
      ? formData.guestCount
      : 1;
    onSave({
      ...formData,
      guestCount: normalizedGuestCount,
      plusOne: normalizedGuestCount > 1
    });
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
          <div className="form-group">
            <label htmlFor="edit-guestCount">Guest Count (including this guest)</label>
            <input
              id="edit-guestCount"
              name="guestCount"
              type="number"
              min="0"
              value={formData.guestCount}
              onChange={handleChange}
            />
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

GuestManagementModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

AddGuestModal.propTypes = {
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

EditGuestModal.propTypes = {
  guest: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    address: PropTypes.string,
    rsvp: PropTypes.string,
    guest_count: PropTypes.number,
    guestCount: PropTypes.number,
    plusOne: PropTypes.bool,
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};