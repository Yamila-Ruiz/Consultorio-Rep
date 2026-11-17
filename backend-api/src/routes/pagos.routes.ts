import { Router } from 'express';
import {
    getPagos,
    createPago,
    updatePago,
    deletePago
} from '../controllers/pagos.controller';

const router = Router();

router.get('/', getPagos);
router.post('/', createPago);
router.put('/:id', updatePago);
router.delete('/:id', deletePago);

export default router;