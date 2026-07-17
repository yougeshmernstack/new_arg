const merchantId = process.env.MERCHANT_ID;
const merchantKey = process.env.MERCHANT_KEY;
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const gameData = require('../../MODALS/games');
const { INTERNAL_SERVER_ERROR } = require('../../utils/errorMessages');
const apiUrl = process.env.API_URL;
const fs = require('fs');
const path = require('path');
const { errorLogger } = require('../../utils/logger');
function generateNonce() {
    return Math.random().toString(36).substring(2); // Random string
}
const fileExists = filePath => fs.existsSync(path.join(__dirname, '../../', filePath));
function generateSignature(queryString, merchantKey) {
    const hmac = crypto.createHmac('sha1', merchantKey);
    hmac.update(queryString);
    const hashedSignature = hmac.digest('hex');
    return hashedSignature;
}
function sortObject(obj) {
    return Object.keys(obj).sort().reduce((acc, key) => {
        acc[key] = obj[key];
        return acc;
    }, {});
}
class GAMES {

    async generateNonce() {
        return Math.random().toString(36).substring(2); // Random string
    }
    async generateSignature(queryString, merchantKey) {
        const hmac = crypto.createHmac('sha1', merchantKey);
        hmac.update(queryString);
        const hashedSignature = hmac.digest('hex');
        return hashedSignature;
    }
    async sortObject(obj) {
        return Object.keys(obj).sort().reduce((acc, key) => {
            acc[key] = obj[key];
            return acc;
        }, {});
    }
    async game1(page) {
        const games = []
        //    for (let index = 1; index < 76; index++) {
        try {

            const timestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
            const nonce = generateNonce();
            const params = {
                'X-Merchant-Id': merchantId,
                'X-Timestamp': timestamp,
                'X-Nonce': nonce,
                page
            };
            const sortedParams = sortObject(params);
            const queryString = new URLSearchParams(sortedParams).toString();

            // Generating the signature using the sorted query string
            const signature = generateSignature(queryString, merchantKey);
            // Creating the headers object
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Merchant-Id': merchantId,
                'X-Timestamp': timestamp,
                'X-Nonce': nonce,
                'X-Sign': signature
            };
            console.log('headers', headers)
            const response = await axios.get(`${apiUrl}/games`, { params, headers });
            const gamesWithMappedUID = response.data.items.map(game => {
                return {
                    ...game,
                    g_uid: game.uuid // Map uuid to g_uid
                };
            });
            const result = await gameData.insertMany(gamesWithMappedUID);
            console.log('1111111111111111111111111111111111111111111111111', result);
            return response.data;
        } catch (error) {
            errorLogger(error)
            console.error('Error making API call:', error);
            // throw error;
        }
        //    }
        console.log(games.length);


    }
    async all_games(req, res) {
        try {
            const { type, count, provider } = req.body;
            const query = {};
            if (provider ?? false) {
                query.provider = provider;
            }
            if (type ?? false) {
                query.type = type;
            }
            console.log(query)
            const data = await gameData.find(query).limit(Number(count))
            return res.status(200).json(data);
        } catch (error) {
            errorLogger(error)
            console.error('Error making API call:', error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR })
            // throw error;
        }
    }
    async game_init(req, res) {
        try {
            const { game_uuid, username, name, currency, return_url } = req.body;
            console.log(req.body)
            const session_id = uuidv4();
            const timestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
            const nonce = Math.random().toString(36).substring(2);
            const params = {
                'X-Merchant-Id': merchantId,
                'X-Timestamp': timestamp,
                'X-Nonce': nonce,
                game_uuid,
                player_id: username,
                player_name: name,
                currency,
                technology: 'HTML5',
                session_id,
                // return_url,
            };
            const sortedParams = sortObject(params)
            const queryString = new URLSearchParams(sortedParams).toString();
            const signature = generateSignature(queryString, merchantKey);
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Merchant-Id': merchantId,
                'X-Timestamp': timestamp,
                'X-Nonce': nonce,
                'X-Sign': signature,
            };
            const { data } = await axios.post(`${apiUrl}/games/init`, params, { headers });
            // console.log(response.data);
            return res.status(200).json({ data })
        } catch (error) {
            errorLogger(error)
            console.log(error)
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR })
        }

    }
    async active_game() {
        try {
            const bet_providers = [
                "Spribe",
                "Evolution",
                "SmartSoft",
                "Ezugi",
                "ThreeOaks",
                "Spinomenal",
                "Playson",
                "Aviatrix",
                "Endorphina",
                "BGaming",
                "Platipus",
                "Betgames",
                "Gamzix",
                "Vivogaming",
                "Blueprint"
            ]
            for (let index = 0; index < bet_providers.length; index++) {
                const element = bet_providers[index];
                const updateStatus = await gameData.findOneAndUpdate({ provider: element, status: 0, type: 'roulette' }, { status: 1 })
            }
            return;
        } catch (error) {
            errorLogger(error)
            console.log(error);
            return error;
        }
    }
    async self_validation(req, res) {
        try {

            const timestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
            const nonce = generateNonce();
            const params = {
                'X-Merchant-Id': merchantId,
                'X-Timestamp': timestamp,
                'X-Nonce': nonce
            };
            const sortedParams = sortObject(params);
            const queryString = new URLSearchParams(sortedParams).toString();

            // Generating the signature using the sorted query string
            const signature = generateSignature(queryString, merchantKey);
            // Creating the headers object
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Merchant-Id': merchantId,
                'X-Timestamp': timestamp,
                'X-Nonce': nonce,
                'X-Sign': signature
            };
            // console.log('headers',headers)
            const response = await axios.post(`${apiUrl}/self-validate`, params, { headers });

            // console.log('111111111111111 self-validate 111111111111111111111111', response);
            const filePath = 'response.json';
            try {
                fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2), 'utf-8');
                console.log('Response saved to file:', filePath);

            } catch (error) {
            errorLogger(error)
                console.log('ERRor saved to file:', error)
            }
            return res.status(200).json(response.data)
        } catch (error) {
            errorLogger(error)
            console.error('Error making API call:', error);
            // throw error;
        }
    }

    async getProvider(req, res) {
        try {
            const providers = await gameData.distinct('provider', { status: 1 });

            // Base URL
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            console.log(__dirname)
            // Map providers to include logos
            const providersWithLogos = providers.map(provider => {
                const logoPath = `/uploads/${provider}.png`;
                return {
                    provider,
                    provider_logo: fileExists(logoPath) ? `${baseUrl}/${provider}.png` : `${baseUrl}/defaultprovider.svg`
                };
            });

            return res.status(200).json(providersWithLogos)
        } catch (error) {
            errorLogger(error)
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR })
        }
    }
}

const GAME = new GAMES();
module.exports = GAME;