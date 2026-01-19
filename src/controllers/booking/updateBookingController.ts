// src/controllers/booking/updateBookingController.ts
import { Request, Response } from 'express';
import { BookingValidationService } from '../../services/bookingValidationService';
import { BookingService } from '../../services/bookingService';
import Booking from '../../models/Booking';

/**
 * @desc    Update booking
 * @route   PUT /api/bookings/:id
 * @access  Private (Admin only)
 */
export const updateBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // If updating dates, check for conflicts
    if (req.body.checkIn || req.body.checkOut) {
      const newCheckIn = req.body.checkIn 
        ? new Date(req.body.checkIn + 'T00:00:00.000Z') 
        : booking.checkIn;
      
      const newCheckOut = req.body.checkOut 
        ? new Date(req.body.checkOut + 'T00:00:00.000Z') 
        : booking.checkOut;

      // Check for conflicts (excluding current booking)
      const conflictCheck = await BookingValidationService.checkBookingConflict({
        roomId: booking.room.toString(),
        checkInDate: newCheckIn,
        checkOutDate: newCheckOut,
        excludeBookingId: req.params.id
      });

      if (conflictCheck.hasConflict) {
        res.status(400).json({
          success: false,
          message: 'Room is not available for selected dates'
        });
        return;
      }
    }

    const updatedBooking = await BookingService.updateBooking(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking: updatedBooking
    });

  } catch (error: any) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Cancel booking
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private
 */
export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const reason = req.body.reason;

    const booking = await BookingService.cancelBooking(
      req.params.id,
      userId,
      reason
    );

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });

  } catch (error: any) {
    console.error('Cancel booking error:', error);

    if (error.message === 'Booking not found') {
      res.status(404).json({
        success: false,
        message: error.message
      });
      return;
    }

    if (error.message.includes('cannot be cancelled')) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};