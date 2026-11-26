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

// Actualiza un horario disponible; no permite mover ni reactivar slots vinculados a una cita.
export const updateSlot = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { estado, fecha, inicio, idTerapeuta } = req.body;
    if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: 'Identificador de horario inválido' });
    try {
        const actual = await prisma.slotdisponibilidad.findUnique({ where: { idSlot: id }, include: { cita: true } });
        if (!actual) return void res.status(404).json({ error: 'El horario no existe.' });
        if (actual.cita.length) return void res.status(409).json({ error: 'No se puede modificar un horario relacionado con una cita.' });

        const fechaTexto = fecha !== undefined ? String(fecha) : actual.fecha.toISOString().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) return void res.status(400).json({ error: 'Formato de fecha inválido.' });
        const [y, m, d] = fechaTexto.split('-').map(Number);
        const fechaDate = new Date(Date.UTC(y, m - 1, d));
        if (fechaDate.getUTCFullYear() !== y || fechaDate.getUTCMonth() !== m - 1 || fechaDate.getUTCDate() !== d) return void res.status(400).json({ error: 'La fecha no existe.' });
        const ahora = new Date();
        const manana = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1));
        if (fechaDate < manana) return void res.status(400).json({ error: 'Solo se permiten horarios a partir de mañana.' });

        const horaTexto = inicio !== undefined ? String(inicio) : `${String(actual.inicio.getUTCHours()).padStart(2, '0')}:${String(actual.inicio.getUTCMinutes()).padStart(2, '0')}`;
        const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horaTexto);
        if (!match) return void res.status(400).json({ error: 'La hora debe tener formato HH:mm.' });
        const h = Number(match[1]);
        const min = Number(match[2]);
        if (h > 22) return void res.status(400).json({ error: 'La hora máxima de inicio es 22:00.' });
        const horaInicio = new Date(Date.UTC(1970, 0, 1, h, min));
        const horaFin = new Date(Date.UTC(1970, 0, 1, h + 1, min));
        const terapeutaId = idTerapeuta !== undefined ? Number(idTerapeuta) : actual.idTerapeuta;
        if (!Number.isInteger(terapeutaId) || terapeutaId <= 0) return void res.status(400).json({ error: 'Terapeuta inválido.' });
        const terapeuta = await prisma.terapeuta.findUnique({ where: { idTerapeuta: terapeutaId } });
        if (!terapeuta || !terapeuta.activo) return void res.status(400).json({ error: 'El terapeuta no existe o está inactivo.' });

        if (estado !== undefined && typeof estado !== 'boolean') return void res.status(400).json({ error: 'El estado debe ser booleano.' });
        if (estado === true && actual.estado === false) return void res.status(409).json({ error: 'No se puede liberar manualmente un horario ocupado.' });

        const traslape = await prisma.slotdisponibilidad.findFirst({
            where: { idSlot: { not: id }, idTerapeuta: terapeutaId, fecha: fechaDate, inicio: { lt: horaFin }, fin: { gt: horaInicio } }
        });
        if (traslape) return void res.status(409).json({ error: 'El terapeuta ya tiene un horario que se traslapa.' });

        const actualizado = await prisma.slotdisponibilidad.update({
            where: { idSlot: id },
            data: { fecha: fechaDate, inicio: horaInicio, fin: horaFin, idTerapeuta: terapeutaId, ...(estado !== undefined ? { estado } : {}) }
        });
        res.json(actualizado);
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
// Crea varios bloques de una hora para un terapeuta en varias fechas y horarios.
// Recibe { idTerapeuta, fechas: ['YYYY-MM-DD'], horarios: ['HH:mm'] }.
export const createSlotsBatch = async (req: Request, res: Response) => {
    const { idTerapeuta, fechas, horarios } = req.body;
    const terapeutaId = Number(idTerapeuta);
    if (!Number.isInteger(terapeutaId) || terapeutaId <= 0 || !Array.isArray(fechas) || !fechas.length || !Array.isArray(horarios) || !horarios.length) {
        res.status(400).json({ error: 'Selecciona un terapeuta, al menos una fecha y al menos un horario.' });
        return;
    }
    if (fechas.length > 90 || horarios.length > 14) {
        res.status(400).json({ error: 'El lote permite hasta 90 fechas y 14 horarios por solicitud.' });
        return;
    }
    const fechasValidas: Date[] = [];
    for (const valor of fechas) {
        if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return void res.status(400).json({ error: `Fecha inválida: ${valor}` });
        const [y, m, d] = valor.split('-').map(Number);
        const fecha = new Date(Date.UTC(y, m - 1, d));
        if (fecha.getUTCFullYear() !== y || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return void res.status(400).json({ error: `Fecha inexistente: ${valor}` });
        const ahora = new Date();
        const hoy = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
        if (fecha <= hoy) return void res.status(400).json({ error: 'Solo se permiten registrar horarios a partir de mañana.' });
        fechasValidas.push(fecha);
    }
    const horariosValidos: { inicio: Date; fin: Date; texto: string }[] = [];
    for (const valor of horarios) {
        const match = typeof valor === 'string' ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(valor) : null;
        if (!match) return void res.status(400).json({ error: `Hora inválida: ${valor}. Utiliza HH:mm.` });
        const h = Number(match[1]);
        const m = Number(match[2]);
        if (h > 22) return void res.status(400).json({ error: 'La última hora de inicio permitida es 22:00.' });
        horariosValidos.push({ inicio: new Date(Date.UTC(1970, 0, 1, h, m)), fin: new Date(Date.UTC(1970, 0, 1, h + 1, m)), texto: valor });
    }
    try {
        const terapeuta = await prisma.terapeuta.findUnique({ where: { idTerapeuta: terapeutaId } });
        if (!terapeuta || !terapeuta.activo) return void res.status(400).json({ error: 'El terapeuta no existe o está inactivo.' });
        const creados: unknown[] = [];
        const omitidos: { fecha: string; horario: string; motivo: string }[] = [];
        await prisma.$transaction(async (tx) => {
            for (const fecha of fechasValidas) {
                for (const horario of horariosValidos) {
                    const traslape = await tx.slotdisponibilidad.findFirst({ where: { idTerapeuta: terapeutaId, fecha, inicio: { lt: horario.fin }, fin: { gt: horario.inicio } } });
                    if (traslape) {
                        omitidos.push({ fecha: fecha.toISOString().slice(0, 10), horario: horario.texto, motivo: 'Ya existe un horario que se traslapa' });
                        continue;
                    }
                    const slot = await tx.slotdisponibilidad.create({ data: { idTerapeuta: terapeutaId, fecha, inicio: horario.inicio, fin: horario.fin, estado: true } });
                    creados.push(slot);
                }
            }
        });
        res.status(201).json({ mensaje: `Se crearon ${creados.length} horarios.`, creados, omitidos });
    } catch (error) {
        console.error('Error al crear horarios por lote:', error);
        res.status(500).json({ error: 'No fue posible crear los horarios seleccionados.' });
    }
};
