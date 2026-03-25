import { useState, useEffect } from 'react';
import api from '../api/axios';

const statusBadge = (status) => {
  const map = {
    available:   'badge-success',
    occupied:    'badge-danger',
    maintenance: 'badge-warning',
    reserved:    'badge-info',
  };
  return <span className={`badge ${map[status] || 'badge-secondary'}`}>{status}</span>;
};

export default function Rooms() {
  const [rooms, setRooms]     = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchRooms(); }, []);

  useEffect(() => {
    let result = rooms;
    if (search) result = result.filter(r =>
      r.room_number.toLowerCase().includes(search.toLowerCase()) ||
      r.type_name.toLowerCase().includes(search.toLowerCase()) ||
      r.branch_name.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter) result = result.filter(r => r.status === statusFilter);
    setFiltered(result);
  }, [search, statusFilter, rooms]);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data.data);
      setFiltered(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading rooms...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Rooms</h1>
        <p>Manage all hotel rooms across branches</p>
      </div>

      <div className="search-bar">
        <input
          className="search-input"
          placeholder="🔍 Search by room number, type, or branch..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="form-control"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
          <option value="reserved">Reserved</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Type</th>
              <th>Floor</th>
              <th>Branch</th>
              <th>Price/Night</th>
              <th>Max Guests</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <div className="icon">🛏️</div>
                  No rooms found
                </div>
              </td></tr>
            ) : filtered.map(room => (
              <tr key={room.room_id}>
                <td><strong>#{room.room_number}</strong></td>
                <td>{room.type_name}</td>
                <td>Floor {room.floor_number}</td>
                <td>{room.branch_name}</td>
                <td>${room.base_price}</td>
                <td>{room.max_occupancy} guests</td>
                <td>{statusBadge(room.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}