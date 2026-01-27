// src/controllers/booking/createBookingController.ts
import { Request, Response } from 'express';
import { BookingValidationService } from '../../services/bookingValidationService';
import { BookingService } from '../../services/bookingService';
import { MAX_ROOMS_PER_TYPE } from '../../validators/bookingValidator';
import Booking from '../../models/Booking';

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ ADD CACHE HEADERS
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const {
      room: roomId,
      checkIn,
      checkOut,
      guests,
      children = 0,
      numberOfRooms,
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

    console.log('📥 Received booking request:', {
      ...req.body,
      guestPhone: guestPhone ? '***' + guestPhone.slice(-4) : undefined
    });

    // ✅ Validate guest name (no numbers)
    const nameValidation = BookingValidationService.validateGuestName(guestName);
    if (!nameValidation.isValid) {
      BookingValidationService.sendValidationError(res, nameValidation);
      return;
    }

    // ✅ Validate phone number (exactly 10 digits)
    const phoneValidation = BookingValidationService.validatePhoneNumber(guestPhone);
    if (!phoneValidation.isValid) {
      BookingValidationService.sendValidationError(res, phoneValidation);
      return;
    }

    // ✅ Validate children count
    if (children !== undefined) {
      const childrenValidation = BookingValidationService.validateChildren(children, guests);
      if (!childrenValidation.isValid) {
        BookingValidationService.sendValidationError(res, childrenValidation);
        return;
      }
    }

    // ✅ Validate special requests word count
    if (specialRequests) {
      const specialRequestsValidation = BookingValidationService.validateSpecialRequests(specialRequests);
      if (!specialRequestsValidation.isValid) {
        BookingValidationService.sendValidationError(res, specialRequestsValidation);
        return;
      }
    }

    // ✅ Validate room exists and is available
    const roomValidation = await BookingValidationService.validateRoom(roomId);
    if (!roomValidation.isValid) {
      BookingValidationService.sendValidationError(res, roomValidation);
      return;
    }

    const room = roomValidation.room;

    // ✅ Validate guest capacity based on room type
    const capacityValidation = BookingValidationService.validateGuestCapacityByRoomType(
      guests,
      room.name
    );
    if (!capacityValidation.isValid) {
      BookingValidationService.sendValidationError(res, capacityValidation);
      return;
    }

    // ✅ Validate number of rooms by room type
    const roomCountValidation = BookingValidationService.validateNumberOfRoomsByType(
      numberOfRooms,
      room.name
    );
    if (!roomCountValidation.isValid) {
      BookingValidationService.sendValidationError(res, roomCountValidation);
      return;
    }

    // ✅ Validate sufficient rooms for guests (3 guests per room)
    const requiredRooms = Math.ceil(guests / 3);
    if (numberOfRooms < requiredRooms) {
      res.status(400).json({
        success: false,
        message: `You need at least ${requiredRooms} room(s) for ${guests} guests (3 guests per room). You selected ${numberOfRooms} room(s).`,
        error: 'Insufficient rooms for number of guests'
      });
      return;
    }

    // ✅ Validate doesn't exceed max rooms for this type
    const roomType = room.name as keyof typeof MAX_ROOMS_PER_TYPE;
    const maxRoomsForType = MAX_ROOMS_PER_TYPE[roomType];
    
    if (maxRoomsForType && numberOfRooms > maxRoomsForType) {
      res.status(400).json({
        success: false,
        message: `Maximum ${maxRoomsForType} room(s) available for ${room.name}. You requested ${numberOfRooms} room(s).`,
        error: 'Exceeds maximum available rooms for this room type'
      });
      return;
    }

    // Parse and validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // ✅ Check if enough rooms are available
    const existingBookings = await Booking.find({
      room: roomId,
      status: { $in: ['pending', 'confirmed'] },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate }
    });

    console.log(`📋 Found ${existingBookings.length} existing bookings for date range`);

    // ✅ Calculate how many rooms are already booked per date
    const bookingsPerDate = new Map<string, number>();
    
    existingBookings.forEach(booking => {
      const bCheckIn = new Date(booking.checkIn);
      const bCheckOut = new Date(booking.checkOut);
      const roomsBooked = booking.numberOfRooms || 1;
      
      const currentDate = new Date(bCheckIn);
      
      while (currentDate < bCheckOut) {
        const dateString = currentDate.toISOString().split('T')[0];
        const count = (bookingsPerDate.get(dateString) || 0) + roomsBooked;
        bookingsPerDate.set(dateString, count);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    const maxBookedRooms = bookingsPerDate.size > 0 
      ? Math.max(...Array.from(bookingsPerDate.values())) 
      : 0;
    
    const availableRooms = room.totalRooms - maxBookedRooms;

    console.log('📊 Availability check for booking:', {
      roomName: room.name,
      totalRooms: room.totalRooms,
      maxBookedRooms,
      availableRooms,
      requestedRooms: numberOfRooms,
      datesWithBookings: Array.from(bookingsPerDate.entries())
    });

    // ✅ Check if enough rooms are available
    if (availableRooms < numberOfRooms) {
      console.log('❌ Not enough rooms available');
      res.status(400).json({
        success: false,
        message: availableRooms === 0 
          ? 'No rooms available for selected dates. Please choose different dates.'
          : `Only ${availableRooms} room(s) available for selected dates. You're trying to book ${numberOfRooms}.`,
        availableRooms,
        requestedRooms: numberOfRooms,
        conflictingBooking: existingBookings.length > 0 ? {
          checkIn: existingBookings[0].checkIn,
          checkOut: existingBookings[0].checkOut,
          bookingReference: existingBookings[0].bookingReference
        } : null
      });
      return;
    }

    console.log('✅ Sufficient rooms available, proceeding with booking');

    // ✅ Create booking with all validated data
    const booking = await BookingService.createBooking({
      user: (req as any).user?.id,
      room: roomId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      children,
      numberOfRooms,
      guestName,
      guestEmail,
      guestPhone,
      nights,
      pricePerNight,
      totalPrice,
      taxAmount,
      discountAmount,
      paymentStatus,
      status: 'confirmed',
      specialRequests: specialRequests || ''
    });

    // ✅ Send notification email to EMAIL_USER (aamantranstays@gmail.com)
    await BookingService.sendBookingNotification(booking, room);

    console.log('✅ Booking created successfully:', {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      guests,
      children,
      numberOfRooms,
      roomType: room.name,
      requiredRooms,
      maxRoomsForType
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking
    });

  } catch (error: any) {
    console.error('❌ Create booking error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
      return;
    }

    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Duplicate booking reference. Please try again.'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating booking'
    });
  }
};