import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getPacientes = async (req: Request, res: Response) => {
    try {
        const pacientes = await prisma.paciente.findMany({
            include: {
                terapeuta: {
                    select: {
                        idTerapeuta: true,
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

export const createPaciente = async (req: Request, res: Response) => {
    const {
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

    if (!nombre?.trim() || !aPaterno?.trim() || !idTerapeuta) {
        res.status(400).json({ error: 'Nombre, apellido paterno y terapeuta asignado son obligatorios' });
        return;
    }

    try {
        const nuevoPaciente = await prisma.paciente.create({
            data: {
                nombre: String(nombre).trim(),
                aPaterno: String(aPaterno).trim(),
                aMaterno: aMaterno ? String(aMaterno).trim() : '',
                edad: edad !== undefined && edad !== '' ? Number(edad) : 0,
                contactoTelefonico: String(contactoTelefonico || '').trim().slice(0, 10),
                nombreFacturacion: nombreFacturacion?.trim() || `${nombre.trim()} ${aPaterno.trim()}`,
                correoFacturacion: correoFacturacion ? String(correoFacturacion).trim() : '',
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
                ...(nombre !== undefined && { nombre: String(nombre).trim() }),
                ...(aPaterno !== undefined && { aPaterno: String(aPaterno).trim() }),
                ...(aMaterno !== undefined && { aMaterno: String(aMaterno).trim() }),
                ...(edad !== undefined && edad !== '' && { edad: Number(edad) }),
                ...(contactoTelefonico !== undefined && { contactoTelefonico: String(contactoTelefonico).trim().slice(0, 10) }),
                ...(nombreFacturacion !== undefined && { nombreFacturacion: String(nombreFacturacion).trim() }),
                ...(correoFacturacion !== undefined && { correoFacturacion: String(correoFacturacion).trim() }),
                ...(idTerapeuta !== undefined && { idTerapeuta: Number(idTerapeuta) })
            }
        });
        res.json(pacienteActualizado);
    } catch (error) {
        console.error('Error al actualizar paciente:', error);
        res.status(500).json({ error: 'Error al actualizar el paciente' });
    }
};
//Eliminar paciente
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