require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const authRoutes        = require('./routes/auth.routes');
const roomRoutes        = require('./routes/rooms.routes');
const reservationRoutes = require('./routes/reservations.routes');
const guestRoutes       = require('./routes/guests.routes');
const invoiceRoutes     = require('./routes/invoices.routes');
const errorHandler      = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/v1/auth',         authRoutes);
app.use('/api/v1/rooms',        roomRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/guests',       guestRoutes);
app.use('/api/v1/invoices',     invoiceRoutes);

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running.',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/api/v1`);
});
//POST http://localhost:3000/api/v1/auth/login
//{ "username": "admin", "password": "password" }

