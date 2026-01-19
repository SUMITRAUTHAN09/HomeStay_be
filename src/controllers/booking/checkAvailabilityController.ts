// src/controllers/booking/checkAvailabilityController.ts
import { Request, Response } from 'express';
import { BookingValidationService } from '../../services/bookingValidationService';
import { BookingPricingService } from '../../services/bookingPricingService';

/**
 * @desc    Check room availability and calculate pricing
 * @route   POST /api/bookings/check-availability
 * @access  Public
 */
export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId, checkIn, checkOut, guests } = req.body;

    // Validate required fields
    if (!roomId || !checkIn || !checkOut) {
      res.status(400).json({
        success: false,
        message: 'Please provide roomId, checkIn, and checkOut dates'
      });
      return;
    }

    // Validate room exists and is available
    const roomValidation = await BookingValidationService.validateRoom(roomId);
    if (!roomValidation.isValid) {
      if (roomValidation.statusCode === 404) {
        res.status(404).json({
          success: false,
          message: roomValidation.error
        });
        return;
      }

      // Room exists but is disabled
      res.status(200).json({
        success: true,
        available: false,
        message: 'This room is currently disabled',
        room: {
          id: roomValidation.room?._id,
          name: roomValidation.room?.name,
          type: roomValidation.room?.type
        }
      });
      return;
    }

    const room = roomValidation.room;

    // Validate guest capacity (if provided)
    if (guests) {
      const capacityValidation = BookingValidationService.validateGuestCapacity(
        Number(guests),
        room.capacity
      );

      if (!capacityValidation.isValid) {
        res.status(200).json({
          success: true,
          available: false,
          message: capacityValidation.error,
          room: {
            id: room._id,
            name: room.name,
            capacity: room.capacity
          }
        });
        return;
      }
    }

    // Validate dates
    const dateValidation = BookingValidationService.validateDates({ checkIn, checkOut });
    if (!dateValidation.isValid) {
      BookingValidationService.sendValidationError(res, dateValidation);
      return;
    }

    const { checkInDate, checkOutDate } = dateValidation;

    // Check for booking conflicts
    const conflictCheck = await BookingValidationService.checkBookingConflict({
      roomId,
      checkInDate: checkInDate!,
      checkOutDate: checkOutDate!
    });

    if (conflictCheck.hasConflict) {
      res.status(200).json({
        success: true,
        available: false,
        message: 'Room is not available for selected dates',
        conflictingBooking: {
          checkIn: conflictCheck.conflictingBooking.checkIn,
          checkOut: conflictCheck.conflictingBooking.checkOut,
          bookingReference: conflictCheck.conflictingBooking.bookingReference
        },
        room: {
          id: room._id,
          name: room.name,
          type: room.type
        }
      });
      return;
    }

    // Calculate pricing
    const pricing = BookingPricingService.calculatePricing({
      checkInDate: checkInDate!,
      checkOutDate: checkOutDate!,
      pricePerNight: room.price
    });

    console.log('✅ Room is available - returning pricing');

    // Room is available - return availability with pricing
    res.status(200).json({
      success: true,
      available: true,
      message: 'Room is available for selected dates',
      room: {
        id: room._id,
        name: room.name,
        type: room.type,
        price: room.price,
        capacity: room.capacity,
        images: room.images?.[0] || null
      },
      pricing: BookingPricingService.formatPricingResponse(pricing),
      dates: {
        checkIn: checkInDate!.toISOString().split('T')[0],
        checkOut: checkOutDate!.toISOString().split('T')[0]
      }
    });

  } catch (error: any) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking availability'
    });
  }
};