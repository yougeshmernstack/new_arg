const Company = require("../../MODALS/CompanyInfo");
const { INTERNAL_SERVER_ERROR } = require("../../utils/errorMessages");

class COMPANY{
    async getInfo(req,res){
        try {
            const company_info = await Company.findOne();
            res.status(200).json({company_info})
        } catch (error) {
            res.status(500).json({...INTERNAL_SERVER_ERROR})
        }
    }

    async updateBroadcastInfo(req,res){
        try{
            const { message, status } = req.body;
            const updateFields = {};
            
            if (message !== undefined) {
                updateFields['broadCast.message'] = message;
            }
            if (status !== undefined) {
                updateFields['broadCast.status'] = status;
            }

            if (Object.keys(updateFields).length === 0) {
                return res.status(400).json({ message: "Please provide at least one field to update - message or status" });
            }

            const updatedInfo = await Company.findOneAndUpdate(
                {},
                { $set: updateFields },
                { new: true }
            );
            res.status(200).json({ updatedInfo });
        }
        catch(error){
            console.log(error);
            res.status(500).json({...INTERNAL_SERVER_ERROR})
        }
    }
}
const company_info = new COMPANY();
module.exports=company_info;