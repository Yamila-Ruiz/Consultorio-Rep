import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Obtener todos los servicios activos
export const getServicios = async (req: Request, res: Response) => {
    try {
        const servicios = await prisma.servicio.findMany({
            orderBy: { nombre: 'asc' }
        });
        res.json(servicios);
    } catch (error) {
        console.error('Error al obtener servicios:', error);
        res.status(500).json({ error: 'Error al obtener la lista de servicios' });
    }
};

// Crear un nuevo servicio
export const createServicio = async (req: Request, res: Response) => {
    const { nombre, descripcion, activo } = req.body;

    if (!nombre?.trim()) {
        res.status(400).json({ error: 'El nombre del servicio es obligatorio' });
        return;
    }

    try {
        const nuevoServicio = await prisma.servicio.create({
            data: {
                nombre: String(nombre).trim().toUpperCase(),
                descripcion: descripcion ? String(descripcion).trim().toUpperCase() : '',
                activo: activo !== undefined ? Boolean(activo) : true
            }
        });
        res.status(201).json(nuevoServicio);
    } catch (error) {
        console.error('Error al crear servicio:', error);
        res.status(500).json({ error: 'Error al registrar el servicio' });
    }
};

// Actualizar un servicio
export const updateServicio = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { nombre, descripcion, activo } = req.body;

    try {
        const servicioActualizado = await prisma.servicio.update({
            where: { idServicio: id },
            data: {
                ...(nombre !== undefined && { nombre: String(nombre).trim().toUpperCase() }),
                ...(descripcion !== undefined && { descripcion: String(descripcion).trim().toUpperCase() }),
                ...(activo !== undefined && { activo: Boolean(activo) })
            }
        });
        res.json(servicioActualizado);
    } catch (error) {
        console.error('Error al actualizar servicio:', error);
        res.status(500).json({ error: 'Error al actualizar el servicio' });
    }
};

// Borrado lógico de un servicio (nunca usa .delete)
export const deleteServicio = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.servicio.update({
            where: { idServicio: id },
            data: { activo: false }
        });
        res.json({ mensaje: 'Servicio dado de baja correctamente' });
    } catch (error) {
        console.error('Error al dar de baja servicio:', error);
        res.status(500).json({ error: 'No se pudo dar de baja el servicio' });
    }
};