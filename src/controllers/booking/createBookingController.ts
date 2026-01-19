// src/controllers/booking/createBookingController.ts
import { Request, Response } from 'express';
import { BookingValidationService } from '../../services/bookingValidationService';
import { BookingPricingService } from '../../services/bookingPricingService';
import { BookingService } from '../../services/bookingService';

/**
 * @desc    Create new booking (with availability check and admin email notification)
 * @route   POST /api/bookings
 * @access  Public/Private
 */
export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      room: roomId,
      checkIn,
      checkOut,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      nights,
      pricePerNight,
      totalPrice,
      taxAmount,
      discountAmount,
      paymentStatus,
      status,
      specialRequests
    } = req.body;

    console.log('📥 Received booking request:', req.body);

    // Step 1: Validate required fields
    const fieldsValidation = BookingValidationService.validateRequiredFields(req.body);
    if (!fieldsValidation.isValid) {
      BookingValidationService.sendValidationError(res, fieldsValidation);
      return;
    }

    // Step 2: Validate room exists and is available
    const roomValidation = await BookingValidationService.validateRoom(roomId);
    if (!roomValidation.isValid) {
      BookingValidationService.sendValidationError(res, roomValidation);
      return;
    }

    const room = roomValidation.room;

    // Step 3: Validate dates
    const dateValidation = BookingValidationService.validateDates({ checkIn, checkOut });
    if (!dateValidation.isValid) {
      BookingValidationService.sendValidationError(res, dateValidation);
      return;
    }

    const { checkInDate, checkOutDate } = dateValidation;

    // Step 4: Check for booking conflicts
    const conflictCheck = await BookingValidationService.checkBookingConflict({
      roomId,
      checkInDate: checkInDate!,
      checkOutDate: checkOutDate!
    });

    if (conflictCheck.hasConflict) {
      res.status(400).json({
        success: false,
        message: 'Room is not available for selected dates. Please choose different dates.',
        conflictingBooking: {
          checkIn: conflictCheck.conflictingBooking.checkIn,
          checkOut: conflictCheck.conflictingBooking.checkOut,
          bookingReference: conflictCheck.conflictingBooking.bookingReference
        }
      });
      return;
    }

    // Step 5: Create booking
    const booking = await BookingService.createBooking({
      user: (req as any).user?.id,
      room: roomId,
      checkIn: checkInDate!,
      checkOut: checkOutDate!,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      nights,
      pricePerNight,
      totalPrice,
      taxAmount,
      discountAmount,
      paymentStatus,
      status: 'confirmed', // Auto-confirm bookings
      specialRequests
    });

    // Step 6: Send email notification to admin
    await BookingService.sendBookingNotification(booking, room);

    // Step 7: Send success response
    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking
    });

  } catch (error: any) {
    console.error('❌ Create booking error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};