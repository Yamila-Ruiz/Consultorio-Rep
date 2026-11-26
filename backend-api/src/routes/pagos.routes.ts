import { Router } from 'express';
import {
    getPagos,
    registrarPago,
    updatePago,
    deletePago
} from '../controllers/pagos.controller';

const router = Router();

router.get('/', getPagos);
router.post('/', registrarPago);
router.put('/:id', updatePago);
router.delete('/:id', deletePago);

export default router;