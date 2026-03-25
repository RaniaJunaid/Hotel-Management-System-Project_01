import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const ROLES_MAP = {
  1: { name: 'Admin',        color: '#e74c3c', bg: '#fde8e8' },
  2: { name: 'Manager',      color: '#c9a84c', bg: '#fff3cd' },
  3: { name: 'Receptionist', color: '#3498db', bg: '#d1ecf1' },
  4: { name: 'Housekeeping', color: '#27ae60', bg: '#d4edda' },
};

const BRANCHES = [
  { id: 1, name: 'Grand Plaza NYC' },
  { id: 2, name: 'Grand Plaza LA' },
  { id: 3, name: 'Grand Plaza Miami' },
  { id: 4, name: 'Grand Plaza Chicago' },
  { id: 5, name: 'Grand Plaza Seattle' },
];

export default function Users() {
  const { user: currentUser } = useAuth();
  const isAdmin   = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager';

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [message, setMessage]       = useState({ type: '', text: '' });
  const [showModal, setShowModal]   = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [roleFilter, setRoleFilter] = useState('');

  const [form, setForm] = useState({
    username:  '',
    email:     '',
    password:  '',
    full_name: '',
    phone:     '',
    role_id:   '',
    branch_id: ''
  });

  const [resetForm, setResetForm]   = useState({ new_password: '' });
  const [resetError, setResetError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // Roles that current user can create
  const getAllowedRoles = () => {
    if (isAdmin) {
      return [
        { id: 2, name: 'Manager' },
        { id: 3, name: 'Receptionist' },
        { id: 4, name: 'Housekeeping' },
      ];
    }
    if (isManager) {
      return [
        { id: 3, name: 'Receptionist' },
        { id: 4, name: 'Housekeeping' },
      ];
    }
    return [];
  };

  const validateForm = () => {
    const errors = {};
    if (!form.username.trim())  errors.username  = 'Username is required';
    if (!form.email.trim())     errors.email     = 'Email is required';
    if (!form.password.trim())  errors.password  = 'Password is required';
    if (form.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!form.full_name.trim()) errors.full_name = 'Full name is required';
    if (!form.role_id)          errors.role_id   = 'Role is required';
    if (!form.branch_id)        errors.branch_id = 'Branch is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Invalid email format';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      await api.post('/users', {
        ...form,
        role_id:   parseInt(form.role_id),
        branch_id: parseInt(form.branch_id),
      });
      showMsg('success', `✅ User "${form.full_name}" created successfully.`);
      setShowModal(false);
      setForm({
        username:'', email:'', password:'',
        full_name:'', phone:'', role_id:'', branch_id:''
      });
      setFormErrors({});
      fetchUsers();
    } catch (err) {
      showMsg('error', `❌ ${err.response?.data?.message || 'Failed to create user.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (u) => {
    if (!window.confirm(
      `Are you sure you want to ${u.is_active ? 'deactivate' : 'activate'} ${u.full_name}?`
    )) return;

    try {
      const res = await api.patch(`/users/${u.user_id}/toggle-status`);
      showMsg('success', res.data.message);
      fetchUsers();
    } catch (err) {
      showMsg('error', `❌ ${err.response?.data?.message}`);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetForm.new_password.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }
    try {
      await api.patch(`/users/${selectedUser.user_id}/reset-password`, resetForm);
      showMsg('success', `✅ Password reset for ${selectedUser.full_name}`);
      setShowResetModal(false);
      setResetForm({ new_password: '' });
      setResetError('');
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password.');
    }
  };

  const openResetModal = (u) => {
    setSelectedUser(u);
    setResetForm({ new_password: '' });
    setResetError('');
    setShowResetModal(true);
  };

  const filteredUsers = roleFilter
    ? users.filter(u => u.role_id === parseInt(roleFilter))
    : users;

  if (loading) return (
    <div className="loading">
      <div className="spinner" />Loading users...
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>User Management</h1>
        <p>
          {isAdmin
            ? 'Manage all staff accounts across all branches'
            : 'Manage staff accounts for your branch'}
        </p>
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      {/* Role Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {Object.entries(ROLES_MAP).map(([roleId, role]) => {
          const count = users.filter(u => u.role_id === parseInt(roleId)).length;
          if (!isAdmin && parseInt(roleId) === 1) return null;
          return (
            <div key={roleId} className="stat-card" style={{ padding: 16 }}>
              <div style={{
                display: 'inline-block',
                padding: '3px 10px', borderRadius: 20,
                background: role.bg, color: role.color,
                fontSize: '0.75rem', fontWeight: 600,
                marginBottom: 8
              }}>
                {role.name}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1a1a2e' }}>
                {count}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#999' }}>staff members</div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <select
          className="form-control"
          style={{ width: 180 }}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {isAdmin && <option value="2">Manager</option>}
          <option value="3">Receptionist</option>
          <option value="4">Housekeeping</option>
        </select>

        <button
          className="btn btn-primary"
          onClick={() => {
            setForm({
              username:'', email:'', password:'',
              full_name:'', phone:'',
              role_id: isManager ? '3' : '',
              branch_id: isManager ? String(currentUser.branch_id) : ''
            });
            setFormErrors({});
            setShowModal(true);
          }}
        >
          + Add Staff Member
        </button>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Last Login</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <div className="icon">👥</div>
                  No users found
                </div>
              </td></tr>
            ) : filteredUsers.map(u => {
              const roleInfo = ROLES_MAP[u.role_id];
              const isCurrentUser = u.user_id === currentUser?.user_id;
              const canManage = isAdmin ||
                (isManager && [3, 4].includes(u.role_id));

              return (
                <tr key={u.user_id} style={{
                  opacity: u.is_active ? 1 : 0.5
                }}>
                  <td>
                    <strong>{u.full_name}</strong>
                    {isCurrentUser && (
                      <span style={{
                        marginLeft: 6, fontSize: '0.72rem',
                        background: '#e8f4fd', color: '#3498db',
                        padding: '2px 8px', borderRadius: 10
                      }}>
                        You
                      </span>
                    )}
                  </td>
                  <td style={{ color: '#666' }}>@{u.username}</td>
                  <td style={{ color: '#666' }}>{u.email}</td>
                  <td>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: roleInfo?.bg,
                      color: roleInfo?.color,
                      fontSize: '0.78rem', fontWeight: 600
                    }}>
                      {roleInfo?.name}
                    </span>
                  </td>
                  <td>{u.branch_name || '—'}</td>
                  <td style={{ fontSize: '0.82rem', color: '#999' }}>
                    {u.last_login
                      ? new Date(u.last_login).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-secondary'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {canManage && !isCurrentUser ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openResetModal(u)}
                          title="Reset password"
                        >
                          🔑 Reset
                        </button>
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleToggleStatus(u)}
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {u.is_active ? '🚫 Deactivate' : '✅ Activate'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#ccc', fontSize: '0.8rem' }}>
                        {isCurrentUser ? 'Your account' : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREATE USER MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Staff Member</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Permissions notice */}
            <div style={{
              background: '#f8f6f0', borderRadius: 10,
              padding: 12, marginBottom: 20, fontSize: '0.82rem', color: '#666'
            }}>
              {isAdmin
                ? '👑 Admin: You can create Manager, Receptionist and Housekeeping accounts for any branch.'
                : '🏢 Manager: You can create Receptionist and Housekeeping accounts for your branch only.'}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    className={`form-control ${formErrors.full_name ? 'error' : ''}`}
                    value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    placeholder="John Smith"
                  />
                  {formErrors.full_name && (
                    <p className="error-msg">{formErrors.full_name}</p>
                  )}
                </div>
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    className={`form-control ${formErrors.username ? 'error' : ''}`}
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    placeholder="john_smith"
                  />
                  {formErrors.username && (
                    <p className="error-msg">{formErrors.username}</p>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    className={`form-control ${formErrors.email ? 'error' : ''}`}
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="john@grandplaza.com"
                  />
                  {formErrors.email && (
                    <p className="error-msg">{formErrors.email}</p>
                  )}
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1-555-0000"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  className={`form-control ${formErrors.password ? 'error' : ''}`}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
                {formErrors.password && (
                  <p className="error-msg">{formErrors.password}</p>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    className={`form-control ${formErrors.role_id ? 'error' : ''}`}
                    value={form.role_id}
                    onChange={e => setForm({ ...form, role_id: e.target.value })}
                    disabled={isManager}
                  >
                    <option value="">Select role...</option>
                    {getAllowedRoles().map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  {formErrors.role_id && (
                    <p className="error-msg">{formErrors.role_id}</p>
                  )}
                  {isManager && (
                    <p style={{ fontSize: '0.75rem', color: '#999', marginTop: 4 }}>
                      Managers can only assign Receptionist or Housekeeping roles
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label>Branch *</label>
                  <select
                    className={`form-control ${formErrors.branch_id ? 'error' : ''}`}
                    value={form.branch_id}
                    onChange={e => setForm({ ...form, branch_id: e.target.value })}
                    disabled={isManager}
                  >
                    <option value="">Select branch...</option>
                    {BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {formErrors.branch_id && (
                    <p className="error-msg">{formErrors.branch_id}</p>
                  )}
                  {isManager && (
                    <p style={{ fontSize: '0.75rem', color: '#999', marginTop: 4 }}>
                      Managers can only add staff to their own branch
                    </p>
                  )}
                </div>
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
                  {saving ? '⏳ Creating...' : '✅ Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Reset Password</h2>
              <button className="modal-close" onClick={() => setShowResetModal(false)}>✕</button>
            </div>

            <p style={{ color: '#666', marginBottom: 20, fontSize: '0.9rem' }}>
              Resetting password for <strong>{selectedUser.full_name}</strong>
              <span style={{
                marginLeft: 8,
                padding: '2px 8px', borderRadius: 10,
                background: ROLES_MAP[selectedUser.role_id]?.bg,
                color: ROLES_MAP[selectedUser.role_id]?.color,
                fontSize: '0.78rem'
              }}>
                {ROLES_MAP[selectedUser.role_id]?.name}
              </span>
            </p>

            {resetError && (
              <div className="alert alert-error">{resetError}</div>
            )}

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>New Password *</label>
                <input
                  type="password"
                  className="form-control"
                  value={resetForm.new_password}
                  onChange={e => setResetForm({ new_password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#f0ebe0' }}
                  onClick={() => setShowResetModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  🔑 Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}