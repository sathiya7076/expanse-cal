import Transaction from '../models/Transaction.js';

/** Flags a scan that matches something already saved. This only warns; the user still decides. */
export async function findDuplicate(userId, hash, fields) {
  const byImage = await Transaction.exists({ userId, receiptHash: hash });
  if (byImage) {
    return { isDuplicate: true, reason: 'image', message: 'This exact receipt image has already been saved.' };
  }
  if (fields.amount && fields.date) {
    const day = new Date(fields.date);
    const next = new Date(day);
    next.setUTCDate(next.getUTCDate() + 1);
    const similar = await Transaction.findOne({
      userId, type: 'expense', amount: fields.amount, date: { $gte: day, $lt: next },
    }).select('description').lean();
    if (similar) {
      return {
        isDuplicate: true,
        reason: 'details',
        message: `You already have an expense of this amount on this date ("${similar.description}"). Check it is not the same bill.`,
      };
    }
  }
  return { isDuplicate: false, reason: null, message: '' };
}
