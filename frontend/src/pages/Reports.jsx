import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#1a1a2e','#c9a84c','#27ae60','#e74c3c','#3498db','#9b59b6'];

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

export default function Reports() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms]               = useState([]);
  const [invoices, setInvoices]         = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      const [resRes, roomRes] = await Promise.all([
        api.get('/reservations'),
        api.get('/rooms'),
      ]);
      setReservations(resRes.data.data);
      setRooms(roomRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Revenue by month (from reservations total_amount)
  const revenueByMonth = MONTHS.map((month, i) => {
    const monthRes = reservations.filter(r => {
      const d = new Date(r.check_in_date);
      return d.getMonth() === i &&
             d.getFullYear() === 2026 &&
             r.status === 'checked_out';
    });
    return {
      month,
      revenue: monthRes.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0),
      bookings: monthRes.length,
    };
  }).filter(m => m.revenue > 0 || m.bookings > 0);

  // Reservations by status
  const resByStatus = Object.entries(
    reservations.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  // Rooms by type
  const roomsByType = Object.entries(
    rooms.reduce((acc, r) => {
      acc[r.type_name] = (acc[r.type_name] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Occupancy rate per branch
  const branchOccupancy = Object.entries(
    rooms.reduce((acc, r) => {
      if (!acc[r.branch_name]) acc[r.branch_name] = { total: 0, occupied: 0 };
      acc[r.branch_name].total++;
      if (r.status === 'occupied') acc[r.branch_name].occupied++;
      return acc;
    }, {})
  ).map(([branch, data]) => ({
    branch: branch.replace('Grand Plaza ', ''),
    rate: data.total > 0
      ? Math.round((data.occupied / data.total) * 100)
      : 0,
    total: data.total,
    occupied: data.occupied,
  }));

  // Top room types by bookings
  const topRoomTypes = Object.entries(
    reservations.reduce((acc, r) => {
      acc[r.type_name] = (acc[r.type_name] || 0) + 1;
      return acc;
    }, {})
  )
  .sort((a, b) => b[1] - a[1])
  .map(([name, bookings]) => ({ name, bookings }));

  // Total revenue
  const totalRevenue = reservations
    .filter(r => r.status === 'checked_out')
    .reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);

  const totalBookings   = reservations.length;
  const avgRevenue      = totalBookings > 0
    ? (totalRevenue / reservations.filter(r => r.status === 'checked_out').length).toFixed(2)
    : 0;
  const occupancyRate   = rooms.length > 0
    ? Math.round((rooms.filter(r => r.status === 'occupied').length / rooms.length) * 100)
    : 0;

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const rows = [
      ['Month', 'Revenue', 'Bookings'],
      ...revenueByMonth.map(m => [m.month, m.revenue, m.bookings])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'grand_plaza_revenue_report.csv';
    a.click();
  };

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      Generating reports...
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Reports & Analytics</h1>
        <p>
          {user?.role === 'Admin'
            ? 'System-wide performance analytics'
            : 'Branch performance analytics'}
        </p>
      </div>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={handleExportCSV}>
          📊 Export CSV
        </button>
        <button
          className="btn"
          style={{ background: '#f0ebe0' }}
          onClick={handlePrint}
        >
          🖨️ Print Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value" style={{ fontSize: '1.6rem', color: '#27ae60' }}>
            ${totalRevenue.toFixed(0)}
          </div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{totalBookings}</div>
          <div className="stat-label">Total Bookings</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💵</div>
          <div className="stat-value" style={{ fontSize: '1.6rem' }}>
            ${avgRevenue}
          </div>
          <div className="stat-label">Avg Revenue / Stay</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏨</div>
          <div className="stat-value" style={{ color: occupancyRate > 70 ? '#e74c3c' : '#27ae60' }}>
            {occupancyRate}%
          </div>
          <div className="stat-label">Current Occupancy</div>
        </div>
      </div>

      {/* Revenue by Month */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: '1.1rem' }}>
          📈 Monthly Revenue & Bookings (2026)
        </h3>
        {revenueByMonth.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>
            No checkout data available yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) =>
                  name === 'revenue' ? [`$${value}`, 'Revenue'] : [value, 'Bookings']
                }
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="#c9a84c"
                radius={[4,4,0,0]}
                name="Revenue ($)"
              />
              <Bar
                yAxisId="right"
                dataKey="bookings"
                fill="#1a1a2e"
                radius={[4,4,0,0]}
                name="Bookings"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row of 3 charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 24, marginBottom: 24
      }}>
        {/* Reservations by Status */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>
            📊 Reservations by Status
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={resByStatus}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                outerRadius={75}
                label={({ value }) => value}
              >
                {resByStatus.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Rooms by Type */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>
            🛏️ Rooms by Type
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={roomsByType}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                outerRadius={75}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {roomsByType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Room Types by Bookings */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>
            🏆 Most Booked Room Types
          </h3>
          <div style={{ marginTop: 8 }}>
            {topRoomTypes.map((rt, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4, fontSize: '0.85rem'
                }}>
                  <span>{rt.name}</span>
                  <strong>{rt.bookings} bookings</strong>
                </div>
                <div style={{
                  height: 8, background: '#f0ebe0',
                  borderRadius: 4, overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(rt.bookings / topRoomTypes[0].bookings) * 100}%`,
                    background: COLORS[i % COLORS.length],
                    borderRadius: 4,
                    transition: 'width 1s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Branch Occupancy */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: '1.1rem' }}>
          🏢 Branch Occupancy Rate
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={branchOccupancy} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe0" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }}
              tickFormatter={v => `${v}%`} />
            <YAxis dataKey="branch" type="category" tick={{ fontSize: 12 }} width={70} />
            <Tooltip formatter={v => [`${v}%`, 'Occupancy Rate']} />
            <Bar dataKey="rate" radius={[0,4,4,0]} name="Occupancy %">
              {branchOccupancy.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.rate > 70 ? '#e74c3c' :
                        entry.rate > 40 ? '#c9a84c' : '#27ae60'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Table */}
      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>
          📋 Monthly Revenue Summary
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Bookings</th>
                <th>Revenue</th>
                <th>Avg per Booking</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {revenueByMonth.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <div className="icon">📊</div>
                    No data available yet
                  </div>
                </td></tr>
              ) : revenueByMonth.map((m, i) => {
                const avg = m.bookings > 0
                  ? (m.revenue / m.bookings).toFixed(2)
                  : 0;
                const maxRevenue = Math.max(...revenueByMonth.map(r => r.revenue));
                const pct = maxRevenue > 0
                  ? Math.round((m.revenue / maxRevenue) * 100)
                  : 0;
                return (
                  <tr key={i}>
                    <td><strong>{m.month} 2026</strong></td>
                    <td>{m.bookings}</td>
                    <td><strong style={{ color: '#27ae60' }}>${m.revenue.toFixed(2)}</strong></td>
                    <td>${avg}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          flex: 1, height: 8,
                          background: '#f0ebe0', borderRadius: 4
                        }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: '#c9a84c', borderRadius: 4
                          }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#999', width: 35 }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}