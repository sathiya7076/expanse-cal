import { Router } from 'express';
import { create, getOne, list, remove, update } from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { createTransactionRules, idParam, listTransactionRules, updateTransactionRules } from '../middleware/validators.js';

const router = Router();
router.use(protect);
router.get('/', listTransactionRules, validate, list);
router.post('/', createTransactionRules, validate, create);
router.get('/:id', idParam, validate, getOne);
router.put('/:id', updateTransactionRules, validate, update);
router.delete('/:id', idParam, validate, remove);
export default router;
