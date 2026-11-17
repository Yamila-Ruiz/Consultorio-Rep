import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Obtener todos los terapeutas
export const getTerapeutas = async (req: Request, res: Response) => {
    try {
        const terapeutas = await prisma.terapeuta.findMany({
            include: {
                usuario: {
                    select: {
                        idUsuario: true,
                        codigo: true,
                        nombreUsuario: true
                    }
                }
            }
        });
        res.json(terapeutas);
    } catch (error) {
        console.error('Error al obtener terapeutas:', error);
        res.status(500).json({ error: 'Error al obtener la lista de terapeutas' });
    }
};

// Crear un nuevo terapeuta
export const createTerapeuta = async (req: Request, res: Response) => {
    const { codigo, nombreCompleto, contactoTelefonico, especialidad, idUsuario } = req.body;

    try {
        // Genera un código de máximo 10 caracteres si no viene desde el frontend
        const codigoFinal = codigo || `TER-${Math.floor(10000 + Math.random() * 90000)}`;

        const nuevoTerapeuta = await prisma.terapeuta.create({
            data: {
                codigo: codigoFinal,
                nombreCompleto,
                contactoTelefonico,
                especialidad,
                idUsuario: Number(idUsuario) || 1
            }
        });
        res.status(201).json(nuevoTerapeuta);
    } catch (error) {
        console.error('Error al crear terapeuta:', error);
        res.status(500).json({ error: 'Error al registrar el terapeuta' });
    }
};

// Actualizar un terapeuta existente
export const updateTerapeuta = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { nombreCompleto, contactoTelefonico, especialidad, idUsuario } = req.body;

    try {
        const terapeutaActualizado = await prisma.terapeuta.update({
            where: { idTerapeuta: id },
            data: {
                nombreCompleto,
                contactoTelefonico,
                especialidad,
                ...(idUsuario && { idUsuario: Number(idUsuario) })
            }
        });
        res.json(terapeutaActualizado);
    } catch (error) {
        console.error('Error al actualizar terapeuta:', error);
        res.status(500).json({ error: 'Error al actualizar el terapeuta' });
    }
};

// Eliminar un terapeuta
export const deleteTerapeuta = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.terapeuta.delete({
            where: { idTerapeuta: id }
        });
        res.json({ mensaje: 'Terapeuta eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar terapeuta:', error);
        res.status(500).json({ error: 'No se pudo eliminar el terapeuta (verifica si tiene pacientes o citas asociadas)' });
    }
};