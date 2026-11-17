import { Router } from 'express';
import {
    getSlots,
    createSlot,
    updateSlot,
    deleteSlot
} from '../controllers/slots.controller';

const router = Router();

router.get('/', getSlots);
router.post('/', createSlot);
router.put('/:id', updateSlot);
router.delete('/:id', deleteSlot);

export default router;