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
    const params = [];
    let branchFilter = '';

    if (req.user.role_id !== 1) {
      params.push(req.user.branch_id);
      branchFilter = `AND r.branch_id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT 
          i.invoice_id,
          i.invoice_number,
          i.total_amount,
          i.payment_status,
          i.due_date,
          i.issue_date,
          r.status            AS reservation_status,
          r.check_in_date,
          r.check_out_date,
          r.reservation_id,
          CASE 
            WHEN i.due_date < CURRENT_DATE 
            THEN (CURRENT_DATE - i.due_date)::INT 
            ELSE 0 
          END                 AS days_overdue,
          CASE 
            WHEN i.due_date < CURRENT_DATE 
            THEN true 
            ELSE false 
          END                 AS is_overdue,
          COALESCE(SUM(
            CASE WHEN p.status = 'completed' 
            THEN p.amount ELSE 0 END
          ), 0)               AS already_paid,
          i.total_amount - COALESCE(SUM(
            CASE WHEN p.status = 'completed' 
            THEN p.amount ELSE 0 END
          ), 0)               AS remaining_balance,
          g.first_name,
          g.last_name,
          g.email,
          g.phone,
          b.branch_name
       FROM invoices i
       JOIN reservations r ON i.reservation_id = r.reservation_id
       JOIN guests       g ON r.guest_id       = g.guest_id
       JOIN branches     b ON r.branch_id      = b.branch_id
       LEFT JOIN payments p ON i.invoice_id    = p.invoice_id
       WHERE i.payment_status IN ('unpaid', 'partial')
         AND r.status IN ('confirmed', 'checked_in', 'checked_out')
         ${branchFilter}
       GROUP BY 
          i.invoice_id,
          i.invoice_number,
          i.total_amount,
          i.payment_status,
          i.due_date,
          i.issue_date,
          r.status,
          r.check_in_date,
          r.check_out_date,
          r.reservation_id,
          g.first_name,
          g.last_name,
          g.email,
          g.phone,
          b.branch_name
       HAVING 
          i.total_amount - COALESCE(SUM(
            CASE WHEN p.status = 'completed' 
            THEN p.amount ELSE 0 END
          ), 0) > 0
       ORDER BY
          CASE r.status
            WHEN 'checked_out' THEN 1
            WHEN 'checked_in'  THEN 2
            WHEN 'confirmed'   THEN 3
          END,
          i.due_date ASC`,
      params
    );

    res.status(200).json({
      success: true,
      count:   result.rows.length,
      data:    result.rows
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

const getInvoiceReceipt = async (req, res, next) => {
  try {
    const invoiceResult = await pool.query(
      `SELECT i.*, 
              r.check_in_date, r.check_out_date, r.num_adults, r.num_children,
              r.special_requests, r.actual_check_in, r.actual_check_out,
              g.first_name, g.last_name, g.email, g.phone, 
              g.loyalty_points, g.nationality,
              rm.room_number, rt.type_name, rt.base_price,
              b.branch_name, b.city, b.phone AS branch_phone
       FROM invoices i
       JOIN reservations r  ON i.reservation_id  = r.reservation_id
       JOIN guests       g  ON r.guest_id         = g.guest_id
       JOIN rooms        rm ON r.room_id           = rm.room_id
       JOIN room_types   rt ON rm.room_type_id     = rt.room_type_id
       JOIN branches     b  ON r.branch_id         = b.branch_id
       WHERE i.invoice_id = $1`,
      [req.params.id]
    );

    if (!invoiceResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const servicesResult = await pool.query(
      `SELECT rs.quantity, rs.unit_price, rs.total_price, rs.notes,
              s.service_name, s.category
       FROM reservation_services rs
       JOIN services s ON rs.service_id = s.service_id
       WHERE rs.reservation_id = $1`,
      [invoiceResult.rows[0].reservation_id]
    );

    const paymentsResult = await pool.query(
      `SELECT p.amount, p.payment_method, p.payment_date, p.status, p.transaction_id
       FROM payments p
       WHERE p.invoice_id = $1 AND p.status = 'completed'`,
      [req.params.id]
    );

    res.status(200).json({
      success: true,
      data: {
        invoice:  invoiceResult.rows[0],
        services: servicesResult.rows,
        payments: paymentsResult.rows,
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  getOverdueInvoices,
  recordPayment,
  getInvoiceReceipt
};