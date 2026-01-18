import { Request, Response } from 'express';
import Room from '../models/Room';
import Booking from '../models/Booking';

/**
 * @desc    Get all rooms (PUBLIC - only available rooms)
 * @route   GET /api/rooms
 * @access  Public
 */
export const getAllRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { available, minPrice, maxPrice, capacity } = req.query;

    // Build query - ALWAYS filter for available rooms on public endpoint
    const query: any = { isAvailable: true }; // ✅ CRITICAL: Only show available rooms
    
    if (available === 'false') {
      // If explicitly requesting unavailable rooms, ignore the default filter
      // This is for admin use only
      delete query.isAvailable;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    if (capacity) {
      query.capacity = { $gte: Number(capacity) };
    }

    const rooms = await Room.find(query).sort({ price: 1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
      data: rooms // Also include as 'data' for consistency
    });
  } catch (error: any) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get ALL rooms (ADMIN - including unavailable)
 * @route   GET /api/admin/rooms
 * @access  Private (Admin only)
 */
export const getAllRoomsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { available, minPrice, maxPrice, capacity } = req.query;

    // Build query - NO availability filter for admin
    const query: any = {};
    
    if (available === 'true') {
      query.isAvailable = true;
    } else if (available === 'false') {
      query.isAvailable = false;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    if (capacity) {
      query.capacity = { $gte: Number(capacity) };
    }

    const rooms = await Room.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
      data: rooms // Also include as 'data' for consistency
    });
  } catch (error: any) {
    console.error('Get all rooms (admin) error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get single room by ID (PUBLIC - only if available)
 * @route   GET /api/rooms/:id
 * @access  Public
 */
export const getRoomById = async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ Only return room if it's available (for public)
    const room = await Room.findOne({ 
      _id: req.params.id,
      isAvailable: true 
    });

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found or not available'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { room }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get single room by ID (ADMIN - any room)
 * @route   GET /api/admin/rooms/:id
 * @access  Private (Admin only)
 */
export const getRoomByIdAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    // Admin can see any room, regardless of availability
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { room }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Create new room
 * @route   POST /api/rooms
 * @access  Private (Admin only)
 */
export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, type, description, price, capacity, amenities, images, features } = req.body;

    // Validation
    if (!name || !price || !capacity) {
      res.status(400).json({
        success: false,
        message: 'Please provide name, price, and capacity'
      });
      return;
    }

    const room = await Room.create({
      name,
      type,
      description,
      price,
      capacity,
      amenities: amenities || [],
      images: images || [],
      features: features || [],
      isAvailable: true
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { room }
    });
  } catch (error: any) {
    console.error('Create room error:', error);
    
    // Handle duplicate room name
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'A room with this name already exists'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Update room
 * @route   PUT /api/rooms/:id
 * @access  Private (Admin only)
 */
export const updateRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data: { room }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Delete room
 * @route   DELETE /api/rooms/:id
 * @access  Private (Admin only)
 */
export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    await room.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Toggle room availability (enable/disable)
 * @route   PATCH /api/rooms/:id/toggle-availability
 * @access  Private (Admin only)
 */
export const toggleRoomAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    room.isAvailable = !room.isAvailable;
    await room.save();

    console.log(`✅ Room ${room.name} availability toggled to: ${room.isAvailable}`);

    res.status(200).json({
      success: true,
      message: `Room ${room.isAvailable ? 'enabled' : 'disabled'} successfully`,
      data: { room }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get room availability calendar (30 days)
 * @route   GET /api/rooms/:id/availability-calendar
 * @access  Public
 */
export const getRoomAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: roomId } = req.params;
    const { startDate } = req.query;

    // Validate room exists AND is available (for public)
    const room = await Room.findOne({ 
      _id: roomId,
      isAvailable: true 
    });
    
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found or not available'
      });
      return;
    }

    // Set start date (default to today)
    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);

    // Set end date (30 days from start)
    const end = new Date(start);
    end.setDate(end.getDate() + 30);

    // Find all confirmed/pending bookings for this room in the date range
    const bookings = await Booking.find({
      room: roomId,
      status: { $in: ['pending', 'confirmed'] },
      checkIn: { $lt: end },
      checkOut: { $gt: start }
    }).select('checkIn checkOut status');

    console.log(`📅 Found ${bookings.length} bookings for room ${roomId}`);

    // Create a Set of all booked dates (YYYY-MM-DD format)
    const bookedDates = new Set<string>();

    bookings.forEach(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      // Mark all dates from checkIn to checkOut (excluding checkOut date)
      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        bookedDates.add(d.toISOString().split('T')[0]);
      }
    });

    console.log(`🔴 Total booked dates: ${bookedDates.size}`);

    // Generate availability array for 30 days
    const availability = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      availability.push({
        date: dateString,
        available: !bookedDates.has(dateString)
      });
    }

    res.status(200).json({
      success: true,
      roomId,
      roomName: room.name,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      availability
    });

  } catch (error: any) {
    console.error('❌ Error fetching room availability:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching room availability'
    });
  }
};

/**
 * @desc    Check if specific dates are available for a room
 * @route   GET /api/rooms/:id/check-dates
 * @access  Public
 */
export const checkDateAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: roomId } = req.params;
    const { checkInDate, checkOutDate } = req.query;

    console.log('🔍 Checking availability:', { roomId, checkInDate, checkOutDate });

    // Validate inputs
    if (!checkInDate || !checkOutDate) {
      res.status(400).json({
        success: false,
        message: 'Check-in and check-out dates are required'
      });
      return;
    }

    // Validate room exists AND is available
    const room = await Room.findOne({ 
      _id: roomId,
      isAvailable: true 
    });
    
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found or not available'
      });
      return;
    }

    // Use date strings directly for comparison (YYYY-MM-DD format)
    const checkInStr = checkInDate as string;
    const checkOutStr = checkOutDate as string;

    console.log('📅 Date strings:', {
      checkIn: checkInStr,
      checkOut: checkOutStr
    });

    // Validate dates
    if (checkOutStr <= checkInStr) {
      res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
      return;
    }

    // Check for overlapping bookings
    // Convert date strings to Date objects for database query
    const checkInDateObj = new Date(checkInStr + 'T00:00:00.000Z');
    const checkOutDateObj = new Date(checkOutStr + 'T00:00:00.000Z');

    const conflictingBooking = await Booking.findOne({
      room: roomId,
      status: { $in: ['pending', 'confirmed'] },
      checkIn: { $lt: checkOutDateObj },
      checkOut: { $gt: checkInDateObj }
    });

    if (conflictingBooking) {
      console.log('❌ Found conflicting booking:', {
        id: conflictingBooking._id,
        checkIn: conflictingBooking.checkIn,
        checkOut: conflictingBooking.checkOut,
        status: conflictingBooking.status
      });
    } else {
      console.log('✅ No conflicts found - dates are available');
    }

    const isAvailable = !conflictingBooking;

    res.status(200).json({
      success: true,
      data: {
        available: isAvailable,
        message: isAvailable 
          ? 'Room is available for selected dates' 
          : 'Room is not available for selected dates',
        conflictingBooking: conflictingBooking ? {
          checkIn: conflictingBooking.checkIn,
          checkOut: conflictingBooking.checkOut,
          status: conflictingBooking.status
        } : null
      }
    });

  } catch (error: any) {
    console.error('❌ Error checking date availability:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking availability'
    });
  }
};