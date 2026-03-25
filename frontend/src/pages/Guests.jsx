import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Guests() {
  const [guests, setGuests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', nationality: '', id_type: '', id_number: ''
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => { fetchGuests(); }, []);

  const fetchGuests = async () => {
    try {
      const res = await api.get(`/guests${search ? `?search=${search}` : ''}`);
      setGuests(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchGuests();
  };

  const validate = () => {
    const errors = {};
    if (!form.first_name.trim()) errors.first_name = 'First name is required';
    if (!form.last_name.trim())  errors.last_name  = 'Last name is required';
    if (!form.phone.trim())      errors.phone      = 'Phone is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Invalid email';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSaving(true);
    setError('');
    try {
      await api.post('/guests', form);
      setSuccess('Guest created successfully!');
      setShowModal(false);
      setForm({ first_name:'',last_name:'',email:'',phone:'',nationality:'',id_type:'',id_number:'' });
      fetchGuests();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create guest.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading guests...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Guests</h1>
        <p>Manage guest profiles and history</p>
      </div>

      {success && <div className="alert alert-success">✅ {success}</div>}
      {error   && <div className="alert alert-error">⚠️ {error}</div>}

      <div className="toolbar">
        <form className="search-bar" style={{ margin: 0, flex: 1 }} onSubmit={handleSearch}>
          <input
            className="search-input"
            placeholder="🔍 Search by name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">Search</button>
        </form>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Guest
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Nationality</th>
              <th>Loyalty Points</th>
              <th>Total Stays</th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="icon">👥</div>No guests found
                </div>
              </td></tr>
            ) : guests.map(g => (
              <tr key={g.guest_id}>
                <td><strong>{g.first_name} {g.last_name}</strong></td>
                <td>{g.email || '—'}</td>
                <td>{g.phone}</td>
                <td>{g.nationality || '—'}</td>
                <td>
                  <span className="badge badge-info">⭐ {g.loyalty_points}</span>
                </td>
                <td>{g.total_stays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Guest</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    className={`form-control ${formErrors.first_name ? 'error' : ''}`}
                    value={form.first_name}
                    onChange={e => setForm({...form, first_name: e.target.value})}
                    placeholder="John"
                  />
                  {formErrors.first_name && <p className="error-msg">{formErrors.first_name}</p>}
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    className={`form-control ${formErrors.last_name ? 'error' : ''}`}
                    value={form.last_name}
                    onChange={e => setForm({...form, last_name: e.target.value})}
                    placeholder="Doe"
                  />
                  {formErrors.last_name && <p className="error-msg">{formErrors.last_name}</p>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    className={`form-control ${formErrors.email ? 'error' : ''}`}
                    type="email"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="john@email.com"
                  />
                  {formErrors.email && <p className="error-msg">{formErrors.email}</p>}
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    className={`form-control ${formErrors.phone ? 'error' : ''}`}
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    placeholder="+1-555-0000"
                  />
                  {formErrors.phone && <p className="error-msg">{formErrors.phone}</p>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Nationality</label>
                  <input
                    className="form-control"
                    value={form.nationality}
                    onChange={e => setForm({...form, nationality: e.target.value})}
                    placeholder="American"
                  />
                </div>
                <div className="form-group">
                  <label>ID Type</label>
                  <select
                    className="form-control"
                    value={form.id_type}
                    onChange={e => setForm({...form, id_type: e.target.value})}
                  >
                    <option value="">Select...</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver License">Driver License</option>
                    <option value="National ID">National ID</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>ID Number</label>
                <input
                  className="form-control"
                  value={form.id_number}
                  onChange={e => setForm({...form, id_number: e.target.value})}
                  placeholder="AB1234567"
                />
              </div>

              <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}
                  style={{ background:'#f0ebe0' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Create Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}