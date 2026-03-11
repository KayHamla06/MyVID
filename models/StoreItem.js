const mongoose = require('mongoose');

const storeItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [120, 'Item name cannot exceed 120 characters']
  },
  imageUrl: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: [80, 'Category cannot exceed 80 characters']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

storeItemSchema.index({ createdAt: -1 });
storeItemSchema.index({ category: 1, name: 1, price: 1 });

module.exports = mongoose.model('StoreItem', storeItemSchema);