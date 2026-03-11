const ROLES = {
  ADMIN:        1,
  MANAGER:      2,
  RECEPTIONIST: 3,
  HOUSEKEEPING: 4,
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    if (!allowedRoles.includes(req.user.role_id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission for this action.'
      });
    }

    next();
  };
};

module.exports = { authorize, ROLES };