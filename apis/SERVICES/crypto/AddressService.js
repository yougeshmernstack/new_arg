const { ethers } = require('ethers');
const TronWebModule = require('tronweb');

function resolveTronWebConstructor(mod) {
    if (!mod) return null;
    if (typeof mod === 'function') return mod; // CJS exports a constructor function
    if (typeof mod.default === 'function') return mod.default; // ESM default export
    if (typeof mod.TronWeb === 'function') return mod.TronWeb; // Named export
    return null;
}
const crypto = require('crypto');
const PaymentAddress = require('../../MODALS/PaymentAddress'); // Import the schema

class AddressService {

    constructor() {
        const TronWebCtor = resolveTronWebConstructor(TronWebModule);
        if (TronWebCtor) {
            this.tronWeb = new TronWebCtor({ fullHost: 'https://api.trongrid.io' });
            return;
        }
        // Fallback: some builds may export a factory function (very rare)
        if (typeof TronWebModule === 'function') {
            this.tronWeb = TronWebModule({ fullHost: 'https://api.trongrid.io' });
            return;
        }
        const availableKeys = Object.keys(TronWebModule || {});
        throw new TypeError(`Unsupported tronweb export shape; available keys: ${availableKeys.join(', ')}`);
    }

    // Generate a Random Private Key
    generatePrivateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Generate BEP20 Address
    generateBEP20Address(privateKey) {
        const wallet = new ethers.Wallet('0x' + privateKey);
        return wallet.address;
    }

    // Generate TRC20 Address
    generateTRC20Address(privateKey) {
        return this.tronWeb.address.fromPrivateKey(privateKey);
    }

    // Generate Both Addresses from the Same Private Key
    generateAddressesFromPrivateKey(privateKey) {
        const bep20Address = this.generateBEP20Address(privateKey);
        const trc20Address = this.generateTRC20Address(privateKey);
        return {
            bep20Address,
            trc20Address,
            privateKey,
        };
    }

    // Generate Random Private Key and Derive Both Addresses
    generateAddressesAndPrivateKey() {
        const privateKey = this.generatePrivateKey();
        return this.generateAddressesFromPrivateKey(privateKey);
    }

    // Check for existing addresses or generate new ones
    async generateOrRetrieveAddress(uid) {
        // Check if addresses already exist for the user
        let existingAddress = await PaymentAddress.findOne({ uid });
        if (existingAddress) {
            console.log(`Addresses already exist for user ${uid}`);
            return {
                bep20Address: existingAddress.bep20?.address,
                trc20Address: existingAddress.trc20?.address,
                privateKey: existingAddress.privateKey,
            };
        }

        // Generate new private key and addresses
        const privateKey = this.generatePrivateKey();
        const bep20Address = this.generateBEP20Address(privateKey);
        const trc20Address = this.generateTRC20Address(privateKey);

        // Save the generated addresses in the database
        const newPaymentAddress = new PaymentAddress({
            uid,
            privateKey, // Store encrypted private key if necessary
            bep20: { address: bep20Address },
            trc20: { address: trc20Address },
        });

        await newPaymentAddress.save();
        console.log(`New addresses generated and saved for user ${uid}`);

        return {
            bep20Address,
            trc20Address,
            privateKey
        };
    }
}

const addressService = new AddressService();
module.exports = addressService;
