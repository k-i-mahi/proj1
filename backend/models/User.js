const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['resident', 'authority', 'admin'],
      default: 'resident',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', null],
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    profession: {
      type: String,
      trim: true,
      maxlength: [100, 'Profession cannot be more than 100 characters'],
      default: '',
    },
    location: {
      // --- START FIX ---
      // Updated to GeoJSON format for geospatial queries
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // Stores as [longitude, latitude]
        required: [true, 'Location coordinates are required'],
        validate: {
          validator: function (coords) {
            return (
              Array.isArray(coords) &&
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 && // Longitude
              coords[1] >= -90 &&
              coords[1] <= 90 // Latitude
            );
          },
          message: 'Invalid coordinates. Must be [longitude, latitude].',
        },
      },
      // --- END FIX ---
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// --- START FIX ---
// Create 2dsphere index for geospatial location queries
userSchema.index({ location: '2dsphere' });
// --- END FIX ---

module.exports = mongoose.model('User', userSchema);
