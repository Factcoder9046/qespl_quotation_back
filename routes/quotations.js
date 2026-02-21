const express = require('express');
const { body, validationResult } = require('express-validator');
const Quotation = require('../models/Quotation');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');
const permit = require('../middleware/permission');
const crypto = require('crypto');

const router = express.Router();

const generateSnapshotHash = (snapshot) => {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(snapshot))
    .digest('hex');
};

/* ======================================================
   GET DELETED QUOTATIONS (RECYCLE BIN) ✅
====================================================== */
router.get('/deleted', authenticate, async (req, res) => {
  try {
    const query = {
      isDeleted: true,
      ...(req.user.role === 'admin' ? {} : { createdBy: req.user._id })
    };

    const quotations = await Quotation.find(query)
      .populate('createdBy', 'name email')
      .sort({ deletedAt: -1 });

    res.json({ quotations });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load deleted quotations',
      error: error.message
    });
  }
});

/* ======================================================
   GET ALL QUOTATIONS
====================================================== */
router.get('/', authenticate, permit('quotation', 'read'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const status = req.query.status || 'all';

    const query = {
      $and: [
        {
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
        }
      ]
    };

    // 🔒 Role filter
    if (req.user.role !== 'admin') {
      query.$and.push({ createdBy: req.user._id });
    }

    // 🔍 Search filter (THIS WAS BROKEN BEFORE)
    if (search) {
      query.$and.push({
        $or: [
          { quotationNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { customerEmail: { $regex: search, $options: 'i' } },
          { customerCompanyName: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // 📌 Status filter
    if (status !== 'all') {
      query.$and.push({ status });
    }

    const [quotations, total] = await Promise.all([
      Quotation.find(query)
        .select(
          'quotationNumber customerName customerEmail total status createdAt createdBy statusHistory'
        )
        .populate('createdBy', 'name')
        .populate('statusHistory.updatedBy.userId', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Quotation.countDocuments(query)
    ]);

    res.json({
      quotations,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



/* ======================================================
   UPDATE SINGLE QUOTATION (FIXED + STABLE)
====================================================== */
// router.put('/:id', authenticate, permit('quotation', 'update'), async (req, res) => {
//   try {
//     const quotation = await Quotation.findById(req.params.id);
//     if (!quotation) {
//       return res.status(404).json({ message: 'Quotation not found' });
//     }

//     // 🔒 Ownership check
//     if (
//       req.user.role !== 'admin' &&
//       quotation.createdBy.toString() !== req.user._id.toString()
//     ) {
//       return res.status(403).json({ message: 'Access denied' });
//     }

//     // 🔒 Lock completed / failed
//     if (['complete', 'failed'].includes(quotation.status)) {
//       return res.status(400).json({
//         message: 'Completed / Failed quotation cannot be edited'
//       });
//     }

//     const {
//       items,
//       customerName,
//       customerEmail,
//       customerPhone,
//       customerAddress,
//       status,
//       notes
//     } = req.body;

//     /* ---------- BEFORE SNAPSHOT (DEEP COPY) ---------- */
//     const beforeSnapshot = JSON.parse(JSON.stringify({
//       customerName: quotation.customerName,
//       customerEmail: quotation.customerEmail,
//       customerPhone: quotation.customerPhone,
//       customerAddress: quotation.customerAddress,
//       items: quotation.items,
//       subtotal: quotation.subtotal,
//       tax: quotation.tax,
//       total: quotation.total
//     }));


//     let isEdited = false;

//    /* ---------- ITEMS UPDATE ---------- */
// if (Array.isArray(items) && items.length > 0) {
//   const itemsWithAmount = await Promise.all(
//     items.map(async (item) => {
//       const product = await Product.findById(item.productId).lean();
//       if (!product) throw new Error('Product not found');

//       const rate = item.rate ?? product.price;
//       const amount = item.quantity * rate;

//       return {
//         productId: product._id,
//         productName: product.productName,
//         unitOfMeasure: product.unitOfMeasure,
//         description: product.description,
//         quantity: item.quantity,
//         rate,
//         amount,
//         tax: product.tax,
//         parameters: product.parameters || [],
//         generalSpecifications: product.generalSpecifications || []
//       };
//     })
//   );

//   quotation.items = itemsWithAmount;
//   quotation.subtotal = itemsWithAmount.reduce((s, i) => s + i.amount, 0);
//   quotation.tax = itemsWithAmount.reduce(
//     (s, i) => s + (i.amount * i.tax) / 100,
//     0
//   );
//   quotation.total = quotation.subtotal + quotation.tax;

//   isEdited = true;
// }


//     /* ---------- BASIC FIELDS ---------- */
//     if (customerName !== undefined) { quotation.customerName = customerName; isEdited = true; }
//     if (customerEmail !== undefined) { quotation.customerEmail = customerEmail; isEdited = true; }
//     if (customerPhone !== undefined) { quotation.customerPhone = customerPhone; isEdited = true; }
//     if (customerAddress !== undefined) { quotation.customerAddress = customerAddress; isEdited = true; }
//     if (notes !== undefined) { quotation.notes = notes; isEdited = true; }

//     /* ---------- AFTER SNAPSHOT (DEEP COPY) ---------- */
//     const afterSnapshot = JSON.parse(JSON.stringify({
//       customerName: quotation.customerName,
//       customerEmail: quotation.customerEmail,
//       customerPhone: quotation.customerPhone,
//       customerAddress: quotation.customerAddress,
//       items: quotation.items,
//       subtotal: quotation.subtotal,
//       tax: quotation.tax,
//       total: quotation.total
//     }));

//     /* ---------- STATUS HANDLING ---------- */

//     // ✅ COMPLETE / FAILED
//     if (status && ['complete', 'failed'].includes(status)) {
//       quotation.status = status;

//       quotation.statusHistory.push({
//         status,
//         revision: quotation.revision,
//         updatedBy: {
//           userId: req.user._id,
//           name: req.user.name
//         },
//         role: req.user.role,
//         snapshot: {
//           before: beforeSnapshot,
//           after: afterSnapshot
//         },
//         at: new Date()
//       });
//     }

//     // ✅ REVISED
//     else if (isEdited) {
//       const lastHistory = quotation.statusHistory.at(-1);

//       const previousSnapshot =
//         lastHistory?.snapshot?.after
//           ? JSON.parse(JSON.stringify(lastHistory.snapshot.after))
//           : beforeSnapshot;

//       quotation.revision += 1;
//       quotation.status = 'revised';

//       quotation.statusHistory.push({
//         status: 'revised',
//         revision: quotation.revision,
//         updatedBy: {
//           userId: req.user._id,
//           name: req.user.name
//         },
//         role: req.user.role,
//         snapshot: {
//           before: previousSnapshot,
//           after: afterSnapshot
//         },
//         at: new Date()
//       });
//     }

//     await quotation.save();

//     // 🔥 RETURN FRESH POPULATED DATA
//     const updatedQuotation = await Quotation.findById(quotation._id)
//       .populate('createdBy', 'name')
//       .populate('statusHistory.updatedBy.userId', 'name role');

//     res.json({
//       message: 'Quotation updated successfully',
//       quotation: updatedQuotation
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// });

router.put('/:id', authenticate, permit('quotation', 'update'), async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    /* ---------- OWNERSHIP ---------- */
    if (
      req.user.role !== 'admin' &&
      quotation.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    /* ---------- LOCK ---------- */
    if (['complete', 'failed'].includes(quotation.status)) {
      return res.status(400).json({
        message: 'Completed / Failed quotation cannot be edited'
      });
    }

    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      status,
      notes
    } = req.body;

    /* ==================================================
       BEFORE SNAPSHOT
    ================================================== */
    const beforeSnapshot = {
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      items: quotation.items,
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      total: quotation.total
    };

    beforeSnapshot.hash = generateSnapshotHash(beforeSnapshot);

    let changedFields = [];

    /* ==================================================
       ITEMS UPDATE
    ================================================== */
    if (Array.isArray(items)) {
      const itemsWithAmount = await Promise.all(
        items.map(async (item) => {
          const product = await Product.findById(item.productId).lean();
          if (!product) throw new Error('Product not found');

          const rate = item.rate ?? product.price;
          const amount = item.quantity * rate;

          return {
            productId: product._id,
            productName: product.productName,
            unitOfMeasure: product.unitOfMeasure,
            description: product.description,
            quantity: item.quantity,
            rate,
            amount,
            tax: product.tax,
            parameters: product.parameters || [],
            generalSpecifications: product.generalSpecifications || []
          };
        })
      );

      quotation.items = itemsWithAmount;
      quotation.subtotal = itemsWithAmount.reduce((s, i) => s + i.amount, 0);
      quotation.tax = itemsWithAmount.reduce(
        (s, i) => s + (i.amount * i.tax) / 100,
        0
      );
      quotation.total = quotation.subtotal + quotation.tax;

      changedFields.push('items');
    }

    /* ==================================================
       BASIC FIELDS
    ================================================== */
    if (customerName !== undefined && customerName !== quotation.customerName) {
      quotation.customerName = customerName;
      changedFields.push('customerName');
    }

    if (customerEmail !== undefined && customerEmail !== quotation.customerEmail) {
      quotation.customerEmail = customerEmail;
      changedFields.push('customerEmail');
    }

    if (customerPhone !== undefined && customerPhone !== quotation.customerPhone) {
      quotation.customerPhone = customerPhone;
      changedFields.push('customerPhone');
    }

    if (customerAddress !== undefined && customerAddress !== quotation.customerAddress) {
      quotation.customerAddress = customerAddress;
      changedFields.push('customerAddress');
    }

    if (notes !== undefined && notes !== quotation.notes) {
      quotation.notes = notes;
      changedFields.push('notes');
    }

    /* ==================================================
       AFTER SNAPSHOT
    ================================================== */
    const afterSnapshot = {
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      items: quotation.items,
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      total: quotation.total
    };

    afterSnapshot.hash = generateSnapshotHash(afterSnapshot);

    /* ==================================================
       STATUS LOGIC (FINAL)
    ================================================== */

    // ✅ COMPLETE / FAILED (manual)
    if (status && ['complete', 'failed'].includes(status)) {
      quotation.status = status;

      quotation.statusHistory.push({
        status,
        revision: quotation.revision,
        updatedBy: {
          userId: req.user._id,
          name: req.user.name
        },
        role: req.user.role,
        snapshot: null,
        at: new Date()
      });
    }

    // ✅ AUTO REVISED (ONLY IF REAL CHANGE)
    else if (beforeSnapshot.hash !== afterSnapshot.hash) {
      quotation.revision += 1;
      quotation.status = 'revised';

      quotation.statusHistory.push({
        status: 'revised',
        revision: quotation.revision,
        updatedBy: {
          userId: req.user._id,
          name: req.user.name
        },
        role: req.user.role,
        snapshot: {
          before: beforeSnapshot,
          after: afterSnapshot
        },
        changedFields,
        at: new Date()
      });
    }

    // ❌ SAME DATA → NOTHING PUSHED

    await quotation.save();

    // 🔥 RETURN FRESH POPULATED DATA
    const updatedQuotation = await Quotation.findById(quotation._id)
      .populate('createdBy', 'name')
      .populate('statusHistory.updatedBy.userId', 'name role');

    res.json({
      message: 'Quotation updated successfully',
      quotation: updatedQuotation
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});




/* ======================================================
   CREATE QUOTATION ✅ FIXED
====================================================== */
router.post(
  '/',
  authenticate,
  permit('quotation', 'create'),
  [
    body('customerName').notEmpty(),
    body('customerEmail').isEmail(),
    body('items').isArray({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        items,
        notes,
        companyName,
        contactName,
        companyPhone,
        companyAddress,
        companyLogo,
        customerCompanyName,
        shippingDetails,
        customerId
      } = req.body;

      const itemsWithAmount = await Promise.all(
        items.map(async (item) => {
          const product = await Product.findById(item.productId).lean();
          if (!product) throw new Error('Product not found');

          const amount = item.quantity * product.price;

          return {
            productId: product._id,
            productName: product.productName,
            unitOfMeasure: product.unitOfMeasure,
            description: product.description,
            quantity: item.quantity,
            rate: product.price,
            amount,
            tax: product.tax,
            parameters: product.parameters || [],
            generalSpecifications: product.generalSpecifications || []
          };
        })
      );

      const subtotal = itemsWithAmount.reduce((s, i) => s + i.amount, 0);
      const taxAmount = itemsWithAmount.reduce(
        (s, i) => s + (i.amount * i.tax) / 100,
        0
      );

      const quotation = new Quotation({
        companyName,
        contactName,
        companyPhone,
        companyAddress,
        companyLogo,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        customerCompanyName,
        shippingDetails,
        items: itemsWithAmount,
        subtotal,
        tax: taxAmount,
        total: subtotal + taxAmount,
        notes,
        status: 'in_process',
        revision: 0,
        createdBy: req.user._id
      });

      // 🔥 TRACK POINT 1
      const initialSnapshot = JSON.parse(JSON.stringify({
        customerName: quotation.customerName,
        customerEmail: quotation.customerEmail,
        customerPhone: quotation.customerPhone,
        customerAddress: quotation.customerAddress,
        items: quotation.items,
        subtotal: quotation.subtotal,
        tax: quotation.tax,
        total: quotation.total
      }));

      initialSnapshot.hash = generateSnapshotHash(initialSnapshot);


      quotation.statusHistory.push({
        status: 'in_process',
        revision: 0,
        updatedBy: {
          userId: req.user._id,
          name: req.user.name
        },
        role: req.user.role,
        snapshot: {
          before: null,
          after: initialSnapshot
        }
      });


      await quotation.save();
      res.status(201).json({ message: 'Quotation created', quotation });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


/* ======================================================
   GET SINGLE QUOTATION
====================================================== */
router.get('/:id', authenticate, permit('quotation', 'read'), async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (
      req.user.role !== 'admin' &&
      quotation.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ quotation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/* ======================================================
   DELETE / RESTORE / PERMANENT DELETE
====================================================== */
router.delete('/:id', authenticate, permit('quotation', 'delete'), async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ message: 'Not found' });

  quotation.isDeleted = true;
  quotation.deletedAt = new Date();
  await quotation.save();

  res.json({ message: 'Quotation moved to recycle bin' });
});

router.put('/:id/restore', authenticate, permit('quotation', 'update'), async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ message: 'Not found' });

  quotation.isDeleted = false;
  quotation.deletedAt = null;
  await quotation.save();

  res.json({ message: 'Quotation restored', quotation });
});

router.delete('/:id/permanent', authenticate, permit('quotation', 'delete'), async (req, res) => {
  await Quotation.findByIdAndDelete(req.params.id);
  res.json({ message: 'Quotation permanently deleted' });
});

module.exports = router;
