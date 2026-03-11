const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reactionType: {
    type: String,
    enum: ['like', 'love', 'support'],
    required: true
  },
  reactedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  commentedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [120, 'Title cannot exceed 120 characters']
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  imageUrl: {
    type: String,
    default: null
  },
  adminName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Admin name cannot exceed 100 characters']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  reactions: [reactionSchema],
  comments: [commentSchema]
}, {
  timestamps: true
});

postSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);