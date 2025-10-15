
const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['comment', 'vote', 'follow', 'like', 'mention'],
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
interactionSchema.index({ issue: 1, type: 1 });
interactionSchema.index({ user: 1, type: 1 });
interactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Interaction', interactionSchema);