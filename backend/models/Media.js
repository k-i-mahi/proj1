const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: String,
    url: {
      type: String,
      required: true,
    },
    publicId: String, // Cloudinary/S3 ID
    fileType: {
      type: String,
      enum: ['image', 'video', 'document', 'audio'],
      required: true,
    },
    mimeType: String,
    fileSize: {
      type: Number,
      required: true,
      max: 10485760, // 10MB
    },
    dimensions: {
      width: Number,
      height: Number,
    },
    thumbnail: String,
    isMain: {
      type: Boolean,
      default: false,
    },
    metadata: {
      duration: Number, // for videos
      pages: Number, // for PDFs
      compression: String,
    },
  },
  {
    timestamps: true,
  },
);

mediaSchema.index({ issue: 1, fileType: 1 });
mediaSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaSchema.index({ fileType: 1 });

// Static method to get storage stats
mediaSchema.statics.getStorageStats = async function (userId) {
  return this.aggregate([
    { $match: { uploadedBy: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$fileType',
        totalSize: { $sum: '$fileSize' },
        count: { $sum: 1 },
      },
    },
  ]);
};

module.exports = mongoose.model('Media', mediaSchema);
