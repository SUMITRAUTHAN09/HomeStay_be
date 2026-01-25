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

// Middleware
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      health: '/api/health'
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
        serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
        socketTimeoutMS: 45000,
        family: 4, // Force IPv4
        maxPoolSize: 10,
        minPoolSize: 1,
        retryWrites: true,
        retryReads: true,
        connectTimeoutMS: 30000, // Added explicit connect timeout
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
      
      // Reset connection promise on failure
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
  connectionPromise = null; // Reset on error
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
  connectionPromise = null; // Reset on disconnect
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
    // Ensure database connection before handling request
    await connectDB();
    
    // Handle the request
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