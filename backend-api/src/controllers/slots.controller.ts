import { Request, Response } from 'express';
import prisma from '../config/prisma';

const parseTime = (timeValue: string): Date => {
    if (timeValue.includes('T')) return new Date(timeValue);
    const normalized = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
    return new Date(`1970-01-01T${normalized}Z`);
};

export const getSlots = async (req: Request, res: Response) => {
    const { idTerapeuta } = req.query;

    try {
        const slots = await prisma.slotdisponibilidad.findMany({
            where: {
                ...(idTerapeuta && { idTerapeuta: Number(idTerapeuta) })
            },
            include: {
                terapeuta: {
                    select: {
                        idTerapeuta: true,
                        nombre: true,
                        aPaterno: true,
                        aMaterno: true,
                        especialidad: true
                    }
                }
            },
            orderBy: [
                { fecha: 'asc' },
                { inicio: 'asc' }
            ]
        });
        res.json(slots);
    } catch (error) {
        console.error('Error al obtener slots:', error);
        res.status(500).json({ error: 'Error al obtener los horarios disponibles' });
    }
};

export const createSlot = async (req: Request, res: Response) => {
    const { inicio, fin, fecha, estado, idTerapeuta } = req.body;

    if (!inicio || !fin || !fecha || !idTerapeuta) {
        res.status(400).json({ error: 'Debes indicar terapeuta, fecha, hora de inicio y hora de fin' });
        return;
    }

    const horaInicio = parseTime(inicio);
    const horaFin = parseTime(fin);

    if (horaInicio >= horaFin) {
        res.status(400).json({ error: 'Horario inválido: la hora de inicio debe ser anterior a la hora de fin' });
        return;
    }

    const ahora = new Date();
    const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    if (fecha < hoyStr) {
        res.status(400).json({ error: 'Horario inválido: no puedes registrar disponibilidad en una fecha pasada' });
        return;
    }

    try {
        const fechaDate = new Date(fecha);
        const terapeutaId = Number(idTerapeuta);

        const traslape = await prisma.slotdisponibilidad.findFirst({
            where: {
                idTerapeuta: terapeutaId,
                fecha: fechaDate,
                AND: [
                    { inicio: { lt: horaFin } },
                    { fin: { gt: horaInicio } }
                ]
            }
        });

        if (traslape) {
            res.status(409).json({
                error: 'Horario duplicado o traslapado: el terapeuta ya tiene un bloque registrado en ese rango de horas'
            });
            return;
        }

        const nuevoSlot = await prisma.slotdisponibilidad.create({
            data: {
                inicio: horaInicio,
                fin: horaFin,
                fecha: fechaDate,
                estado: estado !== undefined ? Number(estado) : 1,
                idTerapeuta: terapeutaId
            }
        });
        res.status(201).json(nuevoSlot);
    } catch (error) {
        console.error('Error al crear slot:', error);
        res.status(500).json({ error: 'Error al registrar el horario disponible' });
    }
};

export const updateSlot = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { inicio, fin, fecha, estado, idTerapeuta } = req.body;

    try {
        const slotActualizado = await prisma.slotdisponibilidad.update({
            where: { idSlot: id },
            data: {
                ...(inicio !== undefined && { inicio: parseTime(inicio) }),
                ...(fin !== undefined && { fin: parseTime(fin) }),
                ...(fecha !== undefined && { fecha: new Date(fecha) }),
                ...(estado !== undefined && { estado: Number(estado) }),
                ...(idTerapeuta !== undefined && { idTerapeuta: Number(idTerapeuta) })
            }
        });
        res.json(slotActualizado);
    } catch (error) {
        console.error('Error al actualizar slot:', error);
        res.status(500).json({ error: 'Error al actualizar el horario' });
    }
};

export const deleteSlot = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.slotdisponibilidad.delete({
            where: { idSlot: id }
        });
        res.json({ mensaje: 'Horario eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar slot:', error);
        res.status(500).json({ error: 'No se pudo eliminar el horario (verifica si ya tiene una cita asignada)' });
    }
};