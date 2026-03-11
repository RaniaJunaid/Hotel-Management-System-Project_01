const pool = require('../config/db');

const getAllInvoices = async (req, res, next) => {
  try {
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (req.user.role_id !== 1) {
      params.push(req.user.branch_id);
      whereClause += ` AND r.branch_id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT i.invoice_id, i.invoice_number, i.total_amount,
              i.payment_status, i.issue_date, i.due_date,
              g.first_name, g.last_name, b.branch_name
       FROM invoices i
       JOIN reservations r ON i.reservation_id = r.reservation_id
       JOIN guests       g ON r.guest_id       = g.guest_id
       JOIN branches     b ON r.branch_id      = b.branch_id
       ${whereClause}
       ORDER BY i.issue_date DESC`,
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

const getInvoiceById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT i.*,
              g.first_name, g.last_name, g.email,
              b.branch_name, rm.room_number, rt.type_name
       FROM invoices i
       JOIN reservations r  ON i.reservation_id  = r.reservation_id
       JOIN guests       g  ON r.guest_id         = g.guest_id
       JOIN branches     b  ON r.branch_id         = b.branch_id
       JOIN rooms        rm ON r.room_id           = rm.room_id
       JOIN room_types   rt ON rm.room_type_id     = rt.room_type_id
       WHERE i.invoice_id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.'
      });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const getOverdueInvoices = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT i.invoice_id, i.invoice_number, i.total_amount,
              i.payment_status, i.due_date,
              (CURRENT_DATE - i.due_date) AS days_overdue,
              g.first_name, g.last_name, g.email, g.phone,
              b.branch_name
       FROM invoices     i
       JOIN reservations r ON i.reservation_id = r.reservation_id
       JOIN guests       g ON r.guest_id       = g.guest_id
       JOIN branches     b ON r.branch_id      = b.branch_id
       WHERE i.payment_status IN ('unpaid','partial')
         AND i.due_date < CURRENT_DATE
       ORDER BY i.due_date ASC`
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

const recordPayment = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🔄 Transaction started: recordPayment');

    const { amount, payment_method, transaction_id, notes } = req.body;

    if (!amount || !payment_method) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'amount and payment_method are required.'
      });
    }

    const invResult = await client.query(
      'SELECT * FROM invoices WHERE invoice_id = $1',
      [req.params.id]
    );

    if (!invResult.rows[0]) {
      throw { statusCode: 404, message: 'Invoice not found.' };
    }

    if (invResult.rows[0].payment_status === 'paid') {
      throw { statusCode: 400, message: 'This invoice is already fully paid.' };
    }

    const payResult = await client.query(
      `INSERT INTO payments
         (invoice_id, amount, payment_method, transaction_id,
          processed_by, status, notes)
       VALUES ($1,$2,$3,$4,$5,'completed',$6)
       RETURNING *`,
      [req.params.id, amount, payment_method,
       transaction_id, req.user.user_id, notes]
    );
    console.log('✅ Payment recorded:', payResult.rows[0].payment_id);

    const updatedInv = await client.query(
      'SELECT * FROM invoices WHERE invoice_id = $1',
      [req.params.id]
    );

    await client.query('COMMIT');
    console.log('✅ Transaction committed: recordPayment');

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      data: {
        payment: payResult.rows[0],
        invoice: updatedInv.rows[0],
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
  getAllInvoices,
  getInvoiceById,
  getOverdueInvoices,
  recordPayment
};