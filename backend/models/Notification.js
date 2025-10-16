const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
    },
    type: {
      type: String,
      enum: [
        'issue_created',
        'issue_assigned',
        'status_changed',
        'new_comment',
        'mentioned',
        'issue_resolved',
        'upvote_received',
        'follower_update',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    icon: {
      type: String,
      default: '🔔',
    },
    link: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      oldStatus: String,
      newStatus: String,
      commentText: String,
      voteCount: Number,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for better performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1 });

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function () {
  const seconds = Math.floor((new Date() - this.createdAt) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return this.createdAt.toLocaleDateString();
});

notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function (data) {
  try {
    const notification = await this.create(data);
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
