import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Elimina automáticamente los horarios DISPONIBLES (no ocupados) cuya fecha y hora ya pasaron
const eliminarSlotsDisponiblesVencidos = async () => {
    const ahora = new Date();
    const hoyUTC = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
    const horaActualUTC = new Date(Date.UTC(1970, 0, 1, ahora.getHours(), ahora.getMinutes(), ahora.getSeconds()));

    await prisma.slotdisponibilidad.deleteMany({
        where: {
            estado: true,
            cita: { none: {} },
            OR: [
                { fecha: { lt: hoyUTC } },
                {
                    fecha: hoyUTC,
                    inicio: { lte: horaActualUTC }
                }
            ]
        }
    });
};

// Obtener horarios posteriores al día actual, ordenados por fecha y hora de inicio
export const getSlots = async (req: Request, res: Response) => {
    try {
        await eliminarSlotsDisponiblesVencidos();

        const ahora = new Date();
        const mananaUTC = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1));

        const slots = await prisma.slotdisponibilidad.findMany({
            where: {
                fecha: { gte: mananaUTC },
                terapeuta: {
                    activo: true
                }
            },
            orderBy: [
                { fecha: 'asc' },
                { inicio: 'asc' }
            ],
            include: {
                terapeuta: {
                    select: {
                        idTerapeuta: true,
                        nombre: true,
                        aPaterno: true,
                        aMaterno: true,
                        especialidad: true,
                        activo: true
                    }
                }
            }
        });
        res.json(slots);
    } catch (error) {
        console.error('Error al obtener horarios:', error);
        res.status(500).json({ error: 'Error al obtener la lista de horarios' });
    }
};

// Registrar nuevo espacio disponible de 1 hora (a partir de mañana)
export const createSlot = async (req: Request, res: Response) => {
    const { idTerapeuta, fecha, inicio } = req.body;
    if (!idTerapeuta || !fecha || !inicio) {
        res.status(400).json({ error: 'Terapeuta, fecha y hora de inicio son obligatorios.' });
        return;
    }

    // ---> PEGA ESTO AQUÍ (antes de validar traslapes y de prisma.slotdisponibilidad.create) <---
    const terapeuta = await prisma.terapeuta.findFirst({
        where: {
            idTerapeuta: Number(idTerapeuta),
            activo: true
        }
    });

    if (!terapeuta) {
        res.status(400).json({ error: 'El terapeuta seleccionado no existe o está dado de baja.' });
        return;
    }

    const terapeutaId = Number(idTerapeuta);
    if (!terapeutaId || !fecha || !inicio) {
        res.status(400).json({ error: 'Terapeuta, fecha y hora de inicio son obligatorios.' });
        return;
    }

    const partesFecha = String(fecha).split('-').map(Number);
    if (partesFecha.length !== 3 || partesFecha.some(Number.isNaN)) {
        res.status(400).json({ error: 'Formato de fecha inválido.' });
        return;
    }

    const [anio, mes, dia] = partesFecha;
    const fechaDate = new Date(Date.UTC(anio, mes - 1, dia));
    const ahora = new Date();
    const mananaUTC = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1));

    if (fechaDate < mananaUTC) {
        res.status(400).json({
            error: 'Solo se permiten registrar horarios a partir de mañana (no en el día actual ni fechas pasadas).'
        });
        return;
    }

    const matchHora = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(inicio).trim());
    if (!matchHora) {
        res.status(400).json({ error: 'La hora de inicio debe estar en formato de 24 horas (HH:mm).' });
        return;
    }

    const horas = Number(matchHora[1]);
    const minutos = Number(matchHora[2]);

    if (horas > 22) {
        res.status(400).json({ error: 'La hora máxima de inicio es 22:00 para completar un bloque de 1 hora.' });
        return;
    }

    const horaInicio = new Date(Date.UTC(1970, 0, 1, horas, minutos, 0));
    const horaFin = new Date(Date.UTC(1970, 0, 1, horas + 1, minutos, 0));

    try {
        await eliminarSlotsDisponiblesVencidos();

        const traslape = await prisma.slotdisponibilidad.findFirst({
            where: {
                idTerapeuta: terapeutaId,
                fecha: fechaDate,
                inicio: { lt: horaFin },
                fin: { gt: horaInicio }
            }
        });

        if (traslape) {
            res.status(409).json({
                error: 'El terapeuta ya tiene un horario registrado que se cruza con ese bloque de 1 hora.'
            });
            return;
        }

        const nuevoSlot = await prisma.slotdisponibilidad.create({
            data: {
                inicio: horaInicio,
                fin: horaFin,
                fecha: fechaDate,
                estado: true,
                idTerapeuta: terapeutaId
            }
        });

        res.status(201).json(nuevoSlot);
    } catch (error) {
        console.error('Error al crear horario:', error);
        res.status(500).json({ error: 'Error al registrar el horario disponible' });
    }
};

// Actualizar estado o datos de un horario
export const updateSlot = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { estado, fecha, inicio, idTerapeuta } = req.body;

    try {
        const slotActual = await prisma.slotdisponibilidad.findUnique({
            where: { idSlot: id }
        });

        if (!slotActual) {
            res.status(404).json({ error: 'El horario no existe.' });
            return;
        }

        let fechaDate: Date | undefined;
        if (fecha !== undefined) {
            const partesFecha = String(fecha).split('-').map(Number);
            if (partesFecha.length !== 3 || partesFecha.some(Number.isNaN)) {
                res.status(400).json({ error: 'Formato de fecha inválido.' });
                return;
            }
            const [anio, mes, dia] = partesFecha;
            fechaDate = new Date(Date.UTC(anio, mes - 1, dia));
        }

        let horaInicio: Date | undefined;
        let horaFin: Date | undefined;
        if (inicio !== undefined) {
            const matchHora = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(inicio).trim());
            if (!matchHora) {
                res.status(400).json({ error: 'La hora de inicio debe estar en formato de 24 horas (HH:mm).' });
                return;
            }
            const horas = Number(matchHora[1]);
            const minutos = Number(matchHora[2]);
            if (horas > 22) {
                res.status(400).json({ error: 'La hora máxima de inicio es 22:00.' });
                return;
            }
            horaInicio = new Date(Date.UTC(1970, 0, 1, horas, minutos, 0));
            horaFin = new Date(Date.UTC(1970, 0, 1, horas + 1, minutos, 0));
        }

        const slotActualizado = await prisma.slotdisponibilidad.update({
            where: { idSlot: id },
            data: {
                ...(estado !== undefined && {
                    estado: Boolean(estado === true || estado === 1 || estado === 'true')
                }),
                ...(fechaDate !== undefined && { fecha: fechaDate }),
                ...(horaInicio !== undefined && { inicio: horaInicio }),
                ...(horaFin !== undefined && { fin: horaFin }),
                ...(idTerapeuta !== undefined && { idTerapeuta: Number(idTerapeuta) })
            }
        });

        res.json(slotActualizado);
    } catch (error) {
        console.error('Error al actualizar horario:', error);
        res.status(500).json({ error: 'Error al actualizar el horario' });
    }
};

// Eliminar un horario disponible (solo si no está ocupado)
export const deleteSlot = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        const slot = await prisma.slotdisponibilidad.findUnique({
            where: { idSlot: id }
        });

        if (!slot) {
            res.status(404).json({ error: 'El horario no existe.' });
            return;
        }

        if (!slot.estado) {
            res.status(409).json({ error: 'No se puede eliminar un horario que ya está ocupado por una cita.' });
            return;
        }

        await prisma.slotdisponibilidad.delete({
            where: { idSlot: id }
        });

        res.json({ mensaje: 'Horario eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar horario:', error);
        res.status(500).json({ error: 'No se pudo eliminar el horario' });
    }
};