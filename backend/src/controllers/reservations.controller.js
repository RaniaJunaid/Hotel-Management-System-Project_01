const pool = require('../config/db');

const getAllReservations = async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (req.user.role_id !== 1) {
      params.push(req.user.branch_id);
      whereClause += ` AND r.branch_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND r.status = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT r.reservation_id, r.check_in_date, r.check_out_date,
              r.status, r.total_amount, r.num_adults, r.num_children,
              r.special_requests, r.created_at,
              g.first_name, g.last_name, g.email, g.phone,
              rm.room_number, rt.type_name, rt.base_price,
              b.branch_name
       FROM reservations r
       JOIN guests     g  ON r.guest_id      = g.guest_id
       JOIN rooms      rm ON r.room_id       = rm.room_id
       JOIN room_types rt ON rm.room_type_id = rt.room_type_id
       JOIN branches   b  ON r.branch_id     = b.branch_id
       ${whereClause}
       ORDER BY r.created_at DESC`,
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

const getReservationById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
              g.first_name, g.last_name, g.email, g.phone,
              rm.room_number, rt.type_name, rt.base_price,
              b.branch_name,
              i.invoice_number, i.total_amount AS invoice_total,
              i.payment_status
       FROM reservations r
       JOIN guests     g  ON r.guest_id      = g.guest_id
       JOIN rooms      rm ON r.room_id       = rm.room_id
       JOIN room_types rt ON rm.room_type_id = rt.room_type_id
       JOIN branches   b  ON r.branch_id     = b.branch_id
       LEFT JOIN invoices i ON r.reservation_id = i.reservation_id
       WHERE r.reservation_id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found.'
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

const createReservation = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🔄 Transaction started: createReservation');

    const {
      guest_id, branch_id, room_id,
      check_in_date, check_out_date,
      num_adults, num_children = 0,
      special_requests
    } = req.body;

    if (!guest_id || !branch_id || !room_id || !check_in_date || !check_out_date || !num_adults) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'guest_id, branch_id, room_id, check_in_date, check_out_date, num_adults are required.'
      });
    }

    const roomResult = await client.query(
      `SELECT rt.base_price FROM rooms r
       JOIN room_types rt ON r.room_type_id = rt.room_type_id
       WHERE r.room_id = $1 AND r.is_active = TRUE`,
      [room_id]
    );

    if (!roomResult.rows[0]) {
      throw { statusCode: 404, message: 'Room not found.' };
    }

    const checkIn      = new Date(check_in_date);
    const checkOut     = new Date(check_out_date);
    const nights       = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const base_price   = parseFloat(roomResult.rows[0].base_price);
    const total_amount = parseFloat((base_price * nights).toFixed(2));

    const resResult = await client.query(
      `INSERT INTO reservations
         (guest_id, branch_id, room_id, check_in_date, check_out_date,
          num_adults, num_children, status, special_requests,
          total_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed',$8,$9,$10)
       RETURNING *`,
      [guest_id, branch_id, room_id, check_in_date, check_out_date,
       num_adults, num_children, special_requests,
       total_amount, req.user.user_id]
    );

    const reservation = resResult.rows[0];
    console.log('✅ Reservation inserted:', reservation.reservation_id);

    const countResult  = await client.query('SELECT COUNT(*) FROM invoices');
    const invNumber    = `INV-${new Date().getFullYear()}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;
    const tax          = parseFloat((total_amount * 0.10).toFixed(2));
    const invTotal     = parseFloat((total_amount + tax).toFixed(2));

    const invResult = await client.query(
      `INSERT INTO invoices
         (reservation_id, invoice_number, subtotal, tax_amount,
          total_amount, payment_status, due_date)
       VALUES ($1,$2,$3,$4,$5,'unpaid',$6)
       RETURNING *`,
      [reservation.reservation_id, invNumber,
       total_amount, tax, invTotal, check_out_date]
    );

    console.log('✅ Invoice created:', invResult.rows[0].invoice_number);

    await client.query('COMMIT');
    console.log('✅ Transaction committed: createReservation');

    res.status(201).json({
      success: true,
      message: 'Reservation and invoice created successfully.',
      data: {
        reservation: resResult.rows[0],
        invoice:     invResult.rows[0],
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back:', err.message);
    next(err);
  } finally {
    client.release();
  }
};

const checkoutReservation = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🔄 Transaction started: checkoutReservation');

    const resResult = await client.query(
      'SELECT * FROM reservations WHERE reservation_id = $1',
      [req.params.id]
    );

    if (!resResult.rows[0]) {
      throw { statusCode: 404, message: 'Reservation not found.' };
    }

    if (resResult.rows[0].status !== 'checked_in') {
      throw {
        statusCode: 400,
        message: `Cannot checkout. Current status is: ${resResult.rows[0].status}`
      };
    }

    await client.query(
      `UPDATE reservations
       SET status = 'checked_out', actual_check_out = CURRENT_TIMESTAMP
       WHERE reservation_id = $1`,
      [req.params.id]
    );
    console.log('✅ Reservation updated to checked_out');

    const invResult = await client.query(
      'SELECT * FROM invoices WHERE reservation_id = $1',
      [req.params.id]
    );

    if (!invResult.rows[0]) {
      throw { statusCode: 404, message: 'Invoice not found.' };
    }

    await client.query('COMMIT');
    console.log('✅ Transaction committed: checkoutReservation');

    res.status(200).json({
      success: true,
      message: 'Checkout successful. Room is now available.',
      data: {
        reservation_id:   parseInt(req.params.id),
        status:           'checked_out',
        actual_check_out: new Date().toISOString(),
        invoice:          invResult.rows[0],
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back:', err.message);
    next(err);
  } finally {
    client.release();
  }
};

const cancelReservation = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🔄 Transaction started: cancelReservation');

    const resResult = await client.query(
      'SELECT * FROM reservations WHERE reservation_id = $1',
      [req.params.id]
    );

    if (!resResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Reservation not found.'
      });
    }

    const { status } = resResult.rows[0];
    console.log('Current status:', status);

    if (status === 'checked_out' || status === 'cancelled') {
      await client.query('ROLLBACK');
      console.error('❌ Transaction rolled back: Cannot cancel status:', status);
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a reservation with status: ${status}`
      });
    }

    const reason = req.body.reason || 'No reason provided';

    await client.query(
  `UPDATE reservations
   SET status = 'cancelled',
       special_requests = COALESCE(special_requests,'') || ' | Cancelled: ' || $2::text
   WHERE reservation_id = $1`,
  [req.params.id, reason]
);
    console.log('✅ Reservation cancelled successfully');

    await client.query(
      `UPDATE invoices SET payment_status = 'refunded'
       WHERE reservation_id = $1`,
      [req.params.id]
    );
    console.log('✅ Invoice updated to refunded');

    await client.query('COMMIT');
    console.log('✅ Transaction committed: cancelReservation');

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled and invoice refunded successfully.',
      data: {
        reservation_id: parseInt(req.params.id),
        status:         'cancelled',
        reason:         reason
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back:', err.message);
    next(err);
  } finally {
    client.release();
  }
};
const checkinReservation = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🔄 Transaction started: checkinReservation');

    const resResult = await client.query(
      'SELECT * FROM reservations WHERE reservation_id = $1',
      [req.params.id]
    );

    if (!resResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Reservation not found.'
      });
    }

    const { status } = resResult.rows[0];
    console.log('Current status:', status);

    if (status !== 'confirmed') {
      await client.query('ROLLBACK');
      console.error('❌ Transaction rolled back: Cannot checkin status:', status);
      return res.status(400).json({
        success: false,
        message: `Cannot checkin. Current status is: ${status}`
      });
    }

    await client.query(
      `UPDATE reservations
       SET status = 'checked_in',
           actual_check_in = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE reservation_id = $1`,
      [req.params.id]
    );
    console.log('✅ Reservation updated to checked_in');

    await client.query(
      `UPDATE rooms SET status = 'occupied'
       WHERE room_id = $1`,
      [resResult.rows[0].room_id]
    );
    console.log('✅ Room status updated to occupied');

    const invResult = await client.query(
      'SELECT * FROM invoices WHERE reservation_id = $1',
      [req.params.id]
    );
    console.log('✅ Invoice found:', invResult.rows[0].invoice_id);

    await client.query('COMMIT');
    console.log('✅ Transaction committed: checkinReservation');

    res.status(200).json({
      success: true,
      message: 'Checkin successful. Room is now occupied.',
      data: {
        reservation_id:  parseInt(req.params.id),
        status:          'checked_in',
        actual_check_in: new Date().toISOString(),
        room_id:         resResult.rows[0].room_id,
        invoice:         invResult.rows[0]
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back:', err.message);
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getAllReservations,
  getReservationById,
  createReservation,
  checkinReservation,
  checkoutReservation,
  cancelReservation
};