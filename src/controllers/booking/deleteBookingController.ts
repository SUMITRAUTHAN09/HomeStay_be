// src/controllers/booking/deleteBookingController.ts
import { Request, Response } from 'express';
import { BookingService } from '../../services/bookingService';

/**
 * @desc    Delete booking
 * @route   DELETE /api/bookings/:id
 * @access  Private (Admin only)
 */
export const deleteBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    await BookingService.deleteBooking(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete booking error:', error);

    if (error.message === 'Booking not found') {
      res.status(404).json({
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