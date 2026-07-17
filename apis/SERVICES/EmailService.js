const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// Load environment variables
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL } = process.env;

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT == 465, // Use true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  greetingTimeout: 30000 // 30 seconds
});

// Load and compile EJS template
const getWelcomeLetter = async (user) => {
  try {
    const templatePath = path.join(__dirname, '../Template/html/welcome.ejs');
    const template = fs.readFileSync(templatePath, 'utf8');
    return ejs.render(template, user);
  } catch (error) {
    console.error('Error reading or rendering template:', error);
    throw error;
  }
};

// Function to send an email
const sendEmail = async (to, subject, text, user) => {
  try {
    const html = user ? await getWelcomeLetter(user) : `<p>${text}</p>`;

    const info = await transporter.sendMail({
      from: FROM_EMAIL, // Sender address
      to, // List of recipients
      subject, // Subject line
      text, // Plain text body
      html, // HTML body
    });

    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

// Function to send OTP email
const sendOtpEmail = async (to, otp) => {
  const subject = 'Your OTP Code';
  const text = `Your OTP code is ${otp}`;
  const html = `<p>Your OTP code is <strong>${otp}</strong></p>`;
  
  return sendEmail(to, subject, text, { otp });
};

// Export the functions
module.exports = {
  sendEmail,
  sendOtpEmail,
};
