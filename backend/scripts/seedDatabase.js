// Database seeding script to reset and populate with realistic data
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
const User = require('../models/User');
const Category = require('../models/Category');
const Issue = require('../models/Issue');
const Interaction = require('../models/Interaction');

// Connect to database
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/civita';
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Clean existing data
const cleanDatabase = async () => {
  console.log('🧹 Cleaning existing data...');
  
  try {
    await Category.deleteMany({});
    console.log('✅ Categories cleared');
    
    await Issue.deleteMany({});
    console.log('✅ Issues cleared');
    
    await Interaction.deleteMany({});
    console.log('✅ Interactions cleared');
    
    console.log('✅ Database cleaned successfully');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  }
};

// Realistic categories for civic issues
const categories = [
  {
    name: 'infrastructure',
    displayName: 'Infrastructure',
    description: 'Roads, bridges, utilities, and public facilities',
    icon: '🏗️',
    color: '#3b82f6',
    order: 1,
  },
  {
    name: 'environment',
    displayName: 'Environment',
    description: 'Air quality, water pollution, waste management, and green spaces',
    icon: '🌱',
    color: '#10b981',
    order: 2,
  },
  {
    name: 'public-safety',
    displayName: 'Public Safety',
    description: 'Crime, emergency services, and community safety concerns',
    icon: '🚨',
    color: '#ef4444',
    order: 3,
  },
  {
    name: 'transportation',
    displayName: 'Transportation',
    description: 'Public transit, traffic issues, parking, and pedestrian safety',
    icon: '🚌',
    color: '#f59e0b',
    order: 4,
  },
  {
    name: 'housing',
    displayName: 'Housing',
    description: 'Housing quality, availability, and neighborhood development',
    icon: '🏠',
    color: '#8b5cf6',
    order: 5,
  },
  {
    name: 'public-services',
    displayName: 'Public Services',
    description: 'Schools, libraries, healthcare, and government services',
    icon: '🏛️',
    color: '#06b6d4',
    order: 6,
  },
  {
    name: 'utilities',
    displayName: 'Utilities',
    description: 'Water, electricity, gas, internet, and telecommunications',
    icon: '⚡',
    color: '#f97316',
    order: 7,
  },
  {
    name: 'parks-recreation',
    displayName: 'Parks & Recreation',
    description: 'Parks, playgrounds, sports facilities, and recreational areas',
    icon: '🌳',
    color: '#84cc16',
    order: 8,
  },
];

// Create categories
const createCategories = async () => {
  console.log('📂 Creating categories...');
  
  try {
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ Created ${createdCategories.length} categories`);
    return createdCategories;
  } catch (error) {
    console.error('❌ Error creating categories:', error);
    throw error;
  }
};

// Generate realistic issues
const generateIssues = async (categories, users) => {
  console.log('📝 Creating sample issues...');
  
  // Sample locations (coordinates for different areas)
  const locations = [
    { coordinates: [90.4125, 23.8103], address: 'Dhanmondi, Dhaka, Bangladesh' },
    { coordinates: [90.3563, 23.7465], address: 'Old Dhaka, Bangladesh' },
    { coordinates: [90.4203, 23.7937], address: 'Gulshan, Dhaka, Bangladesh' },
    { coordinates: [90.3872, 23.7565], address: 'Motijheel, Dhaka, Bangladesh' },
    { coordinates: [90.4152, 23.7691], address: 'Ramna, Dhaka, Bangladesh' },
    { coordinates: [90.3744, 23.7298], address: 'Lalbagh, Dhaka, Bangladesh' },
    { coordinates: [90.4326, 23.8000], address: 'Banani, Dhaka, Bangladesh' },
    { coordinates: [90.3891, 23.7808], address: 'Shahbagh, Dhaka, Bangladesh' },
  ];

  const issueTemplates = [
    // Infrastructure
    {
      category: 'infrastructure',
      templates: [
        {
          title: 'Pothole on Main Street causing vehicle damage',
          description: 'Large pothole has formed on Main Street near the intersection. Multiple vehicles have reported tire damage. The hole is approximately 2 feet wide and 6 inches deep, creating a safety hazard for motorists.',
          priority: 'high',
          tags: ['road-maintenance', 'vehicle-damage', 'safety-hazard']
        },
        {
          title: 'Broken streetlight on residential road',
          description: 'Street light has been non-functional for over two weeks, creating unsafe conditions for pedestrians and drivers during nighttime hours. The light pole appears intact but the bulb needs replacement.',
          priority: 'medium',
          tags: ['lighting', 'night-safety', 'maintenance']
        },
        {
          title: 'Water main break flooding street',
          description: 'Underground water pipe has burst, causing significant flooding on the roadway. Water pressure in nearby homes has been affected. Emergency repair needed to prevent further damage to road surface.',
          priority: 'urgent',
          tags: ['water-main', 'flooding', 'emergency']
        }
      ]
    },
    // Environment
    {
      category: 'environment',
      templates: [
        {
          title: 'Illegal dumping in public park',
          description: 'Large amounts of construction debris and household waste have been illegally dumped near the park entrance. This is creating an eyesore and potential health hazard for park visitors and wildlife.',
          priority: 'high',
          tags: ['illegal-dumping', 'park-maintenance', 'waste-management']
        },
        {
          title: 'Air quality concerns near industrial area',
          description: 'Residents report strong chemical odors and visible air pollution during morning and evening hours. Multiple families have experienced respiratory issues. Investigation needed to identify pollution source.',
          priority: 'urgent',
          tags: ['air-quality', 'industrial-pollution', 'health-concern']
        },
        {
          title: 'Stagnant water breeding mosquitoes',
          description: 'Construction site has left standing water for several weeks, creating perfect breeding conditions for mosquitoes. Local residents are experiencing increased mosquito activity and health concerns.',
          priority: 'medium',
          tags: ['stagnant-water', 'mosquito-control', 'public-health']
        }
      ]
    },
    // Public Safety
    {
      category: 'public-safety',
      templates: [
        {
          title: 'Inadequate lighting in pedestrian underpass',
          description: 'The pedestrian underpass lacks sufficient lighting, creating safety concerns especially during evening hours. Several incidents of petty crime have been reported in this area.',
          priority: 'high',
          tags: ['pedestrian-safety', 'lighting', 'crime-prevention']
        },
        {
          title: 'Broken traffic signal causing accidents',
          description: 'Traffic light at busy intersection has been malfunctioning for three days, causing confusion and near-miss accidents. Temporary stop signs have been placed but a permanent fix is urgently needed.',
          priority: 'urgent',
          tags: ['traffic-safety', 'signal-malfunction', 'accident-prevention']
        }
      ]
    },
    // Transportation
    {
      category: 'transportation',
      templates: [
        {
          title: 'Bus stop lacks proper shelter and seating',
          description: 'High-traffic bus stop has no shelter from weather and insufficient seating for waiting passengers. During rain, passengers have no protection, and elderly individuals struggle without proper seating.',
          priority: 'medium',
          tags: ['public-transit', 'passenger-comfort', 'accessibility']
        },
        {
          title: 'Bike lane blocked by parked cars',
          description: 'Designated bicycle lane is consistently blocked by illegally parked vehicles, forcing cyclists into traffic and creating dangerous conditions. Enforcement and clear signage needed.',
          priority: 'medium',
          tags: ['bike-safety', 'parking-violation', 'traffic-enforcement']
        }
      ]
    }
  ];

  const issues = [];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const statuses = ['open', 'in-progress', 'resolved'];

  // Generate issues for each category
  for (const categoryData of issueTemplates) {
    const category = categories.find(c => c.name === categoryData.category);
    if (!category) continue;

    for (const template of categoryData.templates) {
      // Create multiple variations of each template
      for (let i = 0; i < 3; i++) {
        const location = locations[Math.floor(Math.random() * locations.length)];
        const reportedBy = users[Math.floor(Math.random() * users.length)];
        const assignedTo = Math.random() > 0.6 ? users[Math.floor(Math.random() * users.length)] : null;
        
        const issue = {
          title: template.title,
          description: template.description,
          category: category._id,
          location: {
            type: 'Point',
            coordinates: location.coordinates,
            address: location.address,
          },
          status: statuses[Math.floor(Math.random() * statuses.length)],
          priority: template.priority || priorities[Math.floor(Math.random() * priorities.length)],
          reportedBy: reportedBy._id,
          assignedTo: assignedTo ? assignedTo._id : null,
          tags: template.tags || [],
          views: Math.floor(Math.random() * 150) + 10,
          isPublic: true,
          // Add some random votes and followers
          votes: {
            upvotes: users.slice(0, Math.floor(Math.random() * 5)).map(u => u._id),
            downvotes: Math.random() > 0.8 ? [users[0]._id] : [],
          },
          followers: users.slice(0, Math.floor(Math.random() * 8)).map(u => u._id),
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        };

        if (issue.status === 'resolved') {
          issue.resolvedAt = new Date();
        }

        issues.push(issue);
      }
    }
  }

  try {
    const createdIssues = await Issue.insertMany(issues);
    console.log(`✅ Created ${createdIssues.length} issues`);
    return createdIssues;
  } catch (error) {
    console.error('❌ Error creating issues:', error);
    throw error;
  }
};

// Get existing users (assuming some users exist)
const getUsers = async () => {
  const users = await User.find().limit(10);
  if (users.length === 0) {
    console.log('⚠️ No users found. Creating a sample user...');
    const sampleUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'citizen',
      location: {
        type: 'Point',
        coordinates: [90.4125, 23.8103],
      },
    });
    return [sampleUser];
  }
  return users;
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    // Clean existing data
    await cleanDatabase();
    
    // Create categories
    const createdCategories = await createCategories();
    
    // Get users
    const users = await getUsers();
    console.log(`📊 Found ${users.length} users for seeding`);
    
    // Create issues
    await generateIssues(createdCategories, users);
    
    console.log('🎉 Database seeding completed successfully!');
    
    // Print summary
    const categoryCount = await Category.countDocuments();
    const issueCount = await Issue.countDocuments();
    const interactionCount = await Interaction.countDocuments();
    
    console.log('\n📊 Database Summary:');
    console.log(`Categories: ${categoryCount}`);
    console.log(`Issues: ${issueCount}`);
    console.log(`Interactions: ${interactionCount}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run seeding
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };