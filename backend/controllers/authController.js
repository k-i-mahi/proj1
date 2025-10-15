const User = require('../models/User');
const Issue = require('../models/Issue');
const Interaction = require('../models/Interaction');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Helper function to format user data for responses
// Converts GeoJSON [lon, lat] to { latitude, longitude } for the frontend
const formatUserResponse = (user) => {
  if (!user) return null;

  // Ensure we are working with a plain object
  const userData = user.toObject ? user.toObject() : { ...user };

  // Denormalize location for the frontend
  if (userData.location && userData.location.coordinates) {
    userData.location = {
      latitude: userData.location.coordinates[1], // Get latitude from index 1
      longitude: userData.location.coordinates[0], // Get longitude from index 0
      address: userData.location.address || '',
    };
  }

  // Ensure password is never sent
  delete userData.password;

  return userData;
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const {
      name,
      email,
      password,
      role,
      gender,
      dateOfBirth,
      profession,
      latitude,
      longitude,
      address,
      avatar,
    } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Validate location
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location (latitude and longitude) is required',
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    // Validate coordinates
    if (
      isNaN(lat) ||
      isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180',
      });
    }

    // Create user data object
    const userData = {
      name,
      email,
      password,
      role: role || 'resident',
      gender: gender || null,
      dateOfBirth: dateOfBirth || null,
      profession: profession || '',
      location: {
        type: 'Point',
        coordinates: [lon, lat], // [longitude, latitude] for GeoJSON
      },
      avatar: avatar || '',
    };

    // Add address if provided
    if (address) {
      userData.location.address = address;
    }

    // Create user
    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: formatUserResponse(user),
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid user data',
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact support.',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login (optional - add this field to User model if needed)
    // user.lastLogin = new Date();
    // await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Login successful',
      data: formatUserResponse(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/updateprofile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const {
      name,
      email,
      gender,
      dateOfBirth,
      profession,
      latitude,
      longitude,
      address,
      avatar,
    } = req.body;

    // Update name if provided
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name is required',
        });
      }
      user.name = name.trim();
    }

    // Update email if provided
    if (email !== undefined) {
      if (!email.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }
      // Check if email is already taken by another user
      if (email !== user.email) {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (
          existingUser &&
          existingUser._id.toString() !== user._id.toString()
        ) {
          return res.status(400).json({
            success: false,
            message: 'Email is already taken',
          });
        }
      }
      user.email = email.toLowerCase().trim();
    }

    // Update gender
    if (gender !== undefined) {
      if (gender === null || gender === '') {
        user.gender = null;
      } else if (['male', 'female', 'other'].includes(gender)) {
        user.gender = gender;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Gender must be male, female, or other',
        });
      }
    }

    // Update date of birth
    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || dateOfBirth === '') {
        user.dateOfBirth = null;
      } else {
        const date = new Date(dateOfBirth);
        if (isNaN(date.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date of birth',
          });
        }
        // Check if date is not in the future
        if (date > new Date()) {
          return res.status(400).json({
            success: false,
            message: 'Date of birth cannot be in the future',
          });
        }
        user.dateOfBirth = date;
      }
    }

    // Update profession
    if (profession !== undefined) {
      if (profession === null || profession === '') {
        user.profession = '';
      } else if (typeof profession === 'string') {
        if (profession.length > 100) {
          return res.status(400).json({
            success: false,
            message: 'Profession cannot exceed 100 characters',
          });
        }
        user.profession = profession.trim();
      }
    }

    // Update avatar
    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    // Update location if provided
    if (latitude !== undefined && longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      // Validate coordinates
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates format',
        });
      }

      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({
          success: false,
          message:
            'Coordinates out of range. Latitude: -90 to 90, Longitude: -180 to 180',
        });
      }

      user.location = {
        type: 'Point',
        coordinates: [lon, lat], // [longitude, latitude] for GeoJSON
      };

      // Add address if provided
      if (address !== undefined) {
        user.location.address = address;
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Update profile error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during profile update',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/updatepassword
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Check if new password is same as current
    const isSame = await user.comparePassword(newPassword);
    if (isSame) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password change',
    });
  }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/auth/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    // Get user's issue statistics
    const issueStats = await Issue.aggregate([
      {
        $match: {
          $or: [{ reportedBy: req.user._id }, { assignedTo: req.user._id }],
        },
      },
      {
        $group: {
          _id: null,
          totalReported: {
            $sum: { $cond: [{ $eq: ['$reportedBy', req.user._id] }, 1, 0] },
          },
          totalAssigned: {
            $sum: { $cond: [{ $eq: ['$assignedTo', req.user._id] }, 1, 0] },
          },
          resolved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['resolved', 'closed']] },
                    {
                      $or: [
                        { $eq: ['$reportedBy', req.user._id] },
                        { $eq: ['$assignedTo', req.user._id] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          inProgress: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'in-progress'] },
                    { $eq: ['$assignedTo', req.user._id] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          open: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'open'] },
                    { $eq: ['$reportedBy', req.user._id] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Get interaction statistics
    const interactionStats = await Interaction.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      issues: issueStats[0] || {
        totalReported: 0,
        totalAssigned: 0,
        resolved: 0,
        inProgress: 0,
        open: 0,
      },
      interactions: {
        comments: interactionStats.find((s) => s._id === 'comment')?.count || 0,
        upvotes: interactionStats.find((s) => s._id === 'upvote')?.count || 0,
        downvotes:
          interactionStats.find((s) => s._id === 'downvote')?.count || 0,
        follows: interactionStats.find((s) => s._id === 'follow')?.count || 0,
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
    });
  }
};

// @desc    Verify email (for future implementation)
// @route   GET /api/auth/verify/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    // TODO: Implement email verification
    res.json({
      success: true,
      message: 'Email verification not yet implemented',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Forgot password (for future implementation)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    // TODO: Implement forgot password
    res.json({
      success: true,
      message: 'Forgot password not yet implemented',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Reset password (for future implementation)
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    // TODO: Implement reset password
    res.json({
      success: true,
      message: 'Reset password not yet implemented',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
  getUserStats,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
