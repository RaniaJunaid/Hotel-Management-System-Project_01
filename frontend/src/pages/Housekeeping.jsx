import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const PRIORITY_MAP = {
  urgent: { color: '#e74c3c', bg: '#fde8e8', label: '🚨 Urgent' },
  high:   { color: '#e67e22', bg: '#fef0e7', label: '🔴 High' },
  medium: { color: '#c9a84c', bg: '#fff3cd', label: '🟡 Medium' },
  low:    { color: '#27ae60', bg: '#d4edda', label: '🟢 Low' },
};

const STATUS_MAP = {
  pending:     { color: '#3498db', bg: '#d1ecf1', label: 'Pending' },
  in_progress: { color: '#c9a84c', bg: '#fff3cd', label: 'In Progress' },
  completed:   { color: '#27ae60', bg: '#d4edda', label: 'Completed' },
  cancelled:   { color: '#999',    bg: '#e2e3e5', label: 'Cancelled' },
};

export default function Housekeeping() {
  const { user } = useAuth();
  const isHousekeeping = user?.role === 'Housekeeping';
  const isAdmin        = user?.role === 'Admin';
  const isManager      = user?.role === 'Manager';

  const [tasks, setTasks]         = useState([]);
  const [staff, setStaff]         = useState([]);
  const [rooms, setRooms]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [message, setMessage]     = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [filters, setFilters] = useState({
    status: '', priority: '', date: ''
  });

  const [form, setForm] = useState({
    room_id: '', assigned_to: '', task_type: 'cleaning',
    priority: 'medium', scheduled_date: '', notes: ''
  });

  useEffect(() => {
    fetchTasks();
    if (isAdmin || isManager) {
      fetchStaff();
      fetchRooms();
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status)   params.append('status',   filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.date)     params.append('date',     filters.date);

      const res = await api.get(`/housekeeping?${params.toString()}`);
      setTasks(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/housekeeping/staff');
      setStaff(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data.data);
    } catch (err) { console.error(err); }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await api.patch(`/housekeeping/${taskId}/status`, { status: newStatus });
      showMsg('success', `✅ Task marked as ${newStatus}`);
      fetchTasks();
    } catch (err) {
      showMsg('error', `❌ ${err.response?.data?.message}`);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!form.room_id)        errors.room_id        = 'Room is required';
    if (!form.task_type)      errors.task_type      = 'Task type is required';
    if (!form.scheduled_date) errors.scheduled_date = 'Date is required';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      await api.post('/housekeeping', {
        ...form,
        room_id:     parseInt(form.room_id),
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
      });
      showMsg('success', '✅ Task created successfully.');
      setShowModal(false);
      setForm({
        room_id: '', assigned_to: '', task_type: 'cleaning',
        priority: 'medium', scheduled_date: '', notes: ''
      });
      fetchTasks();
    } catch (err) {
      showMsg('error', `❌ ${err.response?.data?.message || 'Failed to create task.'}`);
    } finally {
      setSaving(false);
    }
  };

  // Summary counts
  const counts = {
    pending:     tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed:   tasks.filter(t => t.status === 'completed').length,
    urgent:      tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
  };

  if (loading) return (
    <div className="loading">
      <div className="spinner" />Loading tasks...
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Housekeeping</h1>
        <p>
          {isHousekeeping
            ? 'Your assigned cleaning and maintenance tasks'
            : 'Manage cleaning and maintenance tasks across rooms'}
        </p>
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ padding: 16 }}>
          <div className="stat-icon">📋</div>
          <div className="stat-value" style={{ color: '#3498db' }}>{counts.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card" style={{ padding: 16 }}>
          <div className="stat-icon">⚡</div>
          <div className="stat-value" style={{ color: '#c9a84c' }}>{counts.in_progress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card" style={{ padding: 16 }}>
          <div className="stat-icon">✅</div>
          <div className="stat-value" style={{ color: '#27ae60' }}>{counts.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        {counts.urgent > 0 && (
          <div className="stat-card" style={{ padding: 16 }}>
            <div className="stat-icon">🚨</div>
            <div className="stat-value" style={{ color: '#e74c3c' }}>{counts.urgent}</div>
            <div className="stat-label">Urgent Tasks</div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            className="form-control"
            style={{ width: 150 }}
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="form-control"
            style={{ width: 150 }}
            value={filters.priority}
            onChange={e => setFilters({ ...filters, priority: e.target.value })}
          >
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <input
            type="date"
            className="form-control"
            style={{ width: 160 }}
            value={filters.date}
            onChange={e => setFilters({ ...filters, date: e.target.value })}
          />

          {(filters.status || filters.priority || filters.date) && (
            <button
              className="btn btn-sm"
              style={{ background: '#f0ebe0' }}
              onClick={() => setFilters({ status: '', priority: '', date: '' })}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {(isAdmin || isManager) && (
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            + New Task
          </button>
        )}
      </div>

      {/* Tasks Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Branch</th>
              <th>Task Type</th>
              <th>Priority</th>
              <th>Assigned To</th>
              <th>Scheduled</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <div className="icon">🧹</div>
                  No tasks found
                </div>
              </td></tr>
            ) : tasks.map(task => {
              const priority = PRIORITY_MAP[task.priority];
              const status   = STATUS_MAP[task.status];
              return (
                <tr key={task.task_id} style={{
                  background: task.priority === 'urgent' && task.status !== 'completed'
                    ? '#fff8f8' : 'white'
                }}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <strong>Room {task.room_number}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#999' }}>
                      Floor {task.floor_number} — {task.type_name}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{task.branch_name}</td>
                  <td style={{ whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                    {task.task_type === 'deep_clean' ? '🧽 Deep Clean' :
                     task.task_type === 'cleaning'   ? '🧹 Cleaning' :
                     task.task_type === 'maintenance' ? '🔧 Maintenance' :
                     '🔍 Inspection'}
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: priority?.bg,
                      color: priority?.color,
                      fontSize: '0.78rem', fontWeight: 600
                    }}>
                      {priority?.label}
                    </span>
                  </td>
                  <td>
                    {task.assigned_to_name || (
                      <span style={{ color: '#ccc', fontSize: '0.85rem' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {task.scheduled_date}
                    {task.completed_date && (
                      <div style={{ fontSize: '0.75rem', color: '#27ae60' }}>
                        Done: {new Date(task.completed_date).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: status?.bg,
                      color: status?.color,
                      fontSize: '0.78rem', fontWeight: 600
                    }}>
                      {status?.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {task.status === 'pending' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleStatusUpdate(task.task_id, 'in_progress')}
                        >
                          ▶ Start
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleStatusUpdate(task.task_id, 'completed')}
                        >
                          ✅ Done
                        </button>
                      )}
                      {['pending', 'in_progress'].includes(task.status) &&
                       (isAdmin || isManager) && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleStatusUpdate(task.task_id, 'cancelled')}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREATE TASK MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Housekeeping Task</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Room *</label>
                  <select
                    className={`form-control ${formErrors.room_id ? 'error' : ''}`}
                    value={form.room_id}
                    onChange={e => setForm({ ...form, room_id: e.target.value })}
                  >
                    <option value="">Select room...</option>
                    {rooms.map(r => (
                      <option key={r.room_id} value={r.room_id}>
                        #{r.room_number} — {r.type_name} — {r.branch_name}
                      </option>
                    ))}
                  </select>
                  {formErrors.room_id && (
                    <p className="error-msg">{formErrors.room_id}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Assign To</label>
                  <select
                    className="form-control"
                    value={form.assigned_to}
                    onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {staff.map(s => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.full_name} ({s.active_tasks} active tasks)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Task Type *</label>
                  <select
                    className="form-control"
                    value={form.task_type}
                    onChange={e => setForm({ ...form, task_type: e.target.value })}
                  >
                    <option value="cleaning">🧹 Cleaning</option>
                    <option value="deep_clean">🧽 Deep Clean</option>
                    <option value="maintenance">🔧 Maintenance</option>
                    <option value="inspection">🔍 Inspection</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    className="form-control"
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                    <option value="urgent">🚨 Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Scheduled Date *</label>
                <input
                  type="date"
                  className={`form-control ${formErrors.scheduled_date ? 'error' : ''}`}
                  value={form.scheduled_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                />
                {formErrors.scheduled_date && (
                  <p className="error-msg">{formErrors.scheduled_date}</p>
                )}
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special instructions..."
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#f0ebe0' }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? '⏳ Creating...' : '✅ Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}