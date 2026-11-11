import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ================= TERAPEUTAS =================

// Obtener todos los terapeutas
app.get('/api/terapeutas', async (req, res) => {
    try {
        const terapeutas = await prisma.terapeuta.findMany({
            include: { usuario: true }
        });
        res.json(terapeutas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener terapeutas' });
    }
});

// Registrar un terapeuta
app.post('/api/terapeutas', async (req, res) => {
    const { nombreCompleto, contactoTelefonico, especialidad, idUsuario } = req.body;
    try {
        const nuevoTerapeuta = await prisma.terapeuta.create({
            data: {
                nombreCompleto,
                contactoTelefonico,
                especialidad,
                idUsuario: Number(idUsuario) || 1 // ID de usuario asociado por defecto
            }
        });
        res.status(201).json(nuevoTerapeuta);
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar terapeuta' });
    }
});

// ================= PACIENTES =================

// Obtener todos los pacientes con su terapeuta asignado
app.get('/api/pacientes', async (req, res) => {
    try {
        const pacientes = await prisma.paciente.findMany({
            include: {
                terapeuta: true
            }
        });
        res.json(pacientes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener pacientes' });
    }
});

// Registrar un nuevo paciente (y asignarlo a un terapeuta)
app.post('/api/pacientes', async (req, res) => {
    const {
        nombre,
        aPaterno,
        aMaterno,
        edad,
        contactoTelefonico,
        nombreFacturacion,
        correoFacturacion,
        idTerapeuta
    } = req.body;

    try {
        const nuevoPaciente = await prisma.paciente.create({
            data: {
                nombre,
                aPaterno,
                aMaterno,
                edad: Number(edad),
                contactoTelefonico,
                nombreFacturacion,
                correoFacturacion,
                idTerapeuta: Number(idTerapeuta)
            }
        });
        res.status(201).json(nuevoPaciente);
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar paciente' });
    }
});

// Actualizar datos de un paciente (incluyendo cambiar terapeuta asignado)
app.put('/api/pacientes/:id', async (req, res) => {
    const { id } = req.params;
    const {
        nombre,
        aPaterno,
        aMaterno,
        edad,
        contactoTelefonico,
        nombreFacturacion,
        correoFacturacion,
        idTerapeuta
    } = req.body;

    try {
        const pacienteActualizado = await prisma.paciente.update({
            where: { idPaciente: Number(id) },
            data: {
                nombre,
                aPaterno,
                aMaterno,
                edad: Number(edad),
                contactoTelefonico,
                nombreFacturacion,
                correoFacturacion,
                idTerapeuta: Number(idTerapeuta)
            }
        });
        res.json(pacienteActualizado);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar paciente' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
});