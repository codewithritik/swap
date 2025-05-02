const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
require('dotenv').config({ path: './.env' });

const app = express();

// Middleware

app.use(cors({
  origin: 'http://localhost:3000', // explicitly allow your frontend origin
  credentials: true               // allow credentials (cookies, headers, etc.)
}));
app.use(express.json());
  
// MongoDB Connection
const url  = "mongodb+srv://ritikadvice:BftLDzCoYwzPewUw@cluster0.q67ewwy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
console.log(process.env.MONGODB_URI);
mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
const authRoutes = require('./routes/auth');
const shiftRoutes = require('./routes/shifts');
const swapRoutes = require('./routes/swaps');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');

app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 