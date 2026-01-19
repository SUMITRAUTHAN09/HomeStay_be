// src/controllers/booking/readBookingController.ts
import { Request, Response } from 'express';
import { BookingService } from '../../services/bookingService';

/**
 * @desc    Get all bookings
 * @route   GET /api/bookings
 * @access  Private (Admin only)
 */
export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, startDate, endDate, roomId } = req.query;

    const bookings = await BookingService.getAllBookings({
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
      roomId: roomId as string
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error: any) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get single booking by ID
 * @route   GET /api/bookings/:id
 * @access  Private
 */
export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await BookingService.getBookingById(req.params.id);

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      booking
    });
  } catch (error: any) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get my bookings (for authenticated users)
 * @route   GET /api/bookings/my-bookings
 * @access  Private
 */
export const getMyBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
      return;
    }

    const bookings = await BookingService.getUserBookings(userId);

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });

  } catch (error: any) {
    console.error('Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};