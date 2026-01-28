export interface BookingEmailData {
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomName: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  children?: number;
  adults?: number;
  numberOfRooms?: number;
  nights: number;
  pricePerNight?: number;
  basePrice?: number;
  gstAmount?: number;
  totalPrice: number;
  specialRequests?: string;
}

export const bookingNotificationTemplate = (data: BookingEmailData): string => {
  const {
    bookingReference,
    guestName,
    guestEmail, // ✅ Still in interface for backend use, just not displayed in email
    guestPhone,
    roomName,
    checkIn,
    checkOut,
    guests,
    children = 0,
    adults = guests,
    numberOfRooms = 1,
    nights,
    pricePerNight = 0,
    basePrice = 0,
    gstAmount = 0,
    totalPrice,
    specialRequests,
  } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #e0e0e0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .detail-label {
          font-weight: bold;
          color: #555;
          margin-right:8px; //add morgin for fix UI formet
        }
        .detail-value {
          color: #333;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          border-radius: 0 0 10px 10px;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
        .alert {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .success-badge {
          background: #28a745;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          display: inline-block;
          margin: 10px 0;
          font-size: 14px;
        }
        .guest-breakdown {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin: 10px 0;
        }
        .price-breakdown {
          background: #e3f2fd;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border: 2px solid #2196f3;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 16px;
        }
        .price-total {
          border-top: 2px solid #2196f3;
          margin-top: 10px;
          padding-top: 10px;
          font-weight: bold;
          font-size: 20px;
          color: #1976d2;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏨 New Booking Confirmed!</h1>
        <div class="success-badge">✓ AUTO-CONFIRMED</div>
        <p style="margin: 10px 0 0 0;">Booking Reference: <strong>${bookingReference}</strong></p>
      </div>

      <div class="content">
        <h2 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
          📋 Booking Details
        </h2>

        <div class="detail-row">
          <span class="detail-label">👤 Guest Name:</span>
          <span class="detail-value">${guestName}</span>
        </div>

        <!-- ✅ REMOVED: Email line no longer displayed in admin notification -->

        <div class="detail-row">
          <span class="detail-label">📱 Phone: </span>
          <span class="detail-value">
            <a href="tel:${guestPhone}">${guestPhone}</a>
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">🏠 Room Type: </span>
          <span class="detail-value">${roomName}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">🔢 Number of Rooms: </span>
          <span class="detail-value">${numberOfRooms} room${numberOfRooms > 1 ? "s" : ""}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">📅 Check-in: </span>
          <span class="detail-value">${new Date(checkIn).toLocaleDateString(
            "en-US",
            {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            },
          )}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">📅 Check-out: </span>
          <span class="detail-value">${new Date(checkOut).toLocaleDateString(
            "en-US",
            {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            },
          )}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">🌙 Nights: </span>
          <span class="detail-value">${nights} night${nights > 1 ? "s" : ""}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">👥 Total Guests: </span>
          <span class="detail-value">${guests} guest${guests > 1 ? "s" : ""}</span>
        </div>

        ${
          children > 0 || adults !== guests
            ? `
          <div class="guest-breakdown">
            <strong style="color: #555;">Guest Breakdown: </strong><br>
            <div style="margin-top: 8px;">
              👨 Adults: <strong>${adults}</strong><br>
              👶 Children: <strong>${children}</strong>
            </div>
          </div>
        `
            : ""
        }

        <!-- ✅ Price Breakdown with Base + GST (18%) -->
        <div class="price-breakdown">
          <h3 style="margin: 0 0 15px 0; color: #1976d2;">💰 Payment Summary</h3>
          
          <div class="price-row">
            <span>Base Amount:</span>
            <span><strong>₹${basePrice.toLocaleString("en-IN")}</strong></span>
          </div>
          
          <div class="price-row">
            <span>GST (18%):</span>
            <span><strong>₹${gstAmount.toLocaleString("en-IN")}</strong></span>
          </div>
          
          <div class="price-row price-total">
            <span>Total Amount:</span>
            <span>₹${totalPrice.toLocaleString("en-IN")}</span>
          </div>
          
          ${
            pricePerNight > 0
              ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #90caf9; font-size: 14px; color: #555;">
            <div style="margin-bottom: 5px;">
              📊 Calculation: ₹${pricePerNight.toLocaleString("en-IN")} × ${nights} night${nights > 1 ? "s" : ""} × ${numberOfRooms} room${numberOfRooms > 1 ? "s" : ""} = ₹${basePrice.toLocaleString("en-IN")}
            </div>
            <div>
              📈 GST: ₹${basePrice.toLocaleString("en-IN")} × 18% = ₹${gstAmount.toLocaleString("en-IN")}
            </div>
          </div>
          `
              : ""
          }
        </div>

        ${
          specialRequests
            ? `
          <div class="alert">
            <strong>📝 Special Requests:</strong><br>
            ${specialRequests}
          </div>
        `
            : ""
        }

        <div style="margin-top: 30px; padding: 20px; background: #e8f5e9; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #2e7d32;">
            ℹ️ <strong>This booking has been automatically confirmed.</strong><br>
            View and manage all bookings in your admin dashboard.
          </p>
        </div>
      </div>

      <div class="footer">
        <p style="margin: 5px 0;">This is an automated notification from your Hotel Booking System</p>
        <p style="margin: 5px 0;">📊 <a href="${process.env.FRONTEND_URL}/admin/dashboard" style="color: #667eea;">View in Admin Dashboard</a></p>
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} HomeStay. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};
