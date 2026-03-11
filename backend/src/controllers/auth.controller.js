const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

const login = async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required.'
    });
  }

  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.password_hash,
              u.full_name, u.branch_id, u.is_active,
              r.role_id, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );

    const token = jwt.sign(
      {
        user_id:   user.user_id,
        username:  user.username,
        role_id:   user.role_id,
        role_name: user.role_name,
        branch_id: user.branch_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          user_id:   user.user_id,
          username:  user.username,
          full_name: user.full_name,
          role:      user.role_name,
          branch_id: user.branch_id,
        }
      }
    });

  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.full_name,
              u.phone, u.branch_id, u.last_login,
              r.role_name, b.branch_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN branches b ON u.branch_id = b.branch_id
       WHERE u.user_id = $1`,
      [req.user.user_id]
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

module.exports = { login, getMe };