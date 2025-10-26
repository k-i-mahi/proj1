const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      default: '📁',
    },
    color: {
      type: String,
      default: '#667eea',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
    metadata: {
      issueCount: { type: Number, default: 0 },
      resolvedCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Category', categorySchema);
