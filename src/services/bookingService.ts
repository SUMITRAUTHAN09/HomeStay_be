// src/services/bookingService.ts
import Booking from '../models/Booking';
import { sendBookingNotificationToAdmin } from '../utils/emailService';

interface CreateBookingData {
  user?: string;
  room: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  nights: number;
  pricePerNight: number;
  totalPrice: number;
  taxAmount: number;
  discountAmount: number;
  paymentStatus?: string;
  status?: string;
  specialRequests?: string;
}

interface UpdateBookingData {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  status?: string;
  paymentStatus?: string;
  specialRequests?: string;
  [key: string]: any;
}

interface BookingQueryParams {
  status?: string;
  startDate?: string;
  endDate?: string;
  roomId?: string;
}

export class BookingService {
  /**
   * Build query object from filters
   */
  static buildBookingQuery(params: BookingQueryParams) {
    const query: any = {};

    if (params.status) {
      query.status = params.status;
    }

    if (params.roomId) {
      query.room = params.roomId;
    }

    if (params.startDate || params.endDate) {
      query.checkIn = {};
      if (params.startDate) {
        query.checkIn.$gte = new Date(params.startDate + 'T00:00:00.000Z');
      }
      if (params.endDate) {
        query.checkIn.$lte = new Date(params.endDate + 'T00:00:00.000Z');
      }
    }

    return query;
  }

  /**
   * Get all bookings with filters
   */
  static async getAllBookings(params: BookingQueryParams) {
    const query = this.buildBookingQuery(params);

    const bookings = await Booking.find(query)
      .populate('room', 'name type price images')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    return bookings;
  }

  /**
   * Get single booking by ID
   */
  static async getBookingById(bookingId: string) {
    const booking = await Booking.findById(bookingId)
      .populate('room', 'name type price images amenities')
      .populate('user', 'name email phone');

    return booking;
  }

  /**
   * Get user's bookings
   */
  static async getUserBookings(userId: string) {
    const bookings = await Booking.find({ user: userId })
      .populate('room', 'name type price images')
      .sort({ createdAt: -1 });

    return bookings;
  }

  /**
   * Create new booking
   */
  static async createBooking(data: CreateBookingData) {
    const booking = await Booking.create({
      user: data.user,
      room: data.room,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: Number(data.guests),
      guestName: data.guestName.trim(),
      guestEmail: data.guestEmail.trim().toLowerCase(),
      guestPhone: data.guestPhone.trim(),
      nights: Number(data.nights),
      pricePerNight: Number(data.pricePerNight),
      totalPrice: Number(data.totalPrice),
      taxAmount: Number(data.taxAmount) || 0,
      discountAmount: Number(data.discountAmount) || 0,
      paymentStatus: data.paymentStatus || 'pending',
      status: data.status || 'confirmed',
      specialRequests: data.specialRequests?.trim()
    });

    console.log('✅ Booking created:', booking.bookingReference);

    // Populate room details
    await booking.populate('room', 'name type price images');

    return booking;
  }

  /**
   * Update booking
   */
  static async updateBooking(bookingId: string, data: UpdateBookingData) {
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      data,
      { new: true, runValidators: true }
    ).populate('room', 'name type price');

    return updatedBooking;
  }

  /**
   * Cancel booking
   */
  static async cancelBooking(
    bookingId: string,
    userId?: string,
    reason?: string
  ) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (!booking.canBeCancelled()) {
      throw new Error('Booking cannot be cancelled (must be at least 24 hours before check-in)');
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    if (userId) {
      booking.cancelledBy = userId as any; // Type assertion for ObjectId
    }
    if (reason) {
      booking.cancellationReason = reason;
    }

    await booking.save();

    return booking;
  }

  /**
   * Delete booking
   */
  static async deleteBooking(bookingId: string) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    await booking.deleteOne();

    return booking;
  }

  /**
   * Send booking notification email to admin
   */
  static async sendBookingNotification(booking: any, room: any) {
    try {
      await sendBookingNotificationToAdmin({
        bookingReference: booking.bookingReference,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        roomName: room.name,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        nights: booking.nights,
        totalPrice: booking.totalPrice,
        specialRequests: booking.specialRequests
      });
      console.log('📧 Admin notification email sent');
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
      // Don't fail the booking if email fails
    }
  }
}