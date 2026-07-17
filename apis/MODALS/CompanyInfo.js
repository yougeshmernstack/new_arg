const mongoose = require('mongoose');

// Define the schema
const companySchema = new mongoose.Schema({
  companyName: {
    type: String,
    default :'BHARAT BATTERIES' },
  address: {
    street: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    country: {
      type: String,
    },
    postalCode: {
      type: String,
    }
  },
  contactInfo: {
    phone: {
      type: String,
    },
    email: {
      type: String,
    },
    website: {
      type: String,
      default:'https://bharatbatteries.info'
    }
  },
  taxInfo: {
    pan: {
      type: String,
    },
    gst: {
      type: String,
    },
    tan: {
      type: String,
    }
  },
  ceo: {
    type: String,
  },
  directors: [
    {
      name: {
        type: String,
      },
      position: {
        type: String,
      }
    }
  ],
currency:{
    type:String,
    default:'USDT'
},
token:{
    type:String,
    default:'USDT'
},
currency_sign:{
    type:String,
    default:'$'
},
token_sign:{
    type:String,
    default:'$'
},
coin_buy_price:{
  type:Number,
  default:'0.15'
},
coin_sell_price:{
  type:Number,
  default:'0.09'
},
principal_withdrawal_status: {
  type: Number,
  enum: [0, 1],
  default: 1
},
  broadCast: {
    message: {
      type: String,
    },
    status: {
      type: Number,
      default:0
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  tokens: {
    type: [
      {
        address: {
          type: String,
          required: true
        },
        enabled: {
          type: Number,
          enum: [0, 1],
          default: 1
        },
        tokenName: {
          type: String,
          required: true
        },
        tokenSymbol: {
          type: String,
          required: true
        },
      }
    ],
    default: [
      {
        address: '0x771d76a2F35b8809119cc712cD9010A19164DFad',
        enabled: 1,
        tokenName: 'USDT',
        tokenSymbol: 'USDT',
        token_image: 'https://bharatbatteries.eracom.in/company_image/usdt.png',
      }
      
    ]
  },

});

// Middleware to update `updated_at` on document update
companySchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create the model from the schema
const Company = mongoose.model('CompanyInfo', companySchema);

module.exports = Company;
