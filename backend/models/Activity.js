const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'created',
        'updated',
        'commented',
        'status_changed',
        'assigned',
        'resolved',
        'closed',
        'reopened',
        'voted',
        'followed',
        'unfollowed',
        'priority_changed',
        'category_changed',
        'deleted',
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    changes: {
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
    },
    metadata: {
      // Comment-specific
      commentText: {
        type: String,
        maxlength: 200,
      },

      // Assignment-specific
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      assignedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

      // Vote-specific
      voteType: {
        type: String,
        enum: ['upvote', 'downvote'],
      },

      // Status change specific
      oldStatus: String,
      newStatus: String,

      // Priority change specific
      oldPriority: String,
      newPriority: String,

      // Category change specific
      oldCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
      newCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },

      // Technical metadata
      ipAddress: String,
      userAgent: String,
      source: {
        type: String,
        enum: ['web', 'mobile', 'api', 'admin'],
        default: 'web',
      },
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for better query performance
activitySchema.index({ issue: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });
activitySchema.index({ issue: 1, action: 1 });
activitySchema.index({ user: 1, action: 1 });

// Auto-delete activities older than 90 days (optional)
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Virtual for time ago
activitySchema.virtual('timeAgo').get(function () {
  const seconds = Math.floor((new Date() - this.createdAt) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Virtual for action icon
activitySchema.virtual('actionIcon').get(function () {
  const icons = {
    created: '🆕',
    updated: '✏️',
    commented: '💬',
    status_changed: '🔄',
    assigned: '📌',
    resolved: '✅',
    closed: '🔒',
    reopened: '🔓',
    voted: '👍',
    followed: '⭐',
    unfollowed: '⭕',
    priority_changed: '🔥',
    category_changed: '📁',
    deleted: '🗑️',
  };
  return icons[this.action] || '📝';
});

// Enable virtuals in JSON
activitySchema.set('toJSON', { virtuals: true });
activitySchema.set('toObject', { virtuals: true });

// Static method to create activity with defaults
activitySchema.statics.logActivity = async function (data) {
  try {
    const activity = await this.create({
      ...data,
      metadata: {
        ...data.metadata,
        source: data.metadata?.source || 'web',
      },
    });
    return activity;
  } catch (error) {
    console.error('Log activity error:', error);
    throw error;
  }
};

// Static method to get recent activities
activitySchema.statics.getRecent = async function (options = {}) {
  const {
    limit = 20,
    skip = 0,
    userId,
    issueId,
    action,
    populate = true,
  } = options;

  const query = {};
  if (userId) query.user = userId;
  if (issueId) query.issue = issueId;
  if (action) query.action = action;

  let queryBuilder = this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  if (populate) {
    queryBuilder = queryBuilder
      .populate('user', 'name avatar role')
      .populate('issue', 'title status category')
      .populate('metadata.assignedTo', 'name avatar')
      .populate('metadata.oldCategory', 'name displayName icon')
      .populate('metadata.newCategory', 'name displayName icon');
  }

  return await queryBuilder.lean();
};

// Instance method to format for display
activitySchema.methods.formatForDisplay = function () {
  return {
    id: this._id,
    action: this.action,
    actionIcon: this.actionIcon,
    description: this.description,
    reason: this.reason,
    user: this.user,
    issue: this.issue,
    timeAgo: this.timeAgo,
    createdAt: this.createdAt,
    metadata: this.metadata,
  };
};

// Pre-save hook to generate description if not provided
activitySchema.pre('save', function (next) {
  if (!this.description) {
    const actionDescriptions = {
      created: 'created this issue',
      updated: 'updated this issue',
      commented: 'added a comment',
      status_changed: `changed status to ${this.metadata?.newStatus}`,
      assigned: `assigned this issue to ${this.metadata?.assignedTo}`,
      resolved: 'marked this issue as resolved',
      closed: 'closed this issue',
      reopened: 'reopened this issue',
      voted: 'voted on this issue',
      followed: 'started following this issue',
      unfollowed: 'stopped following this issue',
      priority_changed: `changed priority to ${this.metadata?.newPriority}`,
      category_changed: 'changed the category',
      deleted: 'deleted this issue',
    };

    this.description = actionDescriptions[this.action] || 'performed an action';
  }
  next();
});

module.exports = mongoose.model('Activity', activitySchema);
