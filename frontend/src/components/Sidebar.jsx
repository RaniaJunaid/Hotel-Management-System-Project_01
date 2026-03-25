import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout, hasRole } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
  { path: '/dashboard',    label: 'Dashboard',    icon: '📊', roles: ['Admin','Manager','Receptionist','Housekeeping'] },
  { path: '/rooms',        label: 'Rooms',        icon: '🛏️', roles: ['Admin','Manager','Receptionist'] },
  { path: '/guests',       label: 'Guests',       icon: '👥', roles: ['Admin','Manager','Receptionist'] },
  { path: '/reservations', label: 'Reservations', icon: '📅', roles: ['Admin','Manager','Receptionist'] },
  { path: '/invoices',     label: 'Invoices',     icon: '💳', roles: ['Admin','Manager'] },
  { path: '/housekeeping', label: 'Housekeeping', icon: '🧹', roles: ['Admin','Manager','Housekeeping'] },
  { path: '/reports',      label: 'Reports',      icon: '📈', roles: ['Admin','Manager'] },
  { path: '/users',        label: 'Staff',        icon: '👤', roles: ['Admin','Manager'] },
];

  const visibleItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>Grand Plaza</h2>
        <p>Management System</p>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Navigation</div>
        {visibleItems.map(item => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="user-info">
          <div className="name">{user?.full_name}</div>
          <div className="role">{user?.role}</div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}