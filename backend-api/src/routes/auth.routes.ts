import { Router } from 'express';
import {
    login,
    consultarUsuarios,
    registrarUsuario,
    actualizarUsuario,
    eliminarUsuario
} from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/registro', registrarUsuario);
router.get('/usuarios', consultarUsuarios);
router.put('/usuarios/:id', actualizarUsuario);
router.delete('/usuarios/:id', eliminarUsuario);

export default router;