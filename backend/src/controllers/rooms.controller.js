const pool = require('../config/db');

const getAllRooms = async (req, res, next) => {
  try {
    const params = [];
    let whereClause = 'WHERE r.is_active = TRUE';

    if (req.user.role_id !== 1) {
      params.push(req.user.branch_id);
      whereClause += ` AND r.branch_id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT r.room_id, r.room_number, r.floor_number, r.status,
              r.last_maintenance_date,
              rt.type_name, rt.base_price, rt.max_occupancy, rt.amenities,
              b.branch_name, b.city
       FROM rooms r
       JOIN room_types rt ON r.room_type_id = rt.room_type_id
       JOIN branches   b  ON r.branch_id    = b.branch_id
       ${whereClause}
       ORDER BY b.branch_name, r.room_number`,
      params
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

const getRoomById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.room_id, r.room_number, r.floor_number, r.status,
              r.last_maintenance_date,
              rt.type_name, rt.base_price, rt.max_occupancy, rt.amenities,
              b.branch_name, b.city
       FROM rooms r
       JOIN room_types rt ON r.room_type_id = rt.room_type_id
       JOIN branches   b  ON r.branch_id    = b.branch_id
       WHERE r.room_id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

const getAvailableRooms = async (req, res, next) => {
  try {
    const { branch_id, check_in, check_out } = req.query;

    if (!branch_id || !check_in || !check_out) {
      return res.status(400).json({
        success: false,
        message: 'branch_id, check_in, and check_out are required.'
      });
    }

    const result = await pool.query(
      `SELECT r.room_id, r.room_number, r.floor_number,
              rt.type_name, rt.base_price, rt.max_occupancy, rt.amenities,
              b.branch_name, b.city
       FROM rooms r
       JOIN room_types rt ON r.room_type_id = rt.room_type_id
       JOIN branches   b  ON r.branch_id    = b.branch_id
       WHERE r.branch_id = $1
         AND r.status    = 'available'
         AND r.is_active = TRUE
         AND r.room_id NOT IN (
             SELECT room_id FROM reservations
             WHERE branch_id = $1
               AND status NOT IN ('cancelled','checked_out')
               AND (
                 ($2::date BETWEEN check_in_date AND check_out_date)
                 OR ($3::date BETWEEN check_in_date AND check_out_date)
                 OR (check_in_date BETWEEN $2::date AND $3::date)
               )
         )
       ORDER BY rt.base_price`,
      [branch_id, check_in, check_out]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

const updateRoomStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['available', 'occupied', 'maintenance', 'reserved'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await pool.query(
      `UPDATE rooms SET status = $1 WHERE room_id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Room status updated.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllRooms, getRoomById, getAvailableRooms, updateRoomStatus };