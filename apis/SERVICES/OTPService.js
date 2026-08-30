const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mailerService = require('./mailerService');
const Distributor = require('../MODALS/Distributor');
const Franchise = require('../MODALS/Franchise');
const ThemeUser = require('../MODALS/ThemeUser');
const Otp = require('../MODALS/Otp');
const { errorLogger } = require('../utils/logger');

let UserData = null;
try {
    UserData = require('../MODALS/userData');
} catch (_) {
    UserData = null;
}

const PANEL_MODELS = {
    distributor: Distributor,
    franchise: Franchise,
    theme: ThemeUser,
    user: UserData,
};

class OTPService {
    constructor() {
        this.expirationTime = 10 * 60 * 1000; // OTP validity: 10 minutes
        this.sendOTP = this.sendOTP.bind(this);
        this.verifyOTP = this.verifyOTP.bind(this);
    }

    resolveRole(req) {
        return String(req.panelRole || req.body?.role || 'distributor').toLowerCase();
    }

    getModel(role) {
        const Model = PANEL_MODELS[role];
        if (!Model) {
            throw new Error(`Unsupported panel role for OTP: ${role}`);
        }
        return Model;
    }

    generateOTP(length = 6) {
        const otp = crypto.randomInt(0, 10 ** length).toString().padStart(length, '0');
        const hash = bcrypt.hashSync(otp, 10);
        return { otp, hash };
    }

    async SendOTP(email, otp, action, name = '') {
        try {
            const subject = `Your OTP for ${(action || 'verification').replace(/_/g, ' ')}`;
            await mailerService.sendMail(email, subject, 'forgot-password-otp', {
                otp,
                action,
                name,
            });
        } catch (error) {
            errorLogger(error);
            throw new Error('Failed to send OTP email');
        }
    }

    isOTPExpired(timestamp) {
        return Date.now() > timestamp + this.expirationTime;
    }

    async findUser(req) {
        const role = this.resolveRole(req);
        const Model = this.getModel(role);
        const username = req.body?.username;
        if (req?.user?.uid != null) {
            const byUid = await Model.findOne({ uid: req.user.uid });
            if (byUid) return { user: byUid, role };
        }
        if (username) {
            const byUsername = await Model.findOne({ username });
            if (byUsername) return { user: byUsername, role };
        }
        return { user: null, role };
    }

    async sendOTP(req, res) {
        try {
            const { action } = req.body;
            if (!action) {
                return res.status(400).json({ message: 'action is required' });
            }

            const { user, role } = await this.findUser(req);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            if (!user.email) {
                return res.status(400).json({ message: 'No email on file for this account' });
            }

            const { otp, hash } = this.generateOTP();
            const otpModal = new Otp({
                uid: user.uid,
                otpCode: hash,
                createdAt: Date.now(),
                expiresAt: Date.now() + this.expirationTime,
                otpAction: action,
                status: 0,
            });

            await otpModal.save();
            await this.SendOTP(user.email, otp, action, user.name || user.username || '');

            res.status(200).json({
                message: `OTP for ${action} sent successfully`,
                role,
            });
        } catch (error) {
            errorLogger(error);
            res.status(500).json({
                message: 'Your Email ID not Valid For Send OTP',
                error: error.message,
            });
        }
    }

    async verifyOTP(req, res, next) {
        try {
            const role = this.resolveRole(req);
            const Model = this.getModel(role);

            if (req.path === '/forgot-password' || !req.user?.uid) {
                const userByName = await Model.findOne({ username: req.body.username });
                if (!userByName) {
                    return res.status(404).json({ message: 'User not found' });
                }
                req.user = { uid: userByName.uid, role };
            }

            const { uid } = req.user;
            const { otp, action } = req.body;
            const user = await Model.findOne({ uid });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const otpData = await Otp.findOne({ uid, status: 0, otpAction: action }).sort({
                createdAt: -1,
            });

            if (!otpData) {
                return res.status(404).json({ message: 'OTP not found or already used' });
            }

            if (this.isOTPExpired(otpData.createdAt)) {
                otpData.status = 1;
                await otpData.save();
                return res.status(400).json({ message: 'OTP expired' });
            }

            if (!otp || !otpData.otpCode) {
                return res.status(400).json({ message: 'Invalid OTP data' });
            }

            const isValid = await bcrypt.compare(otp, otpData.otpCode);
            if (!isValid) {
                return res.status(400).json({ message: 'Invalid OTP' });
            }

            otpData.status = 1;
            await otpData.save();
            req.panelRole = role;
            next();
        } catch (error) {
            errorLogger(error);
            res.status(500).json({ message: 'Error verifying OTP', error: error.message });
        }
    }
}

module.exports = new OTPService();
