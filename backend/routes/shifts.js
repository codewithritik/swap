const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Shift = require('../models/Shift');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

// Get all shifts for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const shifts = await Shift.find()
      .sort({ date: 1, startTime: 1 });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shifts', error: error.message });
  }
});

// Create a new shift
router.post('/', auth, async (req, res) => {
  try {
    const shift = new Shift({
      ...req.body,
      user: req.user._id,
    });
    await shift.save();
    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ message: 'Error creating shift', error: error.message });
  }
});

// Import shifts from CSV
router.post('/import', auth, upload.single('file'), async (req, res) => {
  try {
    const results = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        for (const shift of results) {
          try {
            const newShift = new Shift({
              user: shift.staffId,
              date: new Date(shift.date),
              startTime: shift.startTime,
              endTime: shift.endTime,
              role: shift.role,
              department: shift.department,
            });
            await newShift.save();
          } catch (error) {
            errors.push({ shift, error: error.message });
          }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        if (errors.length > 0) {
          res.status(207).json({
            message: 'Some shifts were imported successfully, but some failed',
            errors,
          });
        } else {
          res.status(201).json({ message: 'All shifts imported successfully' });
        }
      });
  } catch (error) {
    res.status(500).json({ message: 'Error importing shifts', error: error.message });
  }
});

// Update a shift
router.put('/:id', auth, async (req, res) => {
  try {
    const shift = await Shift.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found' });
    }
    res.json(shift);
  } catch (error) {
    res.status(500).json({ message: 'Error updating shift', error: error.message });
  }
});

// Delete a shift
router.delete('/:id', auth, async (req, res) => {
  try {
    const shift = await Shift.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found' });
    }
    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting shift', error: error.message });
  }
});

module.exports = router; 