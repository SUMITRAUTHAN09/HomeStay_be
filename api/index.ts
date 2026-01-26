import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

// Import routes
import adminAuthRoutes from '../src/routes/adminAuthRoutes';
import bookingRoutes from '../src/routes/bookingRoutes';
import roomRoutes from '../src/routes/roomRoutes';
import menuRoutes from '../src/routes/menuRoutes';

// Import email service verification
import { verifyEmailConfig } from '../src/utils/emailService';

// Initialize Express app
const app = express();

// Middleware - CORS with Cache-Control and Pragma headers allowed
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Disable caching for all API responses
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Welcome route
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Aamantran Homestay Booking API',
    version: '1.0.0',
    environment: 'Vercel Serverless',
    endpoints: {
      adminAuth: '/api/admin/auth',
      rooms: '/api/rooms',
      bookings: '/api/bookings',
      menu: '/api/menu',
      health: '/api/health',
      seed: '/api/seed'
    }
  });
});

// Health check route
app.get('/api/health', async (_req: Request, res: Response) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbStatus = states[mongoose.connection.readyState] || 'unknown';
  
  res.status(200).json({ 
    success: true,
    status: 'OK', 
    message: 'Server is running on Vercel',
    database: dbStatus,
    readyState: mongoose.connection.readyState,
    hasMongoUri: !!process.env.MONGODB_URI,
    timestamp: new Date().toISOString()
  });
});

// Seed database route (for initial setup only)
app.get('/api/seed', async (_req: Request, res: Response) => {
  try {
    // Room data
    const rooms = [
      {
        name: 'Deluxe Mountain View',
        type: 'deluxe',
        description: 'Spacious room with stunning mountain views and modern amenities',
        price: 3500,
        capacity: 2,
        amenities: ['WiFi', 'TV', 'AC', 'Mini Fridge', 'Tea/Coffee Maker'],
        features: ['King Bed', 'Mountain View', 'Private Balcony', 'Attached Bath'],
        images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop'],
        isAvailable: true
      },
      {
        name: 'Family Suite',
        type: 'suite',
        description: 'Perfect for families with separate living area and kitchenette',
        price: 5500,
        capacity: 4,
        amenities: ['WiFi', 'TV', 'AC', 'Kitchenette', 'Living Area'],
        features: ['2 Bedrooms', 'Living Area', 'Valley View', 'Kitchenette'],
        images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&h=400&fit=crop'],
        isAvailable: true
      },
      {
        name: 'Cozy Mountain Cabin',
        type: 'cabin',
        description: 'Rustic charm with modern comforts and garden views',
        price: 4200,
        capacity: 3,
        amenities: ['WiFi', 'Fireplace', 'Tea Corner', 'Garden Access'],
        features: ['Queen + Single', 'Fireplace', 'Garden View', 'Tea Corner'],
        images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&h=400&fit=crop'],
        isAvailable: true
      }
    ];

    // Menu data
    const menuData = {
      categories: [
        {
          category: "Breakfast",
          order: 1,
          items: [
            { name: "Aloo Paratha with Curd", description: "Traditional stuffed flatbread" },
            { name: "Poha & Tea", description: "Flattened rice with spices" },
            { name: "Upma with Chutney", description: "Semolina porridge" },
            { name: "Fresh Fruits & Juice", description: "Seasonal fresh fruits" }
          ]
        },
        {
          category: "Lunch",
          order: 2,
          items: [
            { name: "Dal Tadka with Rice", description: "Lentil curry with steamed rice" },
            { name: "Rajma Chawal", description: "Kidney beans with rice" },
            { name: "Veg Thali", description: "Complete vegetarian platter" },
            { name: "Paneer Curry with Roti", description: "Cottage cheese curry" }
          ]
        },
        {
          category: "Dinner",
          order: 3,
          items: [
            { name: "Kadhi Pakora", description: "Yogurt curry with fritters" },
            { name: "Mix Veg with Roti", description: "Mixed vegetable curry" },
            { name: "Khichdi with Papad", description: "Rice and lentil comfort food" },
            { name: "Local Mountain Cuisine", description: "Traditional Uttarakhand dishes" }
          ]
        }
      ]
    };

    // Admin data
    const adminData = {
      name: 'Dr Mayank Mall',
      email: 'admin@aamantranstays.com',
      password: 'Aam@ntar@n12!',
      role: 'admin' as const,
      isActive: true
    };

    console.log('🗑️  Clearing existing data...');
    
    // Import models dynamically
    const Room = (await import('../src/models/Room')).default;
    const Menu = (await import('../src/models/Menu')).default;
    const Admin = (await import('../src/models/Admin')).default;
    
    // Clear existing data
    await Room.deleteMany({});
    await Menu.deleteMany({});

    console.log('📦 Inserting rooms...');
    const createdRooms = await Room.insertMany(rooms);
    
    console.log('🍽️  Creating menu...');
    const createdMenu = await Menu.create(menuData);
    
    console.log('👤 Creating/updating admin...');
    const existingAdmin = await Admin.findOne({ email: adminData.email }).select('+password');
    let admin;
    
    if (existingAdmin) {
      existingAdmin.name = adminData.name;
      existingAdmin.password = adminData.password;
      existingAdmin.isActive = true;
      admin = await existingAdmin.save();
      console.log('✅ Admin updated');
    } else {
      admin = await Admin.create(adminData);
      console.log('✅ Admin created');
    }

    res.status(200).json({
      success: true,
      message: '🎉 Database seeded successfully!',
      data: {
        rooms: {
          count: createdRooms.length,
          items: createdRooms.map(r => ({
            name: r.name,
            type: r.type,
            price: r.price,
            capacity: r.capacity
          }))
        },
        menu: {
          categories: createdMenu.categories.length,
          items: createdMenu.categories.map(c => ({
            category: c.category,
            itemCount: c.items.length
          }))
        },
        admin: {
          name: admin.name,
          email: admin.email,
          note: 'Use password: Aam@ntar@n12! to login'
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Seed error:', error);
    res.status(500).json({
      success: false,
      error: 'Seeding failed',
      message: error.message
    });
  }
});

// API Routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', menuRoutes);

// Global MongoDB connection promise
let connectionPromise: Promise<typeof mongoose> | null = null;

const connectDB = async (): Promise<typeof mongoose> => {
  // Return existing connection if already connected
  if (mongoose.connection.readyState === 1) {
    console.log('✅ Using existing MongoDB connection');
    return mongoose;
  }

  // Return existing connection attempt if in progress
  if (connectionPromise) {
    console.log('⏳ Waiting for existing connection attempt...');
    return connectionPromise;
  }

  // Create new connection
  connectionPromise = (async () => {
    try {
      const mongoURI = process.env.MONGODB_URI;
      
      if (!mongoURI) {
        throw new Error('MONGODB_URI environment variable is not defined');
      }

      console.log('🔄 Initiating MongoDB connection...');
      console.log('📍 Connecting to cluster:', mongoURI.includes('cluster0') ? 'cluster0' : 'unknown');
      
      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4,
        maxPoolSize: 10,
        minPoolSize: 1,
        retryWrites: true,
        retryReads: true,
        connectTimeoutMS: 30000,
      });

      console.log('✅ MongoDB Connected Successfully');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🔗 Host: ${mongoose.connection.host}`);
      
      // Verify email service (non-blocking)
      verifyEmailService().catch(err => 
        console.warn('⚠️ Email service verification failed:', err.message)
      );
      
      return conn;
    } catch (error: any) {
      console.error('❌ MongoDB Connection Failed');
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      
      connectionPromise = null;
      
      throw error;
    }
  })();

  return connectionPromise;
};

// Email service verification
const verifyEmailService = async () => {
  try {
    console.log('📧 Verifying email service...');
    const isValid = await verifyEmailConfig();
    
    if (isValid) {
      console.log('✅ Email service configured correctly');
    } else {
      console.warn('⚠️ Email service configuration issues');
    }
  } catch (error) {
    console.warn('⚠️ Email service verification error:', error);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
  connectionPromise = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
  connectionPromise = null;
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Error:', err.message);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      details: Object.values(err.errors).map((e: any) => e.message)
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate Entry',
      message: 'A record with this data already exists'
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'Authentication token is invalid'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired',
      message: 'Authentication token has expired'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested route does not exist'
  });
});

// Main handler for Vercel
const handler = async (req: any, res: any) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error: any) {
    console.error('❌ Handler error:', error);
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: 'Database connection failed. Please try again.',
      details: error.message
    });
  }
};

export default handler;