import mongoose from 'mongoose';

const savingsGoalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    targetAmount: { type: Number, required: true, min: 0.01, max: 1e10 },
    currentAmount: { type: Number, default: 0, min: 0, max: 1e10 },
    targetDate: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.model('SavingsGoal', savingsGoalSchema);
