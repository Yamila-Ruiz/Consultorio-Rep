import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getTerapeutas = async (req: Request, res: Response) => {
    try {
        const terapeutas = await prisma.terapeuta.findMany({
            include: {
                usuario: {
                    select: {
                        idUsuario: true,
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
//Validaciones de longitud y espacios vacios
export const createTerapeuta = async (req: Request, res: Response) => {
    const { nombreCompleto, contactoTelefonico, especialidad, idUsuario } = req.body;

    if (!idUsuario || !nombreCompleto?.trim() || !especialidad?.trim()) {
        res.status(400).json({ error: 'Debes completar nombre, especialidad e idUsuario del terapeuta' });
        return;
    }

    try {
        const nuevoTerapeuta = await prisma.terapeuta.create({
            data: {
                nombreCompleto: String(nombreCompleto).trim(),
                contactoTelefonico: String(contactoTelefonico || '').trim().slice(0, 10),
                especialidad: String(especialidad).trim().slice(0, 30),
                idUsuario: Number(idUsuario)
            }
        });
        res.status(201).json(nuevoTerapeuta);
    } catch (error) {
        console.error('Error al crear terapeuta:', error);
        res.status(500).json({ error: 'Error al registrar el terapeuta' });
    }
};
//Actualizar terapeuta
export const updateTerapeuta = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { nombreCompleto, contactoTelefonico, especialidad, idUsuario } = req.body;

    try {
        const terapeutaActualizado = await prisma.terapeuta.update({
            where: { idTerapeuta: id },
            data: {
                ...(nombreCompleto !== undefined && { nombreCompleto: String(nombreCompleto).trim() }),
                ...(contactoTelefonico !== undefined && { contactoTelefonico: String(contactoTelefonico).trim().slice(0, 10) }),
                ...(especialidad !== undefined && { especialidad: String(especialidad).trim().slice(0, 30) }),
                ...(idUsuario !== undefined && { idUsuario: Number(idUsuario) })
            }
        });
        res.json(terapeutaActualizado);
    } catch (error) {
        console.error('Error al actualizar terapeuta:', error);
        res.status(500).json({ error: 'Error al actualizar el terapeuta' });
    }
};
//Eliminar terapeuta
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