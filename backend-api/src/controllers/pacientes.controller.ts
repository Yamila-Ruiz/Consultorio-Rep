import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Obtener todos los pacientes con los datos básicos de su terapeuta
export const getPacientes = async (req: Request, res: Response) => {
    try {
        const pacientes = await prisma.paciente.findMany({
            include: {
                terapeuta: {
                    select: {
                        idTerapeuta: true,
                        codigo: true,
                        nombreCompleto: true,
                        especialidad: true
                    }
                }
            }
        });
        res.json(pacientes);
    } catch (error) {
        console.error('Error al obtener pacientes:', error);
        res.status(500).json({ error: 'Error al obtener la lista de pacientes' });
    }
};

// Registrar un nuevo paciente
export const createPaciente = async (req: Request, res: Response) => {
    const {
        codigo,
        nombre,
        aPaterno,
        aMaterno,
        edad,
        contactoTelefonico,
        nombreFacturacion,
        correoFacturacion,
        fechaRegistro,
        idTerapeuta
    } = req.body;

    try {
        const codigoFinal = codigo || `PAC-${Math.floor(10000 + Math.random() * 90000)}`;

        const nuevoPaciente = await prisma.paciente.create({
            data: {
                codigo: codigoFinal,
                nombre,
                aPaterno,
                aMaterno,
                edad: Number(edad),
                contactoTelefonico,
                nombreFacturacion: nombreFacturacion || `${nombre} ${aPaterno}`,
                correoFacturacion: correoFacturacion || '',
                fechaRegistro: fechaRegistro ? new Date(fechaRegistro) : new Date(),
                idTerapeuta: Number(idTerapeuta)
            }
        });
        res.status(201).json(nuevoPaciente);
    } catch (error) {
        console.error('Error al crear paciente:', error);
        res.status(500).json({ error: 'Error al registrar el paciente' });
    }
};

// Actualizar un paciente existente
export const updatePaciente = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
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
            where: { idPaciente: id },
            data: {
                nombre,
                aPaterno,
                aMaterno,
                edad: Number(edad),
                contactoTelefonico,
                nombreFacturacion,
                correoFacturacion,
                ...(idTerapeuta && { idTerapeuta: Number(idTerapeuta) })
            }
        });
        res.json(pacienteActualizado);
    } catch (error) {
        console.error('Error al actualizar paciente:', error);
        res.status(500).json({ error: 'Error al actualizar el paciente' });
    }
};

// Eliminar un paciente
export const deletePaciente = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.paciente.delete({
            where: { idPaciente: id }
        });
        res.json({ mensaje: 'Paciente eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar paciente:', error);
        res.status(500).json({ error: 'No se pudo eliminar el paciente (verifica si tiene citas registradas)' });
    }
};