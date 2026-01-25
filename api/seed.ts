import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Room from '../src/models/Room';
import Menu from '../src/models/Menu';
import Admin from '../src/models/Admin';

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    console.log('✅ Already connected to MongoDB');
    return;
  }
  
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) throw new Error('MONGODB_URI not defined');
  
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
  });
  console.log('✅ Connected to MongoDB');
};

export default async function handler(req: Request, res: Response) {
  try {
    await connectDB();

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
    
    // Clear existing data
    await Room.deleteMany({});
    await Menu.deleteMany({});
    // Don't delete admin if exists, update instead

    console.log('📦 Inserting rooms...');
    const createdRooms = await Room.insertMany(rooms);
    
    console.log('🍽️  Creating menu...');
    const createdMenu = await Menu.create(menuData);
    
    console.log('👤 Creating/updating admin...');
    const existingAdmin = await Admin.findOne({ email: adminData.email });
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
          note: 'Password: Aam@ntar@n12!'
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Seed error:', error);
    res.status(500).json({
      success: false,
      error: 'Seeding failed',
      message: error.message,
      details: error.stack
    });
  }
}