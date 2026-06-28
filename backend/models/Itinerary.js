const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  shareId: {
    type: String,
    sparse: true,
    unique: true
  },
  isShared: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,
    required: true
  },
  budget: {
    type: String,
    required: true
  },
  interests: {
    type: [String],
    default: []
  },
  weather: {
    temp: { type: Number },
    condition: { type: String },
    icon: { type: String },
    forecast: { type: String }
  },
  currency: {
    code: { type: String },
    symbol: { type: String },
    rate: { type: Number }
  },
  images: {
    type: [String],
    default: []
  },
  days: [{
    day: { type: Number },
    morning: { type: String },
    afternoon: { type: String },
    evening: { type: String },
    foodRecommendation: { type: String },
    estimatedCost: { type: String }
  }],
  accommodationSuggestions: {
    type: [String],
    default: []
  },
  travelTips: {
    type: [String],
    default: []
  },
  budgetTracker: {
    estimated: {
      food:          { type: Number, default: 0 },
      accommodation: { type: Number, default: 0 },
      transport:     { type: Number, default: 0 },
      activities:    { type: Number, default: 0 }
    },
    actual: {
      food:          { type: Number, default: 0 },
      accommodation: { type: Number, default: 0 },
      transport:     { type: Number, default: 0 },
      activities:    { type: Number, default: 0 }
    },
    currency: { type: String, default: 'USD' },
    symbol:   { type: String, default: '$' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Itinerary', itinerarySchema);
