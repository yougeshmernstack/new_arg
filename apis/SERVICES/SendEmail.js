const { errorLogger } = require("../utils/logger");
const { sendEmail } = require("./EmailService");

class EMAIL{
    async sendWelcomeEmail(req,res){
        const { email, name, username, password } = req.welcome;
  
      
        const user = { firstname:name, username, password, email };
        const subject = 'Welcome to Generation Of Gaming!';
        const text = 'Welcome to Generation Of Gaming! We are excited to have you on board.';
      
        try {
          const response = await sendEmail(email, subject, text, user);
          if (response.success) {
            return true;
          } else {
            errorLogger(response.error)
          }
        } catch (error) {
          errorLogger(error)
        }
    }
}
const Email = new EMAIL();
module.exports = Email;