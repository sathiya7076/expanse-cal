import { Router } from 'express';
import { create, list, remove, update } from '../controllers/budgetController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { budgetRules, idParam, periodQuery } from '../middleware/validators.js';

const router = Router();
router.use(protect);
router.get('/', periodQuery, validate, list);
router.post('/', budgetRules, validate, create);
router.put('/:id', idParam, budgetRules, validate, update);
router.delete('/:id', idParam, validate, remove);
export default router;
