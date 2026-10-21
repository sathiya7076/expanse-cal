import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    amount: { type: Number, required: true, min: 0.01, max: 1e9 },
    date: { type: Date, required: true },
    paymentMethod: { type: String, trim: true, maxlength: 50, default: '' },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    receiptImage: { type: String, default: null },
    receiptHash: { type: String, default: null },
    source: { type: String, enum: ['manual', 'receipt'], default: 'manual' },
    // Set only for salary payments, to stop the same salary period being recorded twice.
    salaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salary', default: null },
    periodKey: { type: String, default: null },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, category: 1, date: -1 });
// One saved transaction per receipt image per user.
transactionSchema.index(
  { userId: 1, receiptHash: 1 },
  { unique: true, partialFilterExpression: { receiptHash: { $type: 'string' } } }
);
// One payment per salary record per pay period.
transactionSchema.index(
  { userId: 1, salaryId: 1, periodKey: 1 },
  { unique: true, partialFilterExpression: { salaryId: { $type: 'objectId' }, periodKey: { $type: 'string' } } }
);

export default mongoose.model('Transaction', transactionSchema);
