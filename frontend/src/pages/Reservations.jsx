import { useState, useEffect } from 'react';
import api from '../api/axios';

const statusBadge = (status) => {
  const map = {
    confirmed:   'badge-info',
    checked_in:  'badge-success',
    checked_out: 'badge-secondary',
    cancelled:   'badge-danger',
    pending:     'badge-warning',
  };
  return (
    <span className={`badge ${map[status] || 'badge-secondary'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function Reservations() {
  const [reservations, setReservations]     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [statusFilter, setStatusFilter]     = useState('');
  const [actionLoading, setActionLoading]   = useState(null);
  const [message, setMessage]               = useState({ type: '', text: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guests, setGuests]                 = useState([]);
  const [rooms, setRooms]                   = useState([]);
  const [saving, setSaving]                 = useState(false);
  const [formErrors, setFormErrors]         = useState({});

  const [form, setForm] = useState({
    guest_id:        '',
    branch_id:       '1',
    room_id:         '',
    check_in_date:   '',
    check_out_date:  '',
    num_adults:      '1',
    num_children:    '0',
    special_requests: ''
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchReservations();
    fetchGuests();
    fetchRooms();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchReservations();
  }, [statusFilter]);

  const fetchReservations = async () => {
    try {
      const url = statusFilter
        ? `/reservations?status=${statusFilter}`
        : '/reservations';
      const res = await api.get(url);
      setReservations(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuests = async () => {
    try {
      const res = await api.get('/guests');
      setGuests(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data.data.filter(r => r.status === 'available'));
    } catch (err) {
      console.error(err);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // TRANSACTION — Checkin
  const handleCheckin = async (id) => {
    setActionLoading(id + '_checkin');
    try {
      await api.patch(`/reservations/${id}/checkin`);
      showMessage('success',
        '✅ Transaction SUCCESS: Guest checked in. Room marked occupied. (BEGIN → COMMIT)'
      );
      fetchReservations();
    } catch (err) {
      showMessage('error',
        `❌ Transaction FAILED: ${err.response?.data?.message} (BEGIN → ROLLBACK)`
      );
    } finally {
      setActionLoading(null);
    }
  };

  // TRANSACTION — Checkout
  const handleCheckout = async (id) => {
    setActionLoading(id + '_checkout');
    try {
      await api.patch(`/reservations/${id}/checkout`);
      showMessage('success',
        '✅ Transaction SUCCESS: Guest checked out. Room now available. (BEGIN → COMMIT)'
      );
      fetchReservations();
    } catch (err) {
      showMessage('error',
        `❌ Transaction FAILED: ${err.response?.data?.message} (BEGIN → ROLLBACK)`
      );
    } finally {
      setActionLoading(null);
    }
  };

  // TRANSACTION — Cancel
  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    setActionLoading(id + '_cancel');
    try {
      await api.patch(`/reservations/${id}/cancel`, {
        reason: 'Cancelled by staff'
      });
      showMessage('success', '✅ Reservation cancelled and invoice refunded.');
      fetchReservations();
    } catch (err) {
      showMessage('error', `❌ ${err.response?.data?.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!form.guest_id)
      errors.guest_id = 'Guest is required';
    if (!form.room_id)
      errors.room_id = 'Room is required';
    if (!form.check_in_date)
      errors.check_in_date = 'Check-in date is required';
    if (!form.check_out_date)
      errors.check_out_date = 'Check-out date is required';
    if (
      form.check_in_date && form.check_out_date &&
      new Date(form.check_out_date) <= new Date(form.check_in_date)
    ) {
      errors.check_out_date = 'Check-out must be after check-in';
    }
    if (!form.num_adults || parseInt(form.num_adults) < 1)
      errors.num_adults = 'At least 1 adult required';
    return errors;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      await api.post('/reservations', {
        guest_id:        parseInt(form.guest_id),
        branch_id:       parseInt(form.branch_id),
        room_id:         parseInt(form.room_id),
        check_in_date:   form.check_in_date,
        check_out_date:  form.check_out_date,
        num_adults:      parseInt(form.num_adults),
        num_children:    parseInt(form.num_children),
        special_requests: form.special_requests,
      });
      showMessage('success',
        '✅ Transaction SUCCESS: Reservation + Invoice created atomically! (BEGIN → COMMIT)'
      );
      setShowCreateModal(false);
      setForm({
        guest_id: '', branch_id: '1', room_id: '',
        check_in_date: '', check_out_date: '',
        num_adults: '1', num_children: '0', special_requests: ''
      });
      setFormErrors({});
      fetchReservations();
      fetchRooms();
    } catch (err) {
      showMessage('error',
        `❌ Transaction ROLLED BACK: ${err.response?.data?.message}`
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      Loading reservations...
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Reservations</h1>
        <p>Manage bookings — checkin, checkout and cancellations</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <select
          className="form-control"
          style={{ width: 200 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Reservations</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + New Reservation
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Branch</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <div className="icon">📅</div>
                    No reservations found
                  </div>
                </td>
              </tr>
            ) : reservations.map(r => (
              <tr key={r.reservation_id}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <strong>#{r.reservation_id}</strong>
                </td>

                <td>
                  <strong>{r.first_name} {r.last_name}</strong>
                  <div style={{ fontSize: '0.78rem', color: '#999' }}>
                    {r.email}
                  </div>
                </td>

                <td style={{ whiteSpace: 'nowrap' }}>
                  {r.room_number} — {r.type_name}
                </td>

                <td style={{ whiteSpace: 'nowrap' }}>
                  {r.branch_name}
                </td>

                <td style={{ whiteSpace: 'nowrap' }}>
                  {r.check_in_date?.split('T')[0]}
                </td>

                <td style={{ whiteSpace: 'nowrap' }}>
                  {r.check_out_date?.split('T')[0]}
                </td>

                <td style={{ whiteSpace: 'nowrap' }}>
                  <strong>${r.total_amount}</strong>
                </td>

                <td style={{ whiteSpace: 'nowrap' }}>
                  {statusBadge(r.status)}
                </td>

                {/* ACTION BUTTONS */}
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>

                    {/* Check In — only for confirmed */}
                    {r.status === 'confirmed' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleCheckin(r.reservation_id)}
                        disabled={actionLoading === r.reservation_id + '_checkin'}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {actionLoading === r.reservation_id + '_checkin'
                          ? '⏳' : '🔑 Check In'}
                      </button>
                    )}

                    {/* Check Out — only for checked_in */}
                    {r.status === 'checked_in' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleCheckout(r.reservation_id)}
                        disabled={actionLoading === r.reservation_id + '_checkout'}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {actionLoading === r.reservation_id + '_checkout'
                          ? '⏳' : '🏁 Check Out'}
                      </button>
                    )}

                    {/* Cancel — for pending, confirmed, checked_in only */}
                    {['confirmed', 'pending', 'checked_in'].includes(r.status) && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancel(r.reservation_id)}
                        disabled={actionLoading === r.reservation_id + '_cancel'}
                        title="Cancel reservation"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {actionLoading === r.reservation_id + '_cancel'
                          ? '⏳' : '✕ Cancel'}
                      </button>
                    )}

                    {/* No actions for checked_out or cancelled */}
                    {['checked_out', 'cancelled'].includes(r.status) && (
                      <span style={{ color: '#ccc', fontSize: '0.8rem' }}>—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE RESERVATION MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Reservation</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: 20 }}>
              ⚡ Creates reservation + invoice atomically (BEGIN / COMMIT / ROLLBACK)
            </p>

            <form onSubmit={handleCreate}>

              {/* Guest */}
              <div className="form-group">
                <label>Guest *</label>
                <select
                  className={`form-control ${formErrors.guest_id ? 'error' : ''}`}
                  value={form.guest_id}
                  onChange={e => setForm({ ...form, guest_id: e.target.value })}
                >
                  <option value="">Select guest...</option>
                  {guests.map(g => (
                    <option key={g.guest_id} value={g.guest_id}>
                      {g.first_name} {g.last_name} — {g.email}
                    </option>
                  ))}
                </select>
                {formErrors.guest_id && (
                  <p className="error-msg">{formErrors.guest_id}</p>
                )}
              </div>

              {/* Room */}
              <div className="form-group">
                <label>Room *</label>
                <select
                  className={`form-control ${formErrors.room_id ? 'error' : ''}`}
                  value={form.room_id}
                  onChange={e => {
                    const selectedRoom = rooms.find(
                      r => r.room_id === parseInt(e.target.value)
                    );
                    setForm({
                      ...form,
                      room_id:   e.target.value,
                      branch_id: selectedRoom ? String(selectedRoom.branch_id || '1') : '1'
                    });
                  }}
                >
                  <option value="">Select available room...</option>
                  {rooms.map(r => (
                    <option key={r.room_id} value={r.room_id}>
                      #{r.room_number} — {r.type_name} — ${r.base_price}/night — {r.branch_name}
                    </option>
                  ))}
                </select>
                {formErrors.room_id && (
                  <p className="error-msg">{formErrors.room_id}</p>
                )}
              </div>

              {/* Dates */}
              <div className="form-row">
                <div className="form-group">
                  <label>Check-in Date *</label>
                  <input
                    type="date"
                    className={`form-control ${formErrors.check_in_date ? 'error' : ''}`}
                    value={form.check_in_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm({ ...form, check_in_date: e.target.value })}
                  />
                  {formErrors.check_in_date && (
                    <p className="error-msg">{formErrors.check_in_date}</p>
                  )}
                </div>
                <div className="form-group">
                  <label>Check-out Date *</label>
                  <input
                    type="date"
                    className={`form-control ${formErrors.check_out_date ? 'error' : ''}`}
                    value={form.check_out_date}
                    min={form.check_in_date || new Date().toISOString().split('T')[0]}
                    onChange={e => setForm({ ...form, check_out_date: e.target.value })}
                  />
                  {formErrors.check_out_date && (
                    <p className="error-msg">{formErrors.check_out_date}</p>
                  )}
                </div>
              </div>

              {/* Guests count */}
              <div className="form-row">
                <div className="form-group">
                  <label>Adults *</label>
                  <input
                    type="number"
                    min="1" max="6"
                    className={`form-control ${formErrors.num_adults ? 'error' : ''}`}
                    value={form.num_adults}
                    onChange={e => setForm({ ...form, num_adults: e.target.value })}
                  />
                  {formErrors.num_adults && (
                    <p className="error-msg">{formErrors.num_adults}</p>
                  )}
                </div>
                <div className="form-group">
                  <label>Children</label>
                  <input
                    type="number"
                    min="0" max="4"
                    className="form-control"
                    value={form.num_children}
                    onChange={e => setForm({ ...form, num_children: e.target.value })}
                  />
                </div>
              </div>

              {/* Special requests */}
              <div className="form-group">
                <label>Special Requests</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.special_requests}
                  onChange={e => setForm({ ...form, special_requests: e.target.value })}
                  placeholder="Any special requirements..."
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#f0ebe0' }}
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormErrors({});
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? '⏳ Creating...' : '⚡ Create Reservation'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}