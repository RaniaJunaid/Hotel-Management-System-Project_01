const pool = require('../config/db');

// GET /api/v1/housekeeping
const getAllTasks = async (req, res, next) => {
  try {
    const { status, priority, date } = req.query;
    const params = [];
    let whereClause = 'WHERE 1=1';

    // Non-admin sees only their branch
    if (req.user.role_id !== 1) {
      params.push(req.user.branch_id);
      whereClause += ` AND r.branch_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND ht.status = $${params.length}`;
    }

    if (priority) {
      params.push(priority);
      whereClause += ` AND ht.priority = $${params.length}`;
    }

    if (date) {
      params.push(date);
      whereClause += ` AND ht.scheduled_date = $${params.length}`;
    }

    // Housekeeping staff only see their own tasks
    if (req.user.role_id === 4) {
      params.push(req.user.user_id);
      whereClause += ` AND ht.assigned_to = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT 
          ht.task_id,
          ht.task_type,
          ht.priority,
          ht.status,
          ht.scheduled_date,
          ht.completed_date,
          ht.notes,
          ht.created_at,
          r.room_number,
          r.floor_number,
          rt.type_name,
          b.branch_name,
          b.branch_id,
          u.full_name AS assigned_to_name,
          u.user_id  AS assigned_to_id
       FROM housekeeping_tasks ht
       JOIN rooms      r  ON ht.room_id     = r.room_id
       JOIN room_types rt ON r.room_type_id = rt.room_type_id
       JOIN branches   b  ON r.branch_id    = b.branch_id
       LEFT JOIN users u  ON ht.assigned_to = u.user_id
       ${whereClause}
       ORDER BY 
         CASE ht.priority
           WHEN 'urgent' THEN 1
           WHEN 'high'   THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low'    THEN 4
         END,
         ht.scheduled_date ASC`,
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

// POST /api/v1/housekeeping
const createTask = async (req, res, next) => {
  try {
    const {
      room_id, assigned_to, task_type,
      priority, scheduled_date, notes
    } = req.body;

    if (!room_id || !task_type || !scheduled_date) {
      return res.status(400).json({
        success: false,
        message: 'room_id, task_type and scheduled_date are required.'
      });
    }

    const result = await pool.query(
      `INSERT INTO housekeeping_tasks
         (room_id, assigned_to, task_type, priority, scheduled_date, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')
       RETURNING *`,
      [room_id, assigned_to || null, task_type,
       priority || 'medium', scheduled_date, notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/housekeeping/:id/status
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const completed_date = status === 'completed'
      ? 'CURRENT_TIMESTAMP'
      : 'NULL';

    const result = await pool.query(
      `UPDATE housekeeping_tasks
       SET status         = $1,
           completed_date = ${completed_date},
           notes          = COALESCE($2, notes)
       WHERE task_id = $3
       RETURNING *`,
      [status, notes || null, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: `Task marked as ${status}.`,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/housekeeping/:id/assign
const assignTask = async (req, res, next) => {
  try {
    const { assigned_to } = req.body;

    const result = await pool.query(
      `UPDATE housekeeping_tasks
       SET assigned_to = $1
       WHERE task_id = $2
       RETURNING *`,
      [assigned_to, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task assigned successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/housekeeping/staff
const getHousekeepingStaff = async (req, res, next) => {
  try {
    const params = [];
    let whereClause = `WHERE u.role_id = 4 AND u.is_active = TRUE`;

    if (req.user.role_id !== 1) {
      params.push(req.user.branch_id);
      whereClause += ` AND u.branch_id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.branch_id, b.branch_name,
              COUNT(ht.task_id) FILTER (WHERE ht.status IN ('pending','in_progress')) AS active_tasks
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.branch_id
       LEFT JOIN housekeeping_tasks ht ON u.user_id = ht.assigned_to
       ${whereClause}
       GROUP BY u.user_id, u.full_name, u.branch_id, b.branch_name
       ORDER BY u.full_name`,
      params
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllTasks,
  createTask,
  updateTaskStatus,
  assignTask,
  getHousekeepingStaff
};