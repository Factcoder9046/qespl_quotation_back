const express = require('express');
const { body, validationResult } = require('express-validator');
const Company = require('../models/Company');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get company details (for any authenticated user)
router.get('/my-company', authenticate, async (req, res) => {
  try {
<<<<<<< HEAD

    if (!req.user.company) {
      return res.status(404).json({ message: 'Company details not found' });
    }

    const company = await Company.findById(req.user.company);
=======
    const company = await Company.findOne().sort({ createdAt: 1 });
>>>>>>> b215e4a (pdf generation with terms editable update + tax update working + slash missing update)

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json({ company });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create company details (Admin only)
router.post('/', authenticate, isAdmin, [
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('contactName').trim().notEmpty().withMessage('Contact name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('address1').trim().notEmpty().withMessage('Address is required'),
  body('businessLabel').isIn(['GSTIN', 'PAN', 'VAT', 'Business Number']).withMessage('Valid business label is required'),
  body('businessNumber').trim().notEmpty().withMessage('Business number is required'),
  // body('businessCategory').trim().notEmpty().withMessage('Business category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if company already exists for this admin
<<<<<<< HEAD
    const existingCompany = await Company.findOne({ createdBy: req.user._id });
=======
    const existingCompany = await Company.findOne();
>>>>>>> b215e4a (pdf generation with terms editable update + tax update working + slash missing update)
    if (existingCompany) {
      return res.status(400).json({ message: 'Company details already exist. Use update instead.' });
    }

    const company = new Company({
      ...req.body,
<<<<<<< HEAD
      createdBy: req.user._id
=======

>>>>>>> b215e4a (pdf generation with terms editable update + tax update working + slash missing update)
    });

    await company.save();

<<<<<<< HEAD
    req.user.company = company._id;
    await req.user.save();

=======
>>>>>>> b215e4a (pdf generation with terms editable update + tax update working + slash missing update)
    res.status(201).json({
      message: 'Company details created successfully',
      company
    });
  } catch (error) {
    console.error('Company creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update company details (Admin only)
router.put('/', authenticate, isAdmin, async (req, res) => {
  try {
    let company = await Company.findOne({ createdBy: req.user._id });

    if (!company) {
      return res.status(404).json({ message: 'Company details not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        company[key] = req.body[key];
      }
    });

    await company.save();

    res.json({
      message: 'Company details updated successfully',
      company
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check if company exists
router.get('/check', authenticate, async (req, res) => {
  try {
<<<<<<< HEAD
    if (req.user.company) {
      return res.json({
        exists: true,
        company: req.user.company
      });
    }

    return res.json({
      exists: false,
      company: null
=======
    const company = await Company.findOne().sort({ createdAt: 1 });

    res.json({
      exists: !!company,
      company: company || null
>>>>>>> b215e4a (pdf generation with terms editable update + tax update working + slash missing update)
    });

  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});
<<<<<<< HEAD

=======
>>>>>>> b215e4a (pdf generation with terms editable update + tax update working + slash missing update)
module.exports = router;