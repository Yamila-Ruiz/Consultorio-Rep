import { Router } from 'express';
import { getMultas } from '../controllers/multas.controller';

const router = Router();

router.get('/', getMultas);

export default router;
