const pool = require('../config/db');

const getAllGuests = async (req, res, next) => {
  try {
    const { search } = req.query;
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (
        first_name ILIKE $1 OR
        last_name  ILIKE $1 OR
        email      ILIKE $1 OR
        phone      ILIKE $1
      )`;
    }

    const result = await pool.query(
      `SELECT guest_id, first_name, last_name, email, phone,
              nationality, loyalty_points, total_stays, created_at
       FROM guests
       ${whereClause}
       ORDER BY created_at DESC`,
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

const getGuestById = async (req, res, next) => {
  try {
    const guestResult = await pool.query(
      'SELECT * FROM guests WHERE guest_id = $1',
      [req.params.id]
    );

    if (!guestResult.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found.'
      });
    }

    const statsResult = await pool.query(
      `SELECT
         COUNT(r.reservation_id) AS total_reservations,
         COALESCE(SUM(CASE WHEN r.status = 'checked_out'
                     THEN i.total_amount ELSE 0 END), 0) AS lifetime_revenue,
         MAX(r.check_out_date) AS last_visit_date
       FROM reservations r
       LEFT JOIN invoices i ON r.reservation_id = i.reservation_id
       WHERE r.guest_id = $1`,
      [req.params.id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...guestResult.rows[0],
        ...statsResult.rows[0]
      }
    });
  } catch (err) {
    next(err);
  }
};

const createGuest = async (req, res, next) => {
  try {
    const {
      first_name, last_name, email, phone,
      date_of_birth, nationality, id_type,
      id_number, address, city, country
    } = req.body;

    if (!first_name || !last_name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'first_name, last_name, and phone are required.'
      });
    }

    const result = await pool.query(
      `INSERT INTO guests
         (first_name, last_name, email, phone, date_of_birth,
          nationality, id_type, id_number, address, city, country)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [first_name, last_name, email, phone, date_of_birth,
       nationality, id_type, id_number, address, city, country]
    );

    res.status(201).json({
      success: true,
      message: 'Guest created successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

const updateGuest = async (req, res, next) => {
  try {
    const {
      first_name, last_name, email,
      phone, address, city, country
    } = req.body;

    const result = await pool.query(
      `UPDATE guests
       SET first_name = COALESCE($1, first_name),
           last_name  = COALESCE($2, last_name),
           email      = COALESCE($3, email),
           phone      = COALESCE($4, phone),
           address    = COALESCE($5, address),
           city       = COALESCE($6, city),
           country    = COALESCE($7, country),
           updated_at = CURRENT_TIMESTAMP
       WHERE guest_id = $8
       RETURNING *`,
      [first_name, last_name, email, phone,
       address, city, country, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Guest updated successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllGuests, getGuestById, createGuest, updateGuest };