import { Router } from 'express';
import { create, list, remove, update } from '../controllers/goalController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { goalRules, goalUpdateRules, idParam } from '../middleware/validators.js';

const router = Router();
router.use(protect);
router.get('/', list);
router.post('/', goalRules, validate, create);
router.put('/:id', goalUpdateRules, validate, update);
router.delete('/:id', idParam, validate, remove);
export default router;
