const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry: ' + err.detail
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.'
    });
  }

  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Data validation failed: ' + err.detail
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error.'
  });
};

module.exports = errorHandler;