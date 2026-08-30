const mongoose = require('mongoose')
// const validator = require('validator')


const advanceInfoSchema = new mongoose.Schema({
    Registration: {
        send_email: {
            type: String,
            default: 0
        },
        mobile_users: {
            title: {
                type: String,
                default: "Max Mobile Per Users"
            },
            value: {
                type: Number,
                default: 1000
            }
        },
        email_users: {
            title: {
                type: String,
                default: "Max Email Per Users"
            },
            value: {
                type: Number,
                default: 1000
            }
        },
        country_code: {
            title: {
                type: String,
                default: "Is required Country code"
            },
            options: {
                type: String,
                default: "yes,no"
            },
            value: {
                type: String,
                default: "no"
            }
        },
        user_gen_method: {
            title: {
                type: String,
                default: "UserName Generation Method"
            },
            options: {
                type: String,
                default: "automatic,manual"
            },
            value: {
                type: String,
                default: "automatic"
            }
        },
        user_gen_fun: {
            title: {
                type: String,
                default: "UserName Generation Function"
            },
            options: {
                type: String,
                default: "{alnum:Alpha-Numeric,numeric:Numeric Only}"
            },
            value: {
                type: String,
                default: "numeric"
            }
        },
        user_gen_digit: {
            title: {
                type: String,
                default: "UserName Generation Digit"
            },
            value: {
                type: Number,
                default: 6
            }
        },
        user_gen_prefix: {
            title: {
                type: String,
                default: "UserName Generation Prefix"
            },
            value: {
                type: String,
                default: 'ARG'
            }
        },
        pass_gen_method: {
            title: {
                type: String,
                default: "Password Generation Type"
            },
            options: {
                type: String,
                default: "automatic,manual"
            },
            value: {
                type: String,
                default: "manual"
            }
        },
        pass_gen_fun: {
            title: {
                type: String,
                default: "Password Generation Function"
            },
            options: {
                type: String,
                default: "basic,strong,strongest"
            },
            value: {
                type: String,
                default: "basic"
            }
        },
        pass_gen_digit: {
            title: {
                type: String,
                default: "Password Generation Digit"
            },
            value: {
                type: Number,
                default: 6
            }
        },
        is_password_required: {
            title: {
                type: String,
                default: "Is passward required"
            },
            options: {
                type: String,
                default: "yes,no"
            },
            value: {
                type: String,
                default: "yes"
            }
        },
        is_mobile_required: {
            title: {
                type: String,
                default: "Is mobile required"
            },
            options: {
                type: String,
                default: "yes,no"
            },
            value: {
                type: String,
                default: "yes"
            }
        },
        is_email_required: {
            title: {
                type: String,
                default: "Is email required"
            },
            options: {
                type: String,
                default: "yes,no"
            },
            value: {
                type: String,
                default: "no"
            }
        },
        is_pancard_required: {
            title: {
                type: String,
                default: "Is pancard required"
            },
            options: {
                type: String,
                default: "yes,no"
            },
            value: {
                type: String,
                default: "no"
            }
        },
        is_sponsor_active_required: {
            title: {
                type: String,
                default: "Is sponsor active required"
            },
            options: {
                type: String,
                default: "yes,no"
            },
            value: {
                type: String,
                default: "no"
            }
        },
        is_sponsor_required: {
            title: {
                type: String,
                default: "Is sponsor required"
            },
            options: {
                type: String,
                default: "yes,no"
            },
            value: {
                type: String,
                default: "yes"
            }
        },
    },
    Investment: {
        topup_type: {
            title: {
                type: String,
                default: "Topup"
            },
            options: {
                type: String,
                default: "pin,fund,dap,API"
            },
            value: {
                type: String,
                default: "fund"
            }
        },
        re_topup_type: {
            title: {
                type: String,
                default: "Re-topup type"
            },
            options: {
                type: String,
                default: "pin,fund,dap"
            },
            value: {
                type: String,
                default: "fund"
            }
        },
        allowPackageRepurchase: {
            title: {
                type: String,
                default: "allow user to purchase same package again and again"
            },
            options: {
                type: String,
                default: "yes,no"
            },
            value: {
                type: String,
                default: "yes"
            }
        }

    },
   
        withdrawal: {
            instantwithdrawal: {
                type: Number,
                default: 0
            },
            main_wallet: {
                status: {
                    type: Number,
                    default: 1
                },
                min_withdrawal: {
                    type: Number,
                    default: 10
                },
                max_withdrawal: {
                    type: Number,
                    default: 1e18
                },
                service_tax: { 
                    type: Number, 
                    default: 0 
                },
                TDS: { 
                    type: Number, 
                    default: 0 
                },
                withdrawal_dates:{
                    checkRequired:{
                        type: Number,
                        enum:[0,1],
                        default: 0
                    },
                    dates:{
                        type:[Number],
                        default:[30]
                    }
                },
                otpRequired:{
                    type: Number,
                    enum:[0,1],
                    default: 0
                }
            },
            
        },
        Team: {
            max_level_team_count: {
                title: {
                    type: String,
                    default: "Maximum Level Team Count"
                },
                value: {
                    type: Number,
                    default: 1000 // You can set the default to any number you want
                }
            },
    
        },
        support_ticket_types: [
            {
                title: {
                    type: String,
                    required: true
                },
                value: {
                    type: String,
                    required: true,
                    unique: true
                }
            }
        ]


})
const advance_info = new mongoose.model('advance_info', advanceInfoSchema)
module.exports = advance_info