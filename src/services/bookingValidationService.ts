// src/services/bookingValidationService.ts
import { Response } from 'express';
import Room from '../models/Room';
import Booking from '../models/Booking';

interface ValidationResult {
  isValid: boolean;
  error?: string;
  statusCode?: number;
}

interface DateValidationParams {
  checkIn: string;
  checkOut: string;
}

interface BookingConflictParams {
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  excludeBookingId?: string;
}

export class BookingValidationService {
  /**
   * Validate required booking fields
   */
  static validateRequiredFields(data: any): ValidationResult {
    const requiredFields = [
      'room', 'checkIn', 'checkOut', 'guests',
      'guestName', 'guestEmail', 'guestPhone'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      return {
        isValid: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        statusCode: 400
      };
    }

    return { isValid: true };
  }

  /**
   * Validate room exists and is available
   */
  static async validateRoom(roomId: string): Promise<ValidationResult & { room?: any }> {
    const room = await Room.findById(roomId);

    if (!room) {
      return {
        isValid: false,
        error: 'Room not found',
        statusCode: 404
      };
    }

    if (!room.isAvailable) {
      return {
        isValid: false,
        error: 'This room is currently unavailable',
        statusCode: 400
      };
    }

    return { isValid: true, room };
  }

  /**
   * Validate guest capacity
   */
  static validateGuestCapacity(guests: number, roomCapacity: number): ValidationResult {
    if (guests > roomCapacity) {
      return {
        isValid: false,
        error: `This room can accommodate maximum ${roomCapacity} guests`,
        statusCode: 400
      };
    }

    return { isValid: true };
  }

  /**
   * Parse and validate dates
   */
  static validateDates(params: DateValidationParams): ValidationResult & { 
    checkInDate?: Date;
    checkOutDate?: Date;
  } {
    const checkInDate = new Date(params.checkIn + 'T00:00:00.000Z');
    const checkOutDate = new Date(params.checkOut + 'T00:00:00.000Z');

    // Check if checkout is after checkin
    if (checkOutDate <= checkInDate) {
      return {
        isValid: false,
        error: 'Check-out date must be after check-in date',
        statusCode: 400
      };
    }

    // Check if dates are not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
      return {
        isValid: false,
        error: 'Check-in date cannot be in the past',
        statusCode: 400
      };
    }

    return {
      isValid: true,
      checkInDate,
      checkOutDate
    };
  }

  /**
   * Check for booking conflicts
   * Note: Checkout day is available for new checkin
   */
  static async checkBookingConflict(params: BookingConflictParams): Promise<{
    hasConflict: boolean;
    conflictingBooking?: any;
  }> {
    const query: any = {
      room: params.roomId,
      status: { $in: ['pending', 'confirmed'] },
      checkIn: { $lt: params.checkOutDate },
      checkOut: { $gt: params.checkInDate }
    };

    // Exclude specific booking (for updates)
    if (params.excludeBookingId) {
      query._id = { $ne: params.excludeBookingId };
    }

    const conflictingBooking = await Booking.findOne(query);

    if (conflictingBooking) {
      console.log('❌ Conflicting booking found:', {
        bookingId: conflictingBooking._id,
        existingCheckIn: conflictingBooking.checkIn,
        existingCheckOut: conflictingBooking.checkOut,
        requestedCheckIn: params.checkInDate,
        requestedCheckOut: params.checkOutDate
      });

      return {
        hasConflict: true,
        conflictingBooking
      };
    }

    console.log('✅ No booking conflicts found');
    return { hasConflict: false };
  }

  /**
   * Send validation error response
   */
  static sendValidationError(res: Response, result: ValidationResult): void {
    res.status(result.statusCode || 400).json({
      success: false,
      message: result.error
    });
  }
}