const express = require('express');
const router = express.Router();
const { auth, isManager } = require('../middleware/auth');
const User = require('../models/User');
const Shift = require('../models/Shift');
const SwapRequest = require('../models/SwapRequest');
const PDFDocument = require('pdfkit');

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'department'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const user = await User.findById(req.user._id);
    updates.forEach(update => user[update] = req.body[update]);
    await user.save();

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// Get analytics (manager only)
router.get('/analytics', auth, isManager, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalShifts = await Shift.countDocuments();
    const totalSwaps = await SwapRequest.countDocuments();
    const successfulSwaps = await SwapRequest.countDocuments({ status: 'approved' });
    const pendingSwaps = await SwapRequest.countDocuments({ status: 'matched' });

    const analytics = {
      totalUsers,
      totalShifts,
      totalSwaps,
      successfulSwaps,
      pendingSwaps,
      successRate: totalSwaps > 0 ? (successfulSwaps / totalSwaps) * 100 : 0,
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

// Export analytics to CSV
router.get('/analytics/csv', auth, isManager, async (req, res) => {
  try {
    const analytics = await getAnalyticsData();
    const csv = convertToCSV(analytics);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Error exporting analytics', error: error.message });
  }
});

// Export analytics to PDF
router.get('/analytics/pdf', auth, isManager, async (req, res) => {
  try {
    const analytics = await getAnalyticsData();
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics.pdf');

    doc.pipe(res);

    doc.fontSize(20).text('ShiftSwap Analytics Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Total Users: ${analytics.totalUsers}`);
    doc.text(`Total Shifts: ${analytics.totalShifts}`);
    doc.text(`Total Swap Requests: ${analytics.totalSwaps}`);
    doc.text(`Successful Swaps: ${analytics.successfulSwaps}`);
    doc.text(`Pending Swaps: ${analytics.pendingSwaps}`);
    doc.text(`Success Rate: ${analytics.successRate.toFixed(2)}%`);

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Error exporting analytics', error: error.message });
  }
});

// Helper function to get analytics data
async function getAnalyticsData() {
  const totalUsers = await User.countDocuments();
  const totalShifts = await Shift.countDocuments();
  const totalSwaps = await SwapRequest.countDocuments();
  const successfulSwaps = await SwapRequest.countDocuments({ status: 'approved' });
  const pendingSwaps = await SwapRequest.countDocuments({ status: 'matched' });

  return {
    totalUsers,
    totalShifts,
    totalSwaps,
    successfulSwaps,
    pendingSwaps,
    successRate: totalSwaps > 0 ? (successfulSwaps / totalSwaps) * 100 : 0,
  };
}

// Helper function to convert data to CSV
function convertToCSV(data) {
  const headers = Object.keys(data);
  const values = headers.map(header => data[header]);
  return `${headers.join(',')}\n${values.join(',')}`;
}

// Register a new user (admin only)
router.post('/register', auth, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role,
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Update user (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

module.exports = router; 