const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      maxlength: [2000, 'Description cannot be more than 2000 characters'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please specify a category'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      address: String,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed', 'rejected'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    images: [
      {
        url: String,
        publicId: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: {
      type: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          commentText: {
            type: String,
            required: true,
          },
          isInternal: {
            type: Boolean,
            default: false,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
          updatedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    votes: {
      upvotes: {
        type: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        default: [],
      },
      downvotes: {
        type: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        default: [],
      },
    },
    followers: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    statusHistory: [
      {
        status: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        comment: String,
      },
    ],
    resolvedAt: Date,
    closedAt: Date,

    // --- Added fields ---
    rejectionReason: { type: String, default: null },
    tags: { type: [String], default: [] },
    views: { type: Number, default: 0 },
    stats: {
      upvotes: { type: Number, default: 0 },
      downvotes: { type: Number, default: 0 },
      commentCount: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      followerCount: { type: Number, default: 0 },
    },
    // --------------------
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
issueSchema.index({ location: '2dsphere' });
issueSchema.index({ status: 1, createdAt: -1 });
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ reportedBy: 1 });
issueSchema.index({ assignedTo: 1 });
issueSchema.index({ 'votes.upvotes': 1 });
issueSchema.index({ 'votes.downvotes': 1 });
issueSchema.index({ followers: 1 });
issueSchema.index({ tags: 1 });

// Pre-save middleware to auto-calculate stats when relevant fields changed
issueSchema.pre('save', function (next) {
  // Only recalc when votes/comments/followers/views changed OR stats is empty
  if (
    this.isModified('votes') ||
    this.isModified('comments') ||
    this.isModified('followers') ||
    this.isModified('views') ||
    !this.stats
  ) {
    const up = this.votes?.upvotes?.length || 0;
    const down = this.votes?.downvotes?.length || 0;
    const comments = this.comments?.length || 0;
    const followers = this.followers?.length || 0;
    const views = this.views || 0;

    this.stats = {
      upvotes: up,
      downvotes: down,
      commentCount: comments,
      views: views,
      followerCount: followers,
    };
  }
  next();
});

// Instance method to increment views atomically and update stats.views
issueSchema.methods.incrementViews = async function () {
  // Use document increment then save
  this.views = (this.views || 0) + 1;
  // Keep stats.views in sync
  if (!this.stats) this.stats = {};
  this.stats.views = this.views;
  return this.save();
};

module.exports = mongoose.model('Issue', issueSchema);
