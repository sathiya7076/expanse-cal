import { Router } from 'express';
import { confirm, scan } from '../controllers/receiptController.js';
import { protect } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import upload from '../middleware/upload.js';
import validate from '../middleware/validate.js';
import { confirmReceiptRules } from '../middleware/validators.js';

const router = Router();
router.use(protect);
// protect runs first so the upload file name can include the user id; the field name is "receipt".
router.post('/scan', uploadLimiter, upload.single('receipt'), scan);
router.post('/confirm', confirmReceiptRules, validate, confirm);
export default router;
