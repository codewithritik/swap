const express = require('express');
const router = express.Router();
const { auth, isManager } = require('../middleware/auth');
const SwapRequest = require('../models/SwapRequest');
const Shift = require('../models/Shift');

// Get all open swap requests
router.get('/open', auth, async (req, res) => {
  try {
    const swaps = await SwapRequest.find({ status: 'open' })
      .populate('originalShift')
      .populate('requester', 'name email')
      .sort({ createdAt: -1 });
    res.json(swaps);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching swap requests', error: error.message });
  }
});

// Get swap requests for the logged-in user
router.get('/my-requests', auth, async (req, res) => {
  try {
    const swaps = await SwapRequest.find({
      $or: [
        { requester: req.user._id },
        { volunteer: req.user._id }
      ]
    })
      .populate('originalShift')
      .populate('requester', 'name email')
      .populate('volunteer', 'name email')
      .sort({ createdAt: -1 });
    res.json(swaps);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching swap requests', error: error.message });
  }
});

// Create a new swap request
router.post('/', auth, async (req, res) => {
  try {
    const { shiftId, notes } = req.body;

    // Verify the shift belongs to the user
    const shift = await Shift.findOne({ _id: shiftId });
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found' });
    }

    const swapRequest = new SwapRequest({
      originalShift: shiftId,
      notes,
    });

    await swapRequest.save();
    res.status(201).json(swapRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error creating swap request', error: error.message });
  }
});

// Volunteer for a swap request
router.post('/:id/volunteer', auth, async (req, res) => {
  try {
    const swapRequest = await SwapRequest.findOne({
      _id: req.params.id,
      status: 'open',
    });

    if (!swapRequest) {
      return res.status(404).json({ message: 'Swap request not found or not open' });
    }

    // Check if user is trying to volunteer for their own request
    if (swapRequest.requester.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot volunteer for your own request' });
    }

    swapRequest.volunteer = req.user._id;
    swapRequest.status = 'matched';
    await swapRequest.save();

    res.json(swapRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error volunteering for swap', error: error.message });
  }
});

// Manager approval/rejection
router.post('/:id/approve', auth, isManager, async (req, res) => {
  try {
    const { approved, notes } = req.body;
    const swapRequest = await SwapRequest.findOne({
      _id: req.params.id,
      status: 'matched',
    });

    if (!swapRequest) {
      return res.status(404).json({ message: 'Swap request not found or not matched' });
    }

    swapRequest.status = approved ? 'approved' : 'rejected';
    swapRequest.manager = req.user._id;
    swapRequest.managerNotes = notes;

    if (approved) {
      // Update the original shift to reflect the swap
      const shift = await Shift.findById(swapRequest.originalShift);
      shift.user = swapRequest.volunteer;
      shift.status = 'swapped';
      await shift.save();
    }

    await swapRequest.save();
    res.json(swapRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error processing approval', error: error.message });
  }
});

// Cancel a swap request
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const swapRequest = await SwapRequest.findOne({
      _id: req.params.id,
      requester: req.user._id,
      status: { $in: ['open', 'matched'] },
    });

    if (!swapRequest) {
      return res.status(404).json({ message: 'Swap request not found or cannot be cancelled' });
    }

    swapRequest.status = 'cancelled';
    await swapRequest.save();

    res.json(swapRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling swap request', error: error.message });
  }
});

module.exports = router; 