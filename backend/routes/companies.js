const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Company = require('../models/Company');
const User = require('../models/User');

// Create a new company
router.post('/', async (req, res) => {
  try {
    const { name, description, departments, adminUserId } = req.body;

    // Create company
    const company = new Company({
      name,
      description,
      departments,
      adminId: adminUserId,
    });
    await company.save();

    // Find and update existing user
    const adminUser = await User.findById(adminUserId);
    if (!adminUser) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    adminUser.company = company._id;
    adminUser.role = 'admin';
    await adminUser.save();

    res.status(201).json({
      company,
      admin: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating company', error: error.message });
  }
});

// Get company details
router.get('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching company', error: error.message });
  }
});

// Update company
router.put('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: 'Error updating company', error: error.message });
  }
});

// Add department
router.post('/:id/departments', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    company.departments.push(req.body);
    await company.save();

    res.json(company);
  } catch (error) {
    res.status(500).json({ message: 'Error adding department', error: error.message });
  }
});

// Get company employees
router.get('/:id/employees', auth, async (req, res) => {
  try {
    const employees = await User.find({ company: req.params.id })
      .select('-password')
      .sort({ role: 1, name: 1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
});

module.exports = router; 