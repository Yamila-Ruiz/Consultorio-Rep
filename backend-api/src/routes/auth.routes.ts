import { Router } from 'express';
import {
    login,
    getUsuarios,
    registrarUsuario,
    updateUsuario,
    deleteUsuario
} from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/registro', registrarUsuario);
router.get('/usuarios', getUsuarios);
router.put('/usuarios/:id', updateUsuario);
router.delete('/usuarios/:id', deleteUsuario);

export default router;