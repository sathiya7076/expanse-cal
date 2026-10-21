import { Router } from 'express';
import { create, list, remove, update } from '../controllers/salaryController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { idParam, salaryRules } from '../middleware/validators.js';

const router = Router();
router.use(protect);
router.get('/', list);
router.post('/', salaryRules, validate, create);
router.put('/:id', idParam, salaryRules, validate, update);
router.delete('/:id', idParam, validate, remove);
export default router;
