import { Router } from 'express';
import { categories, monthly, yearly } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { periodQuery } from '../middleware/validators.js';

const router = Router();
router.use(protect, periodQuery, validate);
router.get('/monthly', monthly);
router.get('/yearly', yearly);
router.get('/categories', categories);
export default router;
