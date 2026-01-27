// src/utils/email/config.ts
import nodemailer from 'nodemailer';

// ✅ Gmail SMTP Configuration
export const transporter = nodemailer.createTransport({
  service: 'gmail', // ✅ Use Gmail service
  auth: {
    user: process.env.EMAIL_USER, // aamantranstays@gmail.com
    pass: process.env.EMAIL_PASSWORD // baqx qibq wetg suti (App Password)
  }
});

// Alternative explicit configuration (if service: 'gmail' doesn't work)
/*
export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
*/

export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    console.log('📧 Using email:', process.env.EMAIL_USER);
    return true;
  } catch (error: any) {
    console.error('❌ Email service error:', error);
    console.error('❌ Email user:', process.env.EMAIL_USER);
    console.error('❌ Has password:', !!process.env.EMAIL_PASSWORD);
    return false;
  }
};