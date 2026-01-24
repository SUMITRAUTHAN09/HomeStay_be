import { transporter } from '../config';
import { bookingNotificationTemplate, BookingEmailData } from '../templates/bookingNotificationTemplate';

export const sendBookingNotificationToAdmin = async (
  bookingDetails: BookingEmailData
): Promise<void> => {
  const adminEmail = process.env.EMAIL_USER;

  if (!adminEmail) {
    console.error('❌ EMAIL_USER is not set in .env file');
    throw new Error('Admin email not configured');
  }

  const mailOptions = {
    from: adminEmail,
    to: adminEmail,
    subject: `🔔 New Booking Received - ${bookingDetails.bookingReference}`,
    html: bookingNotificationTemplate(bookingDetails)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification email sent successfully to:', adminEmail);
  } catch (error) {
    console.error('❌ Error sending admin notification email:', error);
    throw error;
  }
};