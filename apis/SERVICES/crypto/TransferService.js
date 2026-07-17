const { ethers, Wallet, Contract, parseUnits } = require('ethers');
require('dotenv').config();
const TronWebModule = require('tronweb');
function resolveTronWebConstructor(mod) {
    if (!mod) return null;
    if (typeof mod === 'function') return mod;
    if (typeof mod.default === 'function') return mod.default;
    if (typeof mod.TronWeb === 'function') return mod.TronWeb;
    return null;
}
const tokenAddress= process.env.TOKEN_ADDRESS;
const network= process.env.NETWORK;
const FEE_WALLET= process.env.FEE_WALLET;
const PROVIDER= process.env.PROVIDER;

class TransferService {
    constructor() {
        // Initialize TronWeb for TRC20 (handle different export shapes)
        const TronWebCtor = resolveTronWebConstructor(TronWebModule);
        if (TronWebCtor) {
            this.tronWeb = new TronWebCtor({ fullHost: 'https://api.trongrid.io' });
        } else if (typeof TronWebModule === 'function') {
            this.tronWeb = TronWebModule({ fullHost: 'https://api.trongrid.io' });
        } else {
            const availableKeys = Object.keys(TronWebModule || {});
            throw new TypeError(`Unsupported tronweb export shape; available keys: ${availableKeys.join(', ')}`);
        }
        this.provider = ethers.getDefaultProvider(PROVIDER);
        this.feeWalletKey = FEE_WALLET;

    }

    async autowithdraw(toAddress, amount) {
        try {
            const wallet = new Wallet(this.feeWalletKey, this.provider);
    
            const abi = [
                "function decimals() view returns (uint8)",
                "function transfer(address to, uint256 value) public returns (bool)"
            ];
            const contract = new Contract(tokenAddress, abi, wallet);
    
            const decimals = await contract.decimals();
            const parsedAmount = parseUnits(amount.toString(), decimals);

            const tx = await contract.transfer(toAddress, parsedAmount);
            const receipt = await tx.wait();
    
            return receipt;
        } catch (err) {
            console.error('Error in BEP20 Transfer:', err);
            throw err;
        }
    }

  
    
    async transferFee(toAddress, network) {
        const transferService = new TransferService();
        if (network === 'bep20') {
            let bnbBalance = await transferService.getBNBBalance(toAddress);
            console.log("Fee", bnbBalance);
            if (bnbBalance < 0.0005) {
                await transferService.transferCoin('0x' + this.feeWalletKey, toAddress, 0.0004, network);
                console.log(`Pre-funded BNB to ${toAddress}`);
            } else {
                console.log("Already have sufficent fee");
            }
        } else if (network === 'trc20') {
            if (transferService.getTRXBalance(toAddress) < 20) {
                await transferService.transferCoin(this.feeWalletKey, toAddress, 30, network);
                console.log(`Pre-funded TRX to ${toAddress}`);
            } else {
                console.log("Already have sufficent fee");
            }
        }
    }

    async forwardPaymentToMerchant(userPrivateKey, receivedAmount, merchantAddress, network, tokenAddress) {
        const transferService = new TransferService();
        console.log("Net ", network);
        if (network === 'bep20') {
            console.log("transferring...");
            // Forward remaining tokens after gas deduction
            // return await transferService.sendInRatio('0x' + userPrivateKey, merchantAddress, receivedAmount, tokenAddress);
            console.log("userPrivateKey",userPrivateKey);
            console.log("merchantAddress",merchantAddress);
            return await transferService.transferBEP20Token('0x' + userPrivateKey, merchantAddress, receivedAmount, tokenAddress);
        } else if (network === 'trc20') {
            return await transferService.transferTRC20Token(userPrivateKey, merchantAddress, receivedAmount, tokenAddress);
            // console.log(`Forwarded ${receivedAmount} tokens to merchant on TRC20`);
        }
    }

    // Check BEP20 Balance
    async checkBEP20Balance(address, tokenAddress) {
        // ERC-20 ABI
        const abi = [
            {
                "constant": true,
                "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
                "name": "balanceOf",
                "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }
        ];

        // console.log("address", tokenAddress);
        // console.log("provider", this.provider);
        const contract = new ethers.Contract(tokenAddress, abi, this.provider);

        // Fetch balance
        return await contract.balanceOf(address);
    }

    // Fetch BNB Balance (BSC Native Token)
    async getBNBBalance(address) {
        const balance = await this.provider.getBalance(address);
        // console.log("balance ", parseFloat(ethers.formatEther(balance)));
        return parseFloat(ethers.formatEther(balance)); // Convert wei to BNB
    }

    // Fetch TRX Balance (TRON Native Token)
    async getTRXBalance(address) {
        const balance = await this.tronWeb.trx.getBalance(address);
        console.log("balance ", balance);
        return balance / Math.pow(10, 6); // Convert SUN to TRX
    }




    async sendInRatio(privateKey, batchContractAddress, totalAmount, tokenAddress) {
        try {
            console.log("Private Key:", privateKey);

            // ✅ Fix: Ensure provider is set properly
            const wallet = new ethers.Wallet(privateKey, this.provider);
            console.log("Wallet Address:", wallet.address);

            // ✅ Fix: Ensure totalAmount is valid and formatted correctly
            if (!totalAmount || totalAmount.toString().trim() === "" || BigInt(totalAmount) <= 0) {
                console.error("Error: totalAmount is invalid:", totalAmount);
                throw new Error("totalAmount is undefined, null, or invalid");
            }

            console.log("Received totalAmount:", totalAmount);

            // ✅ Fix: Use ethers.toBigInt() instead of ethers.BigNumber.from()
            let totalAmountBN;
            try {
                totalAmountBN = ethers.toBigInt(totalAmount);
            } catch (e) {
                console.error("Error converting totalAmount to BigInt:", e);
                throw new Error("totalAmount conversion to BigInt failed");
            }

            console.log("Total Amount BN:", totalAmountBN.toString());

            // ✅ Fix: Ensure batchContractAddress and tokenAddress are defined
            if (!batchContractAddress) throw new Error("batchContractAddress is missing");
            if (!tokenAddress) throw new Error("tokenAddress is missing");

            console.log("Batch Contract Address:", batchContractAddress);
            console.log("Token Contract Address:", tokenAddress);

            // Recipients & Ratios
            // const recipients = [
            //     "0x5165F0B1641E5D7934621C422AE7bEA2C718640A"
            // ];
            const recipients = [
                "0x71AF9A8e5434168A9aF70FE33421639752C8061C"
            ];
           
            console.log("Recipients:", recipients);

            const ratios = [1000];

            // ✅ Fix: Use BigInt operations (* and /) instead of .mul() and .div()
            let amounts;
            try {
                amounts = ratios.map((ratio) =>
                    ((totalAmountBN * BigInt(ratio)) / BigInt(1000)).toString()
                );
            } catch (e) {
                console.error("Error calculating amounts:", e);
                throw new Error("Error in calculating token amounts");
            }

            console.log("Received totalAmount:", totalAmount);
            console.log("Calculated Amounts:", amounts.map(a => a.toString()));

            // ✅ Fix: Validate amounts before proceeding
            amounts.forEach(amount => {
                if (!amount || amount <= 0n) {  // Use `<= 0n` for BigInt comparison
                    throw new Error(`Invalid amount detected: ${amount}`);
                }
            });

            // **Step 1: Approve Tokens**
            const erc20Abi = ["function approve(address spender, uint256 amount) public returns (bool)"];
            const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);
            const approveTx = await tokenContract.approve(batchContractAddress, totalAmountBN);
            console.log("Approval Tx Hash:", approveTx.hash);
            await approveTx.wait();
            console.log("Approval Confirmed!");

            // **Step 2: Execute Batch Transfer**
            const batchTransferAbi = [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"count","type":"uint256"}],"name":"BatchTransferExecuted","type":"event"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"address[]","name":"recipients","type":"address[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"name":"batchTransfer","outputs":[],"stateMutability":"nonpayable","type":"function"}]

            const contract = new ethers.Contract(batchContractAddress, batchTransferAbi, wallet);
            const tx = await contract.batchTransfer(tokenAddress, recipients, amounts);
            console.log("Batch Transfer Tx Hash:", tx.hash);
            const receipt = await tx.wait();
            console.log("Batch Transfer Confirmed:", receipt);

            return receipt;
        } catch (error) {
            console.error("Error in Batch Transfer:", error);
            throw error;
        }
    }







    // Transfer BEP20 Tokens
    async transferBEP20Token(privateKey, toAddress, amount, tokenAddress) {
        try {
            const wallet = new Wallet(privateKey, this.provider);

            // ERC-20 ABI with decimals and transfer
            const abi = [
                "function decimals() view returns (uint8)",
                "function transfer(address to, uint256 value) public returns (bool)"
            ];
            const contract = new Contract(tokenAddress, abi, wallet);

            // Execute transfer
            const tx = await contract.transfer(toAddress, amount);
            // console.log('Transaction Hash: ', tx.hash);

            // Wait for transaction confirmation
            const receipt = await tx.wait();
            // console.log('Transaction Receipt: ', receipt);

            return receipt;
        } catch (err) {
            console.error('Error in BEP20 Transfer:', err);
            throw err;
        }
    }

    //check TRC20 balance
    async checkTRC20Balance(address, tokenAddress) {
        const contract = await this.tronWeb.contract().at(tokenAddress);

        // Fetch balance
        const balance = await contract.balanceOf(address).call();
        return balance / Math.pow(10, 6); // Assuming 6 decimals for TRC20 tokens
    }
    // Transfer TRC20 Tokens
    async transferTRC20Token(privateKey, toAddress, amount, tokenAddress) {
        try {
            // Set private key for TronWeb
            this.tronWeb.setPrivateKey(privateKey);
            // Convert amount to token decimals
            const decimals = await this.tronWeb.contract().at(tokenAddress).decimals().call();
            const value = amount * Math.pow(10, decimals);

            // Execute transfer
            const contract = await this.tronWeb.contract().at(tokenAddress);
            const tx = await contract.transfer(toAddress, value).send();
            console.log('Transaction ID:', tx);

            return tx;
        } catch (err) {
            console.error('Error in TRC20 Transfer:', err.message);
            throw err;
        }
    }

    // Transfer Coin (BNB for BEP20, TRX for TRC20)
    async transferCoin(privateKey, toAddress, amount, network = 'bep20') {
        try {
            if (network === 'bep20') {
                const wallet = new ethers.Wallet(privateKey, this.provider);
                // Convert amount to Wei and send transaction
                
                const value = parseUnits(amount.toString());
                const tx = await wallet.sendTransaction({
                    to: toAddress,
                    value,
                });
                console.log('Transaction Hash:', tx.hash);

                // Wait for confirmation
                const receipt = await tx.wait();
                console.log('Transaction Receipt:', receipt);

                return receipt;
            } else if (network === 'trc20') {
                // TRX Transfer
                this.tronWeb.setPrivateKey(privateKey);

                const tx = await this.tronWeb.trx.sendTransaction(toAddress, amount * 1e6); // Convert to Sun
                console.log('Transaction ID:', tx.txid);

                return tx;
            } else {
                throw new Error('Unsupported network type');
            }
        } catch (err) {
            console.error('Error in Native Transfer:', err.message);
            throw err;
        }
    }
}

// Export the TransferService
module.exports = TransferService;
// const tr = new TransferService();

// tr.transferBEP20Token("0xb52c6b279ffb2e31ac1ae1ab76c753d68c4d29d1563dbfbf12bc4e974c62b7c0",
//     '0x6aC171dA03B68E9CCB68eda17d5DD6BE6332fdb0',
//     '100000000000000000',
//     '0x771d76a2F35b8809119cc712cD9010A19164DFad'
// );