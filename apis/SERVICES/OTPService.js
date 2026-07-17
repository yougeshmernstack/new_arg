const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mailerService = require('./mailerService');
const UserData = require('../MODALS/userData');
const Otp = require('../MODALS/Otp');
const { errorLogger } = require('../utils/logger');

class OTPService {
    constructor() {
        this.expirationTime = 10 * 60 * 1000; // OTP validity: 10 minutes
        this.sendOTP = this.sendOTP.bind(this);
        this.verifyOTP = this.verifyOTP.bind(this);
    }

    // Generates an OTP and its hashed version
    generateOTP(length = 6) {
        const otp = crypto.randomInt(0, 10 ** length).toString().padStart(length, '0');
        const hash = bcrypt.hashSync(otp, 10);
        return { otp, hash };
    }

    // Sends the OTP to the user via email using the mailer service
    async SendOTP(email, otp, action) {
        try {
            const subject = `Your OTP for ${action}`;
            const template = 'otpEmail';
            const data = { otp, action };
            await mailerService.sendMail(email, subject, template, data);
        } catch (error) {
            errorLogger(error);
            throw new Error('Failed to send OTP email');
        }
    }

    // Checks if the OTP has expired based on the timestamp
    isOTPExpired(timestamp) {
        return Date.now() > timestamp + this.expirationTime;
    }

    // API function to send an OTP
    async sendOTP(req, res) {
        try {
            console.log(req.body);
            const { email, action,username } = req.body;
            const user = await UserData.findOne({
                $or: [{ uid: req?.user?.uid }, { username: username }]
            });

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const { otp, hash } = this.generateOTP();
            const otpModal = new Otp({
                uid:user.uid,
                otpCode: hash,
                createdAt: Date.now(),
                expiresAt: Date.now() + this.expirationTime,
                otpAction: action,
                status: 0 // Status 0 means OTP is active and unused
            });

            await otpModal.save();
            await this.SendOTP(user.email, otp, action);

            res.status(200).json({ message: `OTP for ${action} sent successfully` });
        } catch (error) {
            errorLogger(error);
            res.status(500).json({ message: 'Your Email ID not Valid For Send OTP', error: error.message });
        }
    }

    // API function to verify an OTP
    async verifyOTP(req, res, next) {
        try {
            if (req.path=='/forgot-password') {
            const user = await UserData.findOne({ username:req.body.username });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            req.user={uid:user.uid}
            }

            const { uid } = req.user;
            const { otp, action } = req.body;
            console.log(req.body)
            const user = await UserData.findOne({ uid });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const otpData = await Otp.findOne({ uid, status: 0, otpAction: action }).sort({ createdAt: -1 });

            if (!otpData) {
                return res.status(404).json({ message: 'OTP not found or already used' });
            }

            if (this.isOTPExpired(otpData.createdAt)) {
                otpData.status = 1; // Mark OTP as expired
                await otpData.save();
                return res.status(400).json({ message: 'OTP expired' });
            }

            // Ensure both OTP and hashed OTP are defined before comparison
            console.log(otp,otpData,'...............',otpData.otpCode)
            if (!otp || !otpData.otpCode) {
                return res.status(400).json({ message: 'Invalid OTP data' });
            }

            // Compare the provided OTP with the hashed OTP from the database
            const isValid = await bcrypt.compare(otp, otpData.otpCode);
            if (!isValid) {
                return res.status(400).json({ message: 'Invalid OTP' });
            }

            // Mark OTP as used
            otpData.status = 1;
            await otpData.save();

            // Generate JWT token after successful OTP verification
            // const token = jwt.sign({ id: uid }, process.env.JWT_SECRET, { expiresIn: '15m' });

            // Attach the token to the request object
            // req.token = token;

            // Call the next middleware or route handler
            next();
        } catch (error) {
            errorLogger(error);
            res.status(500).json({ message: 'Error verifying OTP', error: error.message });
        }
    }
}

module.exports = new OTPService();
