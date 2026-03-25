import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#1a1a2e', '#c9a84c', '#27ae60', '#e74c3c', '#3498db'];

const ALL_BRANCHES = [
  { id: 1, name: 'NYC',     full: 'Grand Plaza NYC' },
  { id: 2, name: 'LA',      full: 'Grand Plaza LA' },
  { id: 3, name: 'Miami',   full: 'Grand Plaza Miami' },
  { id: 4, name: 'Chicago', full: 'Grand Plaza Chicago' },
  { id: 5, name: 'Seattle', full: 'Grand Plaza Seattle' },
];

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const isAdmin      = user?.role === 'Admin';
  const isManager    = user?.role === 'Manager';
  const isReception  = user?.role === 'Receptionist';
  const isHousekeeping = user?.role === 'Housekeeping';

  const [rooms, setRooms]               = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const promises = [api.get('/rooms')];

      // Receptionists and Housekeeping can also see reservations
      if (!isHousekeeping) {
        promises.push(api.get('/reservations'));
      }

      const results = await Promise.all(promises);
      setRooms(results[0].data.data);
      if (!isHousekeeping && results[1]) {
        setReservations(results[1].data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter branches based on role
  const visibleBranches = isAdmin
    ? ALL_BRANCHES
    : ALL_BRANCHES.filter(b => b.id === user?.branch_id);

  // Overall stats — admin sees all, others see their branch only
  const myRooms = isAdmin
    ? rooms
    : rooms.filter(r => r.branch_name === visibleBranches[0]?.full);

  const myReservations = isAdmin
    ? reservations
    : reservations.filter(r => r.branch_name === visibleBranches[0]?.full);

  const totalRooms     = myRooms.length;
  const availableRooms = myRooms.filter(r => r.status === 'available').length;
  const occupiedRooms  = myRooms.filter(r => r.status === 'occupied').length;
  const maintenanceRooms = myRooms.filter(r => r.status === 'maintenance').length;
  const checkedIn      = myReservations.filter(r => r.status === 'checked_in').length;
  const confirmed      = myReservations.filter(r => r.status === 'confirmed').length;

  // Per branch stats
  const branchStats = visibleBranches.map(branch => {
    const branchRooms = rooms.filter(r => r.branch_name === branch.full);
    const branchRes   = reservations.filter(r => r.branch_name === branch.full);

    const available    = branchRooms.filter(r => r.status === 'available').length;
    const occupied     = branchRooms.filter(r => r.status === 'occupied').length;
    const maintenance  = branchRooms.filter(r => r.status === 'maintenance').length;
    const total        = branchRooms.length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const activeGuests  = branchRes.filter(r => r.status === 'checked_in').length;
    const arriving      = branchRes.filter(r => r.status === 'confirmed').length;

    return {
      ...branch,
      total, available, occupied,
      maintenance, occupancyRate,
      activeGuests, arriving,
    };
  });

  // Chart data
  const roomStatusData = [
    { name: 'Available',   value: availableRooms },
    { name: 'Occupied',    value: occupiedRooms },
    { name: 'Maintenance', value: maintenanceRooms },
  ].filter(d => d.value > 0);

  const branchChartData = branchStats.map(b => ({
    name:        b.name,
    Occupied:    b.occupied,
    Available:   b.available,
    Maintenance: b.maintenance,
  }));

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      Loading dashboard...
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1>Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p>
          {isAdmin
            ? 'Grand Plaza Hotels — All Branches Overview'
            : isManager
            ? `${visibleBranches[0]?.full} — Branch Overview`
            : isReception
            ? `${visibleBranches[0]?.full} — Front Desk`
            : `${visibleBranches[0]?.full} — Housekeeping`}
        </p>
      </div>

      {/* Role badge */}
      <div style={{ marginBottom: 24 }}>
        <span style={{
          padding: '6px 16px',
          borderRadius: 20,
          background: isAdmin ? '#fde8e8' :
                      isManager ? '#fff3cd' :
                      isReception ? '#d1ecf1' : '#d4edda',
          color: isAdmin ? '#e74c3c' :
                 isManager ? '#c9a84c' :
                 isReception ? '#3498db' : '#27ae60',
          fontSize: '0.82rem',
          fontWeight: 600
        }}>
          {isAdmin      ? '👑 System Administrator — Full Access' :
           isManager    ? '🏢 Branch Manager — Branch Access Only' :
           isReception  ? '🖥️ Receptionist — Front Desk Access' :
                          '🧹 Housekeeping — Room Access Only'}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-icon">🛏️</div>
          <div className="stat-value">{totalRooms}</div>
          <div className="stat-label">
            {isAdmin ? 'Total Rooms (All Branches)' : 'Total Rooms'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value" style={{ color: '#27ae60' }}>
            {availableRooms}
          </div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔑</div>
          <div className="stat-value" style={{ color: '#e74c3c' }}>
            {occupiedRooms}
          </div>
          <div className="stat-label">Occupied</div>
        </div>
        {maintenanceRooms > 0 && (
          <div className="stat-card">
            <div className="stat-icon">🔧</div>
            <div className="stat-value" style={{ color: '#f39c12' }}>
              {maintenanceRooms}
            </div>
            <div className="stat-label">Maintenance</div>
          </div>
        )}

        {/* Only show reservation stats if not housekeeping */}
        {!isHousekeeping && (
          <>
            <div className="stat-card">
              <div className="stat-icon">🏨</div>
              <div className="stat-value" style={{ color: '#3498db' }}>
                {checkedIn}
              </div>
              <div className="stat-label">Guests In Hotel</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔔</div>
              <div className="stat-value" style={{ color: '#c9a84c' }}>
                {confirmed}
              </div>
              <div className="stat-label">Arriving Soon</div>
            </div>
          </>
        )}
      </div>
       
      {/* Branch Performance Cards */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <h3 style={{ fontSize: '1.2rem', color: '#1a1a2e' }}>
            {isAdmin ? '🌐 All Branch Performance' : '🏢 Your Branch Performance'}
          </h3>
          {!isAdmin && (
            <span style={{
              fontSize: '0.78rem', color: '#999',
              background: '#f8f6f0', padding: '4px 12px',
              borderRadius: 20
            }}>
              Showing your branch only
            </span>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isAdmin
            ? 'repeat(auto-fit, minmax(220px, 1fr))'
            : '1fr',
          gap: 16
        }}>
          {branchStats.map(branch => (
            <div
              key={branch.id}
              className="card"
              style={{
                padding: 20,
                position: 'relative',
                overflow: 'hidden',
                // Highlight current user branch
                border: branch.id === user?.branch_id
                  ? '2px solid #c9a84c'
                  : '1px solid #e5e0d5'
              }}
            >
              {/* Occupancy progress bar at top */}
              <div style={{
                position: 'absolute', top: 0, left: 0,
                width: `${branch.occupancyRate}%`,
                height: 4,
                background:
                  branch.occupancyRate > 80 ? '#e74c3c' :
                  branch.occupancyRate > 50 ? '#c9a84c' : '#27ae60',
                transition: 'width 1s ease'
              }} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16
              }}>
                <div>
                  <h4 style={{ fontSize: '1rem', color: '#1a1a2e' }}>
                    {isAdmin ? branch.name : branch.full}
                    {branch.id === user?.branch_id && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: '0.7rem',
                        background: '#fff3cd',
                        color: '#856404',
                        padding: '2px 8px',
                        borderRadius: 10
                      }}>
                        Your Branch
                      </span>
                    )}
                  </h4>
                  {isAdmin && (
                    <p style={{ fontSize: '0.75rem', color: '#999', marginTop: 2 }}>
                      {branch.full}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '1.4rem', fontWeight: 700,
                    color:
                      branch.occupancyRate > 80 ? '#e74c3c' :
                      branch.occupancyRate > 50 ? '#c9a84c' : '#27ae60'
                  }}>
                    {branch.occupancyRate}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#999' }}>
                    occupancy
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isAdmin ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: 8
              }}>
                <div style={{
                  textAlign: 'center',
                  background: '#f0fff4',
                  borderRadius: 8, padding: '10px 4px'
                }}>
                  <div style={{
                    fontSize: '1.4rem', fontWeight: 700, color: '#27ae60'
                  }}>
                    {branch.available}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>Available</div>
                </div>

                <div style={{
                  textAlign: 'center',
                  background: '#fff5f5',
                  borderRadius: 8, padding: '10px 4px'
                }}>
                  <div style={{
                    fontSize: '1.4rem', fontWeight: 700, color: '#e74c3c'
                  }}>
                    {branch.occupied}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>Occupied</div>
                </div>

                <div style={{
                  textAlign: 'center',
                  background: '#f0f8ff',
                  borderRadius: 8, padding: '10px 4px'
                }}>
                  <div style={{
                    fontSize: '1.4rem', fontWeight: 700, color: '#3498db'
                  }}>
                    {branch.activeGuests}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>In Hotel</div>
                </div>

                <div style={{
                  textAlign: 'center',
                  background: '#fffdf0',
                  borderRadius: 8, padding: '10px 4px'
                }}>
                  <div style={{
                    fontSize: '1.4rem', fontWeight: 700, color: '#c9a84c'
                  }}>
                    {branch.arriving}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>Arriving</div>
                </div>
              </div>

              {/* Maintenance warning */}
              {branch.maintenance > 0 && (
                <div style={{
                  marginTop: 10, padding: '5px 10px',
                  background: '#fff3cd', borderRadius: 6,
                  fontSize: '0.75rem', color: '#856404',
                  textAlign: 'center'
                }}>
                  ⚠️ {branch.maintenance} room{branch.maintenance > 1 ? 's' : ''} in maintenance
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Charts — Admin and Manager only */}
      {(isAdmin || isManager) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card">
            <h3 style={{ marginBottom: 20, fontSize: '1.1rem' }}>
              {isAdmin ? 'Overall Room Status' : 'Your Branch Room Status'}
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={roomStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={85}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {roomStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 20, fontSize: '1.1rem' }}>
              {isAdmin ? 'Rooms by Branch' : 'Room Breakdown'}
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={branchChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="Occupied"
                  fill="#e74c3c"
                  radius={[3, 3, 0, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="Available"
                  fill="#27ae60"
                  radius={[3, 3, 0, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="Maintenance"
                  fill="#f39c12"
                  radius={[3, 3, 0, 0]}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Housekeeping special view */}
      {isHousekeeping && (
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>
            🧹 Your Tasks Summary
          </h3>
          <p style={{ color: '#999', fontSize: '0.9rem' }}>
            You have access to room status only. Contact your manager for full details.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16, marginTop: 16
          }}>
            <div style={{
              textAlign: 'center', background: '#f0fff4',
              borderRadius: 10, padding: 16
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#27ae60' }}>
                {availableRooms}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                Rooms Available
              </div>
            </div>
            <div style={{
              textAlign: 'center', background: '#fff5f5',
              borderRadius: 10, padding: 16
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e74c3c' }}>
                {occupiedRooms}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                Rooms Occupied
              </div>
            </div>
            <div style={{
              textAlign: 'center', background: '#fff3cd',
              borderRadius: 10, padding: 16
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f39c12' }}>
                {maintenanceRooms}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                In Maintenance
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}