const Activity = require("../../MODALS/Activity");
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");
const { updated_successfully } = require("../../utils/successMessages");

class ACTIVITY{
    async get_activity(req,res){
        try {
            const all_activity = await Activity.find()
            res.status(200).json({all_activity})
            return
        } catch (error) {
            errorLogger(error)
            return res.status(500).json({...INTERNAL_SERVER_ERROR})
        }
    }
    async update_activity(req,res){
        try {
            const {a_id,status,use_wallet,allowed_for} = req.body;
            if (!use_wallet || use_wallet.length > 0) {
                return res.status(400).json({...INVALID_REQUEST})
            }
        
            if (!allowed_for || allowed_for.length > 0) {
                return res.status(400).json({...INVALID_REQUEST})
            }
            const update = await Activity.findOneAndUpdate({a_id},{status,use_wallet,allowed_for});
           return res.status(200).json({...updated_successfully})
        } catch (error) {
            errorLogger(error)
            return res.status(500).json({...INTERNAL_SERVER_ERROR})
        }
    }
}
const Activities = new ACTIVITY()
module.exports = Activities;