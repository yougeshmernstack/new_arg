/**
 * Thin compatibility layer — production sends use mailerService + apis/templete/.
 */
const mailerService = require('./mailerService');

const sendEmail = async (to, subject, text, user) => {
  try {
    if (user) {
      await mailerService.sendMail(to, subject || 'Welcome to Arogya Green Life', 'welcome-email', {
        name: user.firstname || user.name || user.username,
        username: user.username,
        password: user.password,
        email: user.email || to,
        role: user.role || 'member',
      });
    } else {
      await mailerService.sendMail(to, subject || 'Arogya Green Life', 'welcome-email', {
        name: 'User',
        username: '',
        password: '',
        email: to,
        role: 'member',
        text,
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

const sendOtpEmail = async (to, otp, action = 'verification', name = '') => {
  try {
    await mailerService.sendMail(to, `Your OTP for ${action}`, 'forgot-password-otp', {
      otp,
      action,
      name,
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error };
  }
};

module.exports = {
  sendEmail,
  sendOtpEmail,
};
