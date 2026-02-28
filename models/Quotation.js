// const mongoose = require('mongoose');

// const quotationItemSchema = new mongoose.Schema({
//   productId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Product'
//   },

//   productName: {
//     type: String,
//     required: true
//   },
//   unitOfMeasure: {
//     type: String,
//     default: ''
//   },

//   description: {
//     type: String,
//     required: true
//   },

//   quantity: {
//     type: Number,
//     required: true,
//     min: 1
//   },

//   rate: {
//     type: Number,
//     required: true,
//     min: 0
//   },

//   amount: {
//     type: Number,
//     required: true
//   },

//   tax: {
//     type: Number,
//     default: 0
//   },

//   parameters: [
//     {
//       title: String,
//       specs: [
//         {
//           label: String,
//           value: String
//         }
//       ]
//     }
//   ],
//   generalSpecifications: {
//     type: [
//       {
//         text: { type: String, trim: true }
//       }
//     ],
//     default: []
//   }
// });


// const quotationSchema = new mongoose.Schema({
//   quotationNumber: {
//     type: String,
//     unique: true
//   },
//   // Company Details (from user's company)
//   companyName: {
//     type: String,
//     default: ''
//   },
//   contactName: {
//     type: String,
//     default: ''
//   },
//   companyPhone: {
//     type: String,
//     default: ''
//   },
//   companyAddress: {
//     type: String,
//     default: ''
//   },
//   // companyLogo: {
//   //   type: String,
//   //   default: ''
//   // },
//   // Customer Details
//   customerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Customer',
//     default: null
//   },
//   customerName: {
//     type: String,
//     required: true
//   },
//   customerEmail: {
//     type: String,
//     required: true
//   },
//   customerPhone: {
//     type: String,
//     default: ''
//   },
//   customerAddress: {
//     type: String,
//     default: ''
//   },
//   customerCompanyName: {
//     type: String,
//     default: ''
//   },
//   shippingDetails: {
//     type: String,
//     default: ''
//   },
//   items: [quotationItemSchema],
//   subtotal: {
//     type: Number,
//     required: true
//   },
//   tax: {
//     type: Number,
//     default: 0
//   },
//   total: {
//     type: Number,
//     required: true
//   },
//   status: {
//   type: String,
//   enum: ['in_process', 'revised', 'complete', 'failed'],
//   default: 'in_process'
// },

// revision: {
//   type: Number,
//   default: 0
// },

// statusHistory: [
//   {
//     status: {
//       type: String,
//       enum: ['in_process', 'revised', 'complete', 'failed'],
//       required: true
//     },

//     revision: {
//       type: Number,
//       default: 0
//     },

//     updatedBy: {
//       userId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User'
//       },
//       name: String
//     },

//     role: String,

//     // 🔥 OLD quotation snapshot
//     snapshot: {
//   before: {
//     customerName: String,
//     customerEmail: String,
//     customerPhone: String,
//     customerAddress: String,
//     items: [quotationItemSchema],
//     subtotal: Number,
//     tax: Number,
//     total: Number
//   },
//   after: {
//     customerName: String,
//     customerEmail: String,
//     customerPhone: String,
//     customerAddress: String,
//     items: [quotationItemSchema],
//     subtotal: Number,
//     tax: Number,
//     total: Number
//   }
// },


//     at: {
//       type: Date,
//       default: Date.now
//     }
//   }
// ],

//   notes: {
//     type: String
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   isDeleted: {
//     type: Boolean,
//     default: false
//   },
//   deletedAt: {
//     type: Date,
//     default: null
//   }
// }, {
//   timestamps: true
// });

// // Auto-generate quotation number - FIXED VERSION
// quotationSchema.pre('save', async function (next) {
//   if (this.quotationNumber) {
//     return next();
//   }

//   try {
//     const now = new Date();

//     const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
//     const month = monthNames[now.getMonth()];
//     const year = String(now.getFullYear()).slice(-2); // 25

//     const monthYearKey = `${month}${year}`; // JAN25

//     // Month start & end
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

//     // Count quotations only for current month
//     const count = await mongoose.model('Quotation').countDocuments({
//       createdAt: {
//         $gte: startOfMonth,
//         $lte: endOfMonth
//       }
//     });

//     const sequence = String(count + 1).padStart(3, '0');

//     this.quotationNumber = `QES/QT/${monthYearKey}/${sequence}`;

//     next();
//   } catch (error) {
//     next(error);
//   }
// });


// module.exports = mongoose.model('Quotation', quotationSchema);

const mongoose = require('mongoose');

/* ======================================================
   QUOTATION ITEM SCHEMA
====================================================== */
const quotationItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true },
    unitOfMeasure: { type: String, default: '' },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true },
    tax: { type: Number, default: 0 },

    parameters: [
      {
        title: String,
        specs: [{ label: String, value: String }]
      }
    ],

    generalSpecifications: {
      type: [{ text: { type: String, trim: true } }],
      default: []
    }
  },
  { _id: false }
);

/* ======================================================
   SNAPSHOT SUB-SCHEMA (WITH HASH)
====================================================== */
const quotationSnapshotSchema = new mongoose.Schema(
  {
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    customerAddress: String,
    items: [quotationItemSchema],
    subtotal: Number,
    tax: Number,
    total: Number,

    // 🔥 IMPORTANT: snapshot hash
    hash: {
      type: String,
      index: true
    }
  },
  { _id: false }
);

/* ======================================================
   STATUS HISTORY SUB-SCHEMA
====================================================== */
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['in_process', 'revised', 'complete', 'failed'],
      required: true
    },

    revision: {
      type: Number,
      default: 0
    },

    updatedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String
    },

    role: String,

    snapshot: {
      before: { type: quotationSnapshotSchema, default: null },
      after: { type: quotationSnapshotSchema, default: null }
    },

    // 🧠 optional but powerful
    changedFields: {
      type: [String],
      default: []
    },

    at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

/* ======================================================
   MAIN QUOTATION SCHEMA
====================================================== */
const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: { type: String, unique: true },

    // Company
    companyName: { type: String, default: '' },
    contactName: { type: String, default: '' },
    companyPhone: { type: String, default: '' },
    companyAddress: { type: String, default: '' },

    // Customer
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    customerCompanyName: { type: String, default: '' },
    shippingDetails: { type: String, default: '' },

    items: [quotationItemSchema],

    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },

<<<<<<< HEAD
=======
    // models/Quotation.js mein badlav:
    termsAndConditions: {
      priceValidity: { type: String, default: "30 Days from the date of Offer" },
      paymentTerms: { type: String, default: "100 % advance" },
      freight: { type: String, default: "Excluded" },
      delivery: { type: String, default: "10–13 days as per Instruments from date of receipt" },
      packing: { type: String, default: "Actual" },
      forwarding: { type: String, default: "Actual" },
      warranty: { type: String, default: "1 year from date of delivery On manufacturing defects" },
      installation: { type: String, default: "Excluded" },
      documents: { type: String, default: "Billing Address, Shipping Address, Road Permit, GST No." }
    },

    defaultTerms: {
      type: String,
      default: ""
    },

>>>>>>> b215e4a (pdf generation with terms editable update + tax update working + slash missing update)
    status: {
      type: String,
      enum: ['in_process', 'revised', 'complete', 'failed'],
      default: 'in_process'
    },

    revision: { type: Number, default: 0 },

    statusHistory: [statusHistorySchema],

    notes: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

/* ======================================================
   AUTO-GENERATE QUOTATION NUMBER
====================================================== */
quotationSchema.pre('save', async function (next) {
  if (this.quotationNumber) return next();

  try {
    const now = new Date();
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[now.getMonth()];
    const year = String(now.getFullYear()).slice(-2);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const count = await mongoose.model('Quotation').countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

<<<<<<< HEAD
    this.quotationNumber = `QES/QT/${month}${year}/${String(count + 1).padStart(3, '0')}`;
=======
    this.quotationNumber = `QES/QT/${month}/${year}/${String(count + 1).padStart(3, '0')}`;
>>>>>>> b215e4a (pdf generation with terms editable update + tax update working + slash missing update)
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Quotation', quotationSchema);
