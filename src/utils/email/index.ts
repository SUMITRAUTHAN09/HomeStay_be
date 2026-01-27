// src/utils/email/index.ts
import { transporter } from './config';
import { bookingNotificationTemplate, BookingEmailData } from './templates/bookingNotificationTemplate';
import { generateOTPEmail, OTPEmailData } from './templates/otpTemplate';

// Re-export types
export type { BookingEmailData, OTPEmailData };

// Re-export transporter
export { transporter };

// Verify email configuration
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    return false;
  }
};

/**
 * Send booking notification to admin email (EMAIL_USER)
 */
export const sendBookingNotificationToAdmin = async (data: BookingEmailData): Promise<void> => {
  // ✅ Use EMAIL_USER directly (aamantranstays@gmail.com)
  const adminEmail = process.env.EMAIL_USER;
  
  if (!adminEmail) {
    console.error('❌ EMAIL_USER not configured');
    throw new Error('EMAIL_USER environment variable is not set');
  }
  
  const mailOptions = {
    from: `"Aamantran Homestay" <${process.env.EMAIL_USER}>`,
    to: adminEmail, // ✅ Goes to EMAIL_USER (aamantranstays@gmail.com)
    subject: `🏠 New Booking Received - ${data.bookingReference}`,
    html: bookingNotificationTemplate(data),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Booking notification email sent to ${adminEmail}`);
  } catch (error) {
    console.error('❌ Failed to send booking notification:', error);
    throw error;
  }
};

/**
 * Send password reset OTP to admin
 */
export const sendPasswordResetOTP = async (data: OTPEmailData): Promise<void> => {
  const mailOptions = {
    from: `"Aamantran Homestay Admin" <${process.env.EMAIL_USER}>`,
    to: data.email,
    subject: '🔐 Password Reset OTP - Aamantran Homestay Admin',
    html: generateOTPEmail(data),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${data.email}`);
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    throw error;
  }
};

/**
 * Resend password reset OTP (same as above but for clarity)
 */
export const resendPasswordResetOTP = async (data: OTPEmailData): Promise<void> => {
  return sendPasswordResetOTP(data);
};