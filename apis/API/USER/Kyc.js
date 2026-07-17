const kycDetails = require("../../MODALS/KYC");
const UserData = require("../../MODALS/userData");
const { INTERNAL_SERVER_ERROR } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");

class KYC{
    constructor() {
        this.addressKyc = this.addressKyc.bind(this);
        this.baknKyc = this.baknKyc.bind(this);
        this.findAndUpdateKYC = this.findAndUpdateKYC.bind(this);
        this.panKyc = this.panKyc.bind(this);
      }
    async findAndUpdateKYC(uid, update, kycType) {
        let kyc = await kycDetails.findOne({ uid });
    
        if (kyc) {
            // Check if the KYC status is not rejected
            if (kyc.status[kycType] !== 2) {
                throw new Error(`KYC for ${kycType} has already been submitted and is not rejected.`);
            }
        } else {
            kyc = new kycDetails({ uid });
        }
    
        Object.assign(kyc, update);
        await kyc.save();
        return kyc;
    }
    async baknKyc(req,res){
        
        try {
            const {uid}=req.user;
            const { accountNumber, ifscCode, bankName,holderName,accountType } = req.body;
            const document = `${req.protocol}://${req.hostname}/${req?.file?.filename}`;
            if (!accountNumber || !ifscCode || !bankName || !holderName || !accountType || !req.file) {
                return res.status(400).json({ message: 'All fields are required for bank KYC.' });
            }
            await this.findAndUpdateKYC(uid, {
                bankDetails: { accountNumber, ifscCode, bankName, document,holderName,accountType },
                'status.bank': 0
            }, 'bank');
    
            await UserData.updateOne({ uid }, { 'kycStatus.bank': 0 });
    
            res.status(200).json({message:'Bank KYC request submitted successfully.'});
        } catch (error) {
            errorLogger(error);
            res.status(500).json({...INTERNAL_SERVER_ERROR});
        }
    }
    async panKyc(req,res){
        try {
            const {uid}=req.user;
            const { panNumber } = req.body;
            const document = `${req.protocol}://${req.hostname}/${req.file.filename}`;
            if (!panNumber || !req.file) {
                return res.status(400).json({ message: 'All fields are required for PAN KYC.' });
            }
            await this.findAndUpdateKYC(uid, {
                panDetails: { panNumber, document },
                'status.pan': 0
            }, 'pan');
    
            await UserData.updateOne({ uid }, { 'kycStatus.pan': 0 });
    
            res.status(200).send('PAN KYC request submitted successfully.');
        } catch (error) {
            res.status(400).send(error.message);
        }
    }
    async addressKyc(req,res){
        try {
            const {uid}=req.user;
            const { idType, idNumber, name, address } = req.body;
            const documentFront = `${req.protocol}://${req.hostname}/${req.files['documentFront'][0].filename}`;
            const documentBack = `${req.protocol}://${req.hostname}/${req.files['documentBack'][0].filename}`;
            if (!idType || !idNumber || !name || !address || !req.files['documentFront'] || !req.files['documentBack']) {
                return res.status(400).json({ message: 'All fields are required for address KYC.' });
            }
            await findAndUpdateKYC(uid, {
                addressDetails: { idType, idNumber, name, address, documentFront, documentBack },
                'status.address': 0
            }, 'address');
    
            await UserData.updateOne({ uid }, { 'kycStatus.address': 0 });
    
            res.status(200).send('Address KYC request submitted successfully.');
        } catch (error) {
            res.status(400).send(error.message);
        }
    }
}
const submitKyc = new KYC();
module.exports=submitKyc;