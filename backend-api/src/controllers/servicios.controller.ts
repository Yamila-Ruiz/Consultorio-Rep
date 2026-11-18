import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Obtener todos los servicios
export const getServicios = async (req: Request, res: Response) => {
    try {
        const servicios = await prisma.servicio.findMany();
        res.json(servicios);
    } catch (error) {
        console.error('Error al obtener servicios:', error);
        res.status(500).json({ error: 'Error al obtener la lista de servicios' });
    }
};

// Crear un nuevo servicio
export const createServicio = async (req: Request, res: Response) => {
    const { codigo, nombre, descripcion, activo } = req.body;

    try {
        const codigoFinal = codigo || `SRV-${Math.floor(10000 + Math.random() * 90000)}`;

        const nuevoServicio = await prisma.servicio.create({
            data: {
                codigo: codigoFinal,
                nombre: nombre?.toUpperCase(), // MODIFICADO
                descripcion: descripcion || '',
                activo: activo !== undefined ? Number(activo) : 1
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
                ...(nombre !== undefined && { nombre: nombre?.toUpperCase() }), // MODIFICADO
                ...(descripcion !== undefined && { descripcion }),
                ...(activo !== undefined && { activo: Number(activo) })
            }
        });
        res.json(servicioActualizado);
    } catch (error) {
        console.error('Error al actualizar servicio:', error);
        res.status(500).json({ error: 'Error al actualizar el servicio' });
    }
};

// Eliminar un servicio
export const deleteServicio = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.servicio.delete({
            where: { idServicio: id }
        });
        res.json({ mensaje: 'Servicio eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar servicio:', error);
        res.status(500).json({ error: 'No se pudo eliminar el servicio (verifica si tiene citas asociadas)' });
    }
};