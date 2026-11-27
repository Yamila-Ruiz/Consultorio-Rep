import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import terapeutasRoutes from './routes/terapeutas.routes';
import pacientesRoutes from './routes/pacientes.routes';
import serviciosRoutes from './routes/servicios.routes';
import slotsRoutes from './routes/slots.routes';
import citasRoutes from "./routes/citas.routes";
import pagosRoutes from "./routes/pagos.routes";
import multasRoutes from './routes/multas.routes';
import { isRecord } from './utils/requestValidation';

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !isRecord(req.body)) {
        res.status(400).json({ error: 'El cuerpo de la solicitud debe ser un objeto JSON.' });
        return;
    }
    next();
});

app.get('/', (req, res) => {
    res.send('Servidor Backend del Consultorio funcionando');
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/terapeutas', terapeutasRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/multas', multasRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (
        typeof error === 'object' &&
        error !== null &&
        'type' in error &&
        error.type === 'entity.parse.failed'
    ) {
        res.status(400).json({ error: 'El cuerpo de la solicitud contiene JSON inválido.' });
        return;
    }
    if (
        typeof error === 'object' &&
        error !== null &&
        'type' in error &&
        error.type === 'entity.too.large'
    ) {
        res.status(413).json({ error: 'El cuerpo de la solicitud es demasiado grande.' });
        return;
    }
    console.error('Error no controlado en la API:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);

});