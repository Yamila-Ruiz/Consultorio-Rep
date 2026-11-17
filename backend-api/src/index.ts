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

const app = express();

app.use(cors());
app.use(express.json());

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

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);

});