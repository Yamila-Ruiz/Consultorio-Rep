import { Router } from 'express';
import {
    getTerapeutas,
    createTerapeuta,
    updateTerapeuta,
    deleteTerapeuta
} from '../controllers/terapeutas.controller';

const router = Router();

router.get('/', getTerapeutas);
router.post('/', createTerapeuta);
router.put('/:id', updateTerapeuta);
router.delete('/:id', deleteTerapeuta);

export default router;