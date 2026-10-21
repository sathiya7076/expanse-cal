import { Router } from 'express';
import { summary } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { periodQuery } from '../middleware/validators.js';

const router = Router();
router.get('/summary', protect, periodQuery, validate, summary);
export default router;
