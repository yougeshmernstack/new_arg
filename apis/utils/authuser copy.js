const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const user_api_key = process.env.USER_API_KEY;
const user_merchant_key = process.env.USER_MERCHANT_KEY;
const CryptoJS = require('crypto-js');
const { MISSING_AUTH_TOKEN, TOKEN_EXPIRED, FORBIDDEN } = require('./errorMessages');
const { errorLogger } = require('./logger');
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
            console.log(signature, expectedSign)
            if (signature !== expectedSign) {
                return res.status(401).send('Unauthorized: Invalid signature');
            }
            next()
        } else {
            res.status(401).send('Unauthorized');
        }
    }

    /**
     * Generate a preview token for users that only allows GET requests
     * @param {Object} user - User object containing necessary identification info
     * @param {string} [duration='24h'] - Token expiry duration
     * @returns {string} JWT token with preview access
     */
    generatePreviewToken(user, duration = '24h') {
        const secretKey = process.env.PREVIEW_JWT_KEY || process.env.JWT_KEY;
        
        // Extract only necessary user information
        const tokenPayload = {
            userId: user.userId,
            username: user.username,
            email: user.email,
            role: 'preview', // Assign a preview role
            isPreviewToken: true, // Flag to identify preview tokens
            permissions: ['read'] // Only read permissions
        };
        
        // Generate token with specified duration
        const token = jwt.sign(
            tokenPayload,
            secretKey,
            { expiresIn: duration }
        );
        
        return token;
    }

    async authenticateToken(req, res, next, router) {
        const token = req.headers.authorization;
        
        // Define paths that don't require authentication
        const allowedPaths = ['/register', '/login', '/forgot-password', '/register-with-dap', 
                            '/login-with-dap', '/get_all_games', '/webhooks/slotegrator/v1/transactions/execute', 
                            '/get_all_providers', '/get_page', '/check_username'];
        
        // Skip authentication for allowed paths
        if (allowedPaths.includes(req.path)) {
            next();
            return;
        }
        
        console.log(req.path);
        
        // Special case for send-otp with forgot_password action
        if (req.path == '/send-otp' && req.body.action == 'forgot_password') {
            next();
            return;
        }
        
        if (!token) {
            return res.status(401).json({...MISSING_AUTH_TOKEN});
        }
        
        const secretKey = process.env.JWT_KEY;
        const previewSecretKey = process.env.PREVIEW_JWT_KEY || process.env.JWT_KEY;
        
        try {
            // First attempt to verify as normal token
            jwt.verify(token, secretKey, (err, decoded) => {
                if (!err) {
                    // Regular token verification successful
                    req.user = decoded;
                    if (decoded.role !== router) {
                        return res.status(403).json({...FORBIDDEN});
                    }
                    next();
                    return;
                }
                
                // If normal verification fails, try as preview token
                jwt.verify(token, previewSecretKey, (previewErr, previewDecoded) => {
                    if (previewErr) {
                        // Both verifications failed
                        return res.status(403).json({...TOKEN_EXPIRED});
                    }
                    
                    // Preview token verification successful
                    if (!previewDecoded.isPreviewToken) {
                        return res.status(403).json({...FORBIDDEN});
                    }
                    
                    // Check if the request is a GET method
                    if (req.method !== 'GET') {
                        return res.status(403).json({
                            status: false,
                            code: 'PREVIEW_TOKEN_GET_ONLY',
                            message: 'Preview token can only be used for GET requests'
                        });
                    }
                    
                    // Add user info from preview token but mark as preview
                    req.user = previewDecoded;
                    req.isPreviewUser = true;
                    next();
                });
            });
        } catch (error) {
            errorLogger.error("Token verification error:", error);
            return res.status(500).json({
                status: false,
                code: 'INTERNAL_ERROR',
                message: 'An error occurred during authentication'
            });
        }
    }
}

module.exports = Authenticator;