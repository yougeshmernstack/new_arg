const advance_info = require("../MODALS/advanceInfo");
const validator = require("email-validator");
const PhoneNumber = require('libphonenumber-js');

const bcrypt = require('bcryptjs');
const passwordStrength = require('password-strength');
const { INVALID_USERNAME, INVALID_PANCARD,PANCARD_ALREADY_EXISTS,EMAIL_ALREADY_EXISTS, INVALID_EMAIL, MOBILE_NUMBER_ALREADY_EXISTS, INVALID_MOBILE_NUMBER, SPONSOR_NOT_ACTIVE, INVALID_SPONSOR, SPONSOR_REFERRAL_LIMIT_REACHED, PASSWORD_TOO_SHORT, PASSWORD_TOO_WEAK, INTERNAL_SERVER_ERROR } = require("./errorMessages");
const { errorLogger } = require("./logger");
const hashPassword = async (plaintextPassword) => {
    const hash = await bcrypt.hash(plaintextPassword, 10);
    return hash;
};

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateString(length) {
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
// Fallback registration settings when advance_info is not seeded in DB
const DEFAULT_REGISTRATION = {
    user_gen_method: { value: 'manual' },
    user_gen_prefix: { value: 'AGL' },
    user_gen_digit: { value: 6 },
    pass_gen_method: { value: 'manual' },
    pass_gen_fun: { value: 'strong' },
    pass_gen_digit: { value: 8 },
    is_password_required: { value: 'yes' },
};

async function getRegistrationSettings() {
    const doc = await advance_info.findOne().catch(() => null);
    const reg = doc?.Registration || {};
    return { ...DEFAULT_REGISTRATION, ...reg };
}

class FORM_VALIDATORS {
    async hashPassword(plaintextPassword) {
        const hash = await bcrypt.hash(plaintextPassword, 10);
        return hash;
    };
    async generateUserName(userName) {
        try { 
            // console.log("1",userName);
            const Registration = await getRegistrationSettings();
            const { user_gen_method, user_gen_prefix, user_gen_digit } = Registration;
            if (userName) {
                if (user_gen_method.value === "automatic") {
                    const number =
                        Math.floor(
                            Math.random() * ((10 ** (user_gen_digit.value) - 1) - 10 ** (user_gen_digit.value - 1) + 1) + 10 ** (user_gen_digit.value - 1)
                        );
                    const userNmae = `${user_gen_prefix.value}${number}`;
                    return { status: true, userName: userNmae };
                } else if (user_gen_method.value === "manual") {
                    var alfanum = /^[0-9a-zA-Z]+$/;
                    if (userName.match(alfanum)) {
                        return { status: true, userName };
                    } else {
                        return{status:false, ...INVALID_USERNAME};
                    }
                }
            } else {
                return{status:false, ...INVALID_USERNAME};
            }
        } catch (error) {
            errorLogger(error)
            return{status:false, ...INTERNAL_SERVER_ERROR};
        }
    }

    async generateAutomaticUserName(prefixOverride) {
        try {
            const Registration = await getRegistrationSettings();
            const { user_gen_prefix, user_gen_digit } = Registration;
            const prefix = prefixOverride || user_gen_prefix?.value || 'AGL';
            const digits = Number(user_gen_digit?.value) || 6;
            const min = 10 ** (digits - 1);
            const max = 10 ** digits - 1;
            const number = Math.floor(Math.random() * (max - min + 1)) + min;
            return { status: true, userName: `${prefix}${number}` };
        } catch (error) {
            errorLogger(error);
            return { status: false, ...INTERNAL_SERVER_ERROR };
        }
    }
    async isEmail(email) {
        try {
            const isEmail = await validator.validate(email);
            if (isEmail) {
                return { status: true };
            } else {
                return{status:false, ...INVALID_EMAIL};;
            }
        } catch (error) {
            errorLogger(error)
            return{status:false, ...INTERNAL_SERVER_ERROR};
        }
    }
  
    async  isPanCard(pancard) {
        try {
            return { status: true };
        } catch (error) {
            errorLogger(error);
            return { status: false, ...INTERNAL_SERVER_ERROR };
        }
    }
    
    async isMobile(mobile, countryCode) {
        try {
            const phoneNumber = await PhoneNumber(mobile, countryCode); // Change the country code according to your needs
            console.log('phoneNumber', phoneNumber,mobile,countryCode)
            if (phoneNumber) {
                return { status: true };
            } else {
                return{status:false, ...INVALID_MOBILE_NUMBER}; 
            }
        } catch (error) {
            errorLogger(error)
            return{status:false, ...INTERNAL_SERVER_ERROR};
        }
    }
    async sponsor(sponsor) {
        try {
            return{status:false, ...INVALID_SPONSOR}; 
        } catch (error) {
            errorLogger(error)
            return{status:false, ...INTERNAL_SERVER_ERROR};
        }
    }
    async generatePassword(password) {
        try {
            const Registration = await getRegistrationSettings();
            const { pass_gen_method, pass_gen_fun, pass_gen_digit, is_password_required } = Registration;

            if (is_password_required.value === "yes") {
                if (pass_gen_method.value === "automatic") {
                    return generateString(pass_gen_digit.value);
                } else if (pass_gen_method.value === "manual") {
                    if (pass_gen_fun.value === "basic") {
                        if (password && password.length >= 4) {
                            return { status: true, password };
                        } else {
                            return{status:false, ...PASSWORD_TOO_SHORT};
                        }
                    } else if (pass_gen_fun.value === "strong") {
                        if (password && password.length >= 8) {
                            return { status: true, password };
                        } else {
                            return{status:false, ...PASSWORD_TOO_SHORT}; 
                        }
                    } else if (pass_gen_fun.value === "strongest") {
                        const isStrong = await passwordStrength(password);
                        if (isStrong === "Strong") {
                            return { status: true, password };
                        } else {
                            return{status:false, ...PASSWORD_TOO_WEAK};
                        }
                    }
                }
            } else {
                return { status: true, password: null };
            }
        } catch (error) {
            errorLogger(error)
            return{status:false, ...INTERNAL_SERVER_ERROR};
        }
    }

    

}
const form_validator = new FORM_VALIDATORS();
module.exports = form_validator;