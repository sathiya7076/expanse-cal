import mongoose from 'mongoose';
import { FREQUENCIES } from '../config/constants.js';

const salarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeName: { type: String, required: true, trim: true, maxlength: 100 },
    companyName: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0.01, max: 1e9 },
    paymentFrequency: { type: String, enum: FREQUENCIES, default: 'Monthly' },
    paymentDate: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Salary', salarySchema);
