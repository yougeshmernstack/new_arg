const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const user_api_key = process.env.USER_API_KEY;
const user_merchant_key = process.env.USER_MERCHANT_KEY;
const CryptoJS = require('crypto-js');
const { MISSING_AUTH_TOKEN, TOKEN_EXPIRED, FORBIDDEN } = require('./errorMessages');
const { errorLogger } = require('./logger');
const { PermissionRoute } = require('../MODALS/Permission');
const UserData = require('../MODALS/userData');
const merchantKey = process.env.MERCHANT_KEY;
class Authenticator {
    constructor() {
        this.apiKeys = new Map();
        this.usedNonces = new Set();
        this.userPermissions = {
            read: ['/api/resource'],
            write: ['/api/resource', '/api/modify'],
        };
    }
     generateSignature(queryString, merchantKey) {
        const hmac = CryptoJS.HmacSHA256(queryString, merchantKey);
        return CryptoJS.enc.Base64.stringify(hmac);
    }
    authenticate(req, res, next) {
        const apiKey = req.headers['x-api-key'];
        const timestamp = parseInt(req.headers['x-timestamp'], 10);
        const nonce = req.headers['x-nonce'];
        const signature = req.headers['x-sign'];
        if (user_api_key === apiKey) {
            const currentTime = Math.floor(Date.now() / 1000);
            const timestampWindow = 60;
            if (Math.abs(currentTime - timestamp) > timestampWindow) {
                return res.status(401).send('Unauthorized: Timestamp is not within acceptable range');
            }
            if (this.usedNonces.has(nonce)) {
                return res.status(401).send('Unauthorized: Nonce has already been used');
            }
            const headers = {
                'x-api-key': req.headers['x-api-key'],
                'X-Timestamp': req.headers['x-timestamp'],
                'X-Nonce': req.headers['x-nonce'],
            };
            const mergedParams = Object.assign({}, req.body, headers);
            const sortedParams = Object.keys(headers).sort().reduce((obj, key) => {
                obj[key] = headers[key];
                return obj;
            }, {});
            const queryString = new URLSearchParams(sortedParams).toString();
            const expectedSign = this.generateSignature(queryString, user_merchant_key)
            console.log(signature,expectedSign)
            if (signature !== expectedSign) {
                return res.status(401).send('Unauthorized: Invalid signature');
            }
            next()
        } else {
            res.status(401).send('Unauthorized');
        }
    }

async authenticateToken(req, res, next, route_For) {
    try {
        // Special case for OTP (bypass authentication)
        if (req.path === '/send-otp' && req.body.action === 'forgot_password') {
            return next();
        }

        // Special case for forgot-password (bypass authentication)
        if (req.path === '/forgot-password') {
            return next();
        }

        // One-time wellness permission seeder (bootstrap)
        if (req.path === '/seed-wellness-permissions' && req.method === 'POST') {
            return next();
        }

        // console.log("Checking route:", req.path);
        // 🔍 **Check if the route exists in permissions**
        const permission = await PermissionRoute.findOne({
            route: req.path, // Directly checking req.path
            routeFor: route_For, // Change to dynamic if needed
            method: { $regex: new RegExp(`^${req.method}$`, "i") } // Case-insensitive match for method
        });
        
        console.log("Checking route:",permission);
        if (!permission) {
            return res.status(403).json({
                success: false,
                message: "No permission defined for this route",
                details: `Route: ${req.path}, Method: ${req.method}`
            });
        }

        if (permission.roles.includes('public')) {
            return next(); 
        }

        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: "Missing authentication token" });
        }

        // 🔍 **Verify the JWT token**
        const secretKey = process.env.JWT_KEY;
        let decoded;
        try {
            decoded = jwt.verify(token, secretKey);
            console.log("Decoded User:", decoded.uid);
        } catch (jwtError) {
            console.log("Error verifying token:", jwtError.message);
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        // Fetch user data from the database to get roles
        const user = await UserData.findOne({ uid: decoded.uid });
        if (!user) {
            console.log("User not found in database for UID:", decoded.uid);
            return res.status(403).json({ message: "User not found" });
        }

        // Check for inactivity-based token expiration (for all roles)
        const INACTIVITY_TIMEOUT_MINUTES = parseInt(process.env.INACTIVITY_TIMEOUT_MINUTES) || 5;
        const INACTIVITY_TIMEOUT = INACTIVITY_TIMEOUT_MINUTES * 60 * 1000; // Convert minutes to milliseconds
        const now = new Date();
        
        if (user.lastActivity) {
            const timeSinceLastActivity = now - new Date(user.lastActivity);
            if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
                return res.status(401).json({ 
                    message: "Session expired due to inactivity. Please login again.",
                    code: "TOKEN_EXPIRED_INACTIVITY"
                });
            }
        }
        
        // Update lastActivity timestamp
        await UserData.updateOne({ uid: decoded.uid }, { $set: { lastActivity: now } });

        req.user = decoded; // Attach user info to the request

        // Check if user's roles match any of the required roles
        if (user.roles.some(role => permission.roles.includes(role))) {
            return next(); // Allow access if roles match
        }

        return res.status(403).json({
            success: false,
            message: "No Permission",
            details: `User Roles: ${user.roles.join(', ')}, Required Roles: ${permission.roles.join(', ')}`
        });

    } catch (error) {
        console.log("Error occurred during token authentication:", error.message);
        return res.status(500).json({
            message: "Token verification failed",
            error: error.message
        });
    }
}

async SlotegratorAuth(req,res,next){
    // console.log('object here',req.body)
    try {
        const headers = {
            'X-Merchant-Id': req.headers['x-merchant-id'],
            'X-Timestamp': req.headers['x-timestamp'],
            'X-Nonce': req.headers['x-nonce'],
        };
        const mergedParams = Object.assign({}, req.body, headers);
        const sortedParams = Object.keys(mergedParams).sort().reduce((obj, key) => {
            obj[key] = mergedParams[key];
            return obj;
        }, {});
        const queryString = new URLSearchParams(sortedParams).toString();
        const hmac = crypto.createHmac('sha1', merchantKey);
        hmac.update(queryString);
        const expectedSign = hmac.digest('hex');
        if (req.headers['x-sign'] !== expectedSign) {
            console.log('expectedSign',expectedSign,req.headers['x-sign']);
            console.log('x-sign');
            return res.status(200).json({
                error_code: 'INTERNAL_ERROR',
                error_description: 'Invalid signature'
            });
        }else{
            if (req.body && req.body['rollback_transactions[0][transaction_id]']) {
                const rollbackTransactions = [];
                let index = 0;
        
                while (req.body[`rollback_transactions[${index}][transaction_id]`]) {
                    rollbackTransactions.push({
                        action: req.body[`rollback_transactions[${index}][action]`],
                        amount: req.body[`rollback_transactions[${index}][amount]`],
                        transaction_id: req.body[`rollback_transactions[${index}][transaction_id]`],
                        type: req.body[`rollback_transactions[${index}][type]`],
                    });
                    index++;
                }
        
                req.body.rollback_transactions = rollbackTransactions;
            }
            next()
        }
      
    } catch (error) {
            errorLogger(error)
        console.log(error)
    }
}
}

const authenticator = new Authenticator();
module.exports = authenticator;
// // Apply authentication middleware to relevant routes
// app.use('/api/resource', authenticator.authenticate.bind(authenticator));
// app.use('/api/modify', authenticator.authenticate.bind(authenticator));

// // Define your API endpoints
// app.get('/api/resource', (req, res) => {
//     res.send('Resource accessed successfully');
// });

// app.post('/api/modify', (req, res) => {
//     console.log('Data received:', req.body);
//     res.send('Resource modified successfully');
// });

// Route to generate API key and secret for a new user


// Start the server
// const port = 3000;
// app.listen(port, () => {
//     console.log(`Server is running on http://localhost:${port}`);
// });
