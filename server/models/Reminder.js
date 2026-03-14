import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['medication', 'meal', 'general', 'workout', 'sin-reflection'], default: 'general', index: true },
  time: { type: String, required: true, index: true },
  date: { type: Date }, // Optional specific date
  daysOfWeek: [{ type: Number, min: 0, max: 6 }],
  isActive: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

// Index for active reminders by time
reminderSchema.index({ isActive: 1, time: 1 });

export default mongoose.model('Reminder', reminderSchema);
