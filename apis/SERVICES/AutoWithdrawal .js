const { ethers } = require('ethers');
const mongoose = require('mongoose');
const contractAbi = require("../withdrawlcontract.json");
const contractAddress = "0x94Bfd89286291f1D6aAAA55D64287562609A5C4f";
const tokentAbi = require("../usdtcontract.json");
const tokenAddress = "0x55d398326f99059fF775485246999027B3197955";
const { Web3 } = require("web3");
const Transaction = require('../MODALS/transactions');
const { errorLogger } = require('../utils/logger');
const PRIVATE_KEY = "0x80fbf14d0372f4833098388d9282d0189f28cad79ae3773cb8686af833bf8741"
// const PROVIDER_URL = "https://white-solemn-brook.bsc.quiknode.pro/eed031db7e16e738b9f4dff190bc3d910f564cbc"
const PROVIDER_URL = "https://tame-damp-grass.bsc-testnet.quiknode.pro/4a656c9f6e6f9dcebc0e97ec6fa454c8792bf8b6"

if (!PRIVATE_KEY || PRIVATE_KEY.length !== 66) {
    // console.log("PRIVATE_KEY", PRIVATE_KEY)
    // console.log("Invalid PRIVATE_KEY. Ensure it's a valid 64-character hexadecimal string without '0x'.");
}

const web3 = new Web3(new Web3.providers.HttpProvider(PROVIDER_URL));
const tokenContract = new web3.eth.Contract(tokentAbi, tokenAddress);
const contract = new web3.eth.Contract(contractAbi, contractAddress);

const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);
const senderAddress = account.address;


class AutoWithdrawal {

    async getBNBBalance(address) {
        try {
            if (!web3.utils.isAddress(address)) {
                throw new Error("Invalid address provided.");
            }

            const balanceWei = await web3.eth.getBalance(address);
            const balanceBNB = web3.utils.fromWei(balanceWei, "ether");

            // console.log(`Balance of address ${address}: ${balanceBNB} BNB`);
            return { balanceBNB };
        } catch (error) {
            console.error(`Error fetching BNB balance for ${address}: ${error.message}`);
            throw error;
        }
    }

    async autowithdrawl_for_pending_user() {
        try {
            const pending_withdrawal = await Transaction.find({ status: 0, source: "withdrawal" });

            if (pending_withdrawal.length === 0) {
                // console.log("No pending withdrawals found.");
                return;
            }
            const tx_Id = pending_withdrawal.map(withdrawal => withdrawal.tx_Id.toString());
            const addresses = pending_withdrawal.map(withdrawal => withdrawal.account.address);
            const amounts = pending_withdrawal.map(withdrawal => withdrawal.amount.toString());
            const totalAmount = amounts.reduce((sum, amount) => sum + parseFloat(amount), 0);

            const { USDT } = await this.getContractBalance(contractAddress, tokenAddress)
            const { balanceBNB } = await this.getBNBBalance(senderAddress)

            // console.log("USDTUSDTUSDT ", totalAmount, USDT, balanceBNB);
            if (USDT < totalAmount) {
                // errorLogger("balance low in contract for withdrawl ", amounts, addresses, tx_Id);
                // console.log("USDT balance low in contract for withdrawl ", USDT,amounts, addresses, tx_Id);
                return
            }
            if (balanceBNB < 0.0002) {
                // errorLogger("balance low in contract for withdrawl ", amounts, addresses, tx_Id);
                // console.log("balanceBNB low in contract for withdrawl ", balanceBNB,amounts, addresses, tx_Id);
                return
            }

            const receipt = await this.sendTokens(amounts, addresses, tx_Id);

            // console.log(`Transaction Hash: ${receipt.transactionHash}`);

        } catch (error) {
            errorLogger(error);
            console.error(`Error in autowithdrawl_for_pending_user: ${error.message}`);
        }
    }

    async sendTokens(amounts, addresses, tx_Id) {
        try {

            if (!Array.isArray(amounts) || !Array.isArray(addresses) || !Array.isArray(tx_Id)) {
                // console.log("Amounts ,tx_Id and addresses must be arrays.");
            }

            if (amounts.length !== addresses.length !== tx_Id.length) {
                // console.log("Amounts ,tx_Id and addresses arrays must have the same length.");
            }

            const tokenAmounts = amounts.map(amount => Web3.utils.toWei(amount.toString(), "ether"));

            // console.log(`Preparing to send tokens to ${addresses.length} addresses...`);

            const txData = contract.methods
                .sendTokensToMultipleAddresses(tokenAmounts, addresses)
                .encodeABI();

            const gasEstimate = await web3.eth.estimateGas({
                from: senderAddress,
                to: contractAddress,
                data: txData,
            });

            const gasPrice = await web3.eth.getGasPrice();
            if (!gasPrice) {
                // console.log("Unable to fetch gas price.");
            }
            const tx = {
                from: senderAddress,
                to: contractAddress,
                gas: gasEstimate,
                gasPrice,
                data: txData,
            };

            // console.log("Signing transaction...");

            const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
            const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            // console.log("Transaction successful!");
            // console.log(`Transaction Hash: ${receipt.transactionHash}`);

            const updateTrans = await Transaction.updateMany(
                { tx_Id: { $in: tx_Id } },
                {
                    $set: {
                        status: 1,
                        tx_hash: receipt.transactionHash,
                    },
                },
                { new: true }
            );

            if (!updateTrans) {
                // console.error("Transaction not found or failed to update.");
            } else {
                // console.log("Transaction updated successfully:", updateTrans);
            }

            return receipt;
        } catch (error) {
            console.error(`Error sending tokens: ${error.message}`);
            throw error;
        }
    }

    async getContractBalance(contractAddress, tokenAddress) {
        try {
            if (!web3.utils.isAddress(contractAddress) || !web3.utils.isAddress(tokenAddress)) {
                throw new Error("Invalid contract or token address.");
            }
            const balanceWei = await web3.eth.getBalance(contractAddress);
            const balanceEther = web3.utils.fromWei(balanceWei, "ether");
            const tokenBalance = await tokenContract.methods.balanceOf(contractAddress).call();
            const decimals = await tokenContract.methods.decimals().call();
            const adjustedBalance = (BigInt(tokenBalance) / BigInt(10 ** Number(decimals))).toString();
            return {
                BNB: balanceEther,
                USDT: adjustedBalance,
            };
        } catch (error) {
            console.error(`Error fetching balances: ${error.message}`);
            throw error;
        }
    }
}

const autoWithdrawal = new AutoWithdrawal();
// autoWithdrawal.autowithdrawl_for_pending_user()
// autoWithdrawal.getBNBBalance(senderAddress)
module.exports = autoWithdrawal;
