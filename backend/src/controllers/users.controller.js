const bcrypt = require('bcryptjs');
const pool   = require('../config/db');

// GET /api/v1/users
const getAllUsers = async (req, res, next) => {
  try {
    const params = [];
    let whereClause = 'WHERE u.is_active = TRUE';

    // Manager can only see users in their branch
    if (req.user.role_id === 2) {
      params.push(req.user.branch_id);
      whereClause += ` AND u.branch_id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.full_name,
              u.phone, u.is_active, u.created_at, u.last_login,
              r.role_id, r.role_name,
              b.branch_name, b.branch_id
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN branches b ON u.branch_id = b.branch_id
       ${whereClause}
       ORDER BY r.role_id, u.full_name`,
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

// GET /api/v1/users/:id
const getUserById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.full_name,
              u.phone, u.is_active, u.created_at, u.last_login,
              r.role_id, r.role_name,
              b.branch_name, b.branch_id
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN branches b ON u.branch_id = b.branch_id
       WHERE u.user_id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
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

// POST /api/v1/users
const createUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🔄 Transaction started: createUser');

    const {
      username, email, password,
      full_name, phone, role_id, branch_id
    } = req.body;

    // Validation
    if (!username || !email || !password || !full_name || !role_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'username, email, password, full_name and role_id are required.'
      });
    }

    // Role restrictions:
    // Manager (role_id=2) can only create Receptionist (3) and Housekeeping (4)
    if (req.user.role_id === 2) {
      if (![3, 4].includes(parseInt(role_id))) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: 'Managers can only create Receptionist or Housekeeping accounts.'
        });
      }
      // Manager can only create users for their own branch
      if (parseInt(branch_id) !== req.user.branch_id) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: 'Managers can only create users for their own branch.'
        });
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed');

    const result = await client.query(
      `INSERT INTO users 
         (username, email, password_hash, full_name, phone, role_id, branch_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)
       RETURNING user_id, username, email, full_name, phone, role_id, branch_id, is_active, created_at`,
      [username, email, password_hash, full_name, phone || null,
       parseInt(role_id), branch_id ? parseInt(branch_id) : null]
    );

    console.log('✅ User created:', result.rows[0].user_id);
    await client.query('COMMIT');
    console.log('✅ Transaction committed: createUser');

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: result.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back:', err.message);
    next(err);
  } finally {
    client.release();
  }
};

// PATCH /api/v1/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { full_name, email, phone, branch_id, role_id } = req.body;

    // Manager cannot change roles to Admin or Manager
    if (req.user.role_id === 2 && role_id && [1, 2].includes(parseInt(role_id))) {
      return res.status(403).json({
        success: false,
        message: 'Managers cannot assign Admin or Manager roles.'
      });
    }

    // Prevent changing own role
    if (parseInt(req.params.id) === req.user.user_id && role_id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change your own role.'
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET full_name  = COALESCE($1, full_name),
           email      = COALESCE($2, email),
           phone      = COALESCE($3, phone),
           branch_id  = COALESCE($4, branch_id),
           role_id    = COALESCE($5, role_id)
       WHERE user_id = $6
       RETURNING user_id, username, email, full_name, phone, role_id, branch_id`,
      [full_name, email, phone,
       branch_id ? parseInt(branch_id) : null,
       role_id   ? parseInt(role_id)   : null,
       req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/:id/toggle-status
const toggleUserStatus = async (req, res, next) => {
  try {
    // Cannot deactivate yourself
    if (parseInt(req.params.id) === req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot deactivate your own account.'
      });
    }

    // Manager cannot deactivate Admin or other Managers
    if (req.user.role_id === 2) {
      const targetUser = await pool.query(
        'SELECT role_id FROM users WHERE user_id = $1',
        [req.params.id]
      );
      if (targetUser.rows[0] && [1, 2].includes(targetUser.rows[0].role_id)) {
        return res.status(403).json({
          success: false,
          message: 'Managers cannot deactivate Admin or Manager accounts.'
        });
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET is_active = NOT is_active
       WHERE user_id = $1
       RETURNING user_id, username, is_active`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully.`,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/:id/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    const password_hash = await bcrypt.hash(new_password, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2',
      [password_hash, req.params.id]
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successfully.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetPassword
};