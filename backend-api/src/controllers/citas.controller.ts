import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { isAssignedTherapist, isPositiveInteger, parsePathId } from '../utils/requestValidation';

const MONTO_MULTA_INASISTENCIA = 200;
const ESTADOS_CITA = ['AGENDADA', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'INASISTENCIA'] as const;
type EstadoCita = typeof ESTADOS_CITA[number];

const esEstadoCita = (value: string): value is EstadoCita =>
    ESTADOS_CITA.includes(value as EstadoCita);

// Devuelve citas con paciente, precio del servicio, multa y terapeuta del horario.
export const getCitas = async (_req: Request, res: Response) => {
    try {
        const citas = await prisma.cita.findMany({
            orderBy: [{ slotdisponibilidad: { fecha: 'asc' } }, { slotdisponibilidad: { inicio: 'asc' } }],
            include: {
                paciente: { select: { idPaciente: true, nombre: true, aPaterno: true, aMaterno: true, contactoTelefonico: true, idTerapeuta: true } },
                servicio: true,
                multa: true,
                pago: true,
                slotdisponibilidad: { include: { terapeuta: { select: { idTerapeuta: true, nombre: true, aPaterno: true, aMaterno: true, especialidad: true, activo: true } } } }
            }
        });
        res.json(citas);
    } catch (error) {
        console.error('Error al obtener citas:', error);
        res.status(500).json({ error: 'Error al obtener la lista de citas' });
    }
};

// Agenda una cita y reserva el slot en una transacción.
export const createCita = async (req: Request, res: Response) => {
    const { idPaciente, idServicio, idSlot, esPrimeraSesion } = req.body as Record<string, unknown>;
    if (!isPositiveInteger(idPaciente) || !isPositiveInteger(idServicio) || !isPositiveInteger(idSlot)) {
        res.status(400).json({ error: 'Paciente, servicio y horario disponible son obligatorios.' });
        return;
    }
    if (esPrimeraSesion !== undefined && typeof esPrimeraSesion !== 'boolean') {
        res.status(400).json({ error: 'esPrimeraSesion debe ser un valor booleano.' });
        return;
    }
    const pacienteId = idPaciente;
    const servicioId = idServicio;
    const slotId = idSlot;
    try {
        const nuevaCita = await prisma.$transaction(async (tx) => {
            const [paciente, servicio, slot] = await Promise.all([
                tx.paciente.findUnique({ where: { idPaciente: pacienteId } }),
                tx.servicio.findUnique({ where: { idServicio: servicioId } }),
                tx.slotdisponibilidad.findUnique({ where: { idSlot: slotId } })
            ]);
            if (!paciente || !paciente.activo) throw new Error('PACIENTE_INACTIVO');
            if (!servicio || !servicio.activo) throw new Error('SERVICIO_INACTIVO');
            if (!slot) throw new Error('SLOT_NO_EXISTE');
            if (!slot.estado) throw new Error('SLOT_OCUPADO');
            const terapeuta = await tx.terapeuta.findUnique({ where: { idTerapeuta: slot.idTerapeuta } });
            if (!terapeuta || !terapeuta.activo) throw new Error('TERAPEUTA_INACTIVO');
            if (!isAssignedTherapist(paciente.idTerapeuta, slot.idTerapeuta)) throw new Error('TERAPEUTA_NO_ASIGNADO');

            const duplicada = await tx.cita.findFirst({
                where: { idPaciente: pacienteId, estado: { not: 'CANCELADA' }, slotdisponibilidad: { fecha: slot.fecha, inicio: slot.inicio } }
            });
            if (duplicada) throw new Error('CITA_DUPLICADA');

            const reservado = await tx.slotdisponibilidad.updateMany({ where: { idSlot: slotId, estado: true }, data: { estado: false } });
            if (reservado.count !== 1) throw new Error('SLOT_OCUPADO');
            return tx.cita.create({ data: { idPaciente: pacienteId, idServicio: servicioId, idSlot: slotId, esPrimeraSesion: esPrimeraSesion ?? false, estado: 'AGENDADA' } });
        });
        res.status(201).json(nuevaCita);
    } catch (error) {
        const mensajes: Record<string, [number, string]> = {
            PACIENTE_INACTIVO: [400, 'El paciente no existe o está inactivo.'],
            SERVICIO_INACTIVO: [400, 'El servicio no existe o está inactivo.'],
            SLOT_NO_EXISTE: [404, 'El horario seleccionado no existe.'],
            SLOT_OCUPADO: [409, 'Este horario ya fue ocupado por otra cita.'],
            TERAPEUTA_INACTIVO: [400, 'El terapeuta del horario está inactivo.'],
            TERAPEUTA_NO_ASIGNADO: [400, 'El horario no corresponde al terapeuta asignado al paciente.'],
            CITA_DUPLICADA: [409, 'El paciente ya tiene una cita en esa fecha y hora.']
        };
        if (error instanceof Error && mensajes[error.message]) return void res.status(mensajes[error.message][0]).json({ error: mensajes[error.message][1] });
        console.error('Error al agendar cita:', error);
        res.status(500).json({ error: 'Error interno al agendar la cita' });
    }
};

// Cambia el estado; la multa fija se crea solo al pasar de CONFIRMADA a INASISTENCIA.
export const updateCita = async (req: Request, res: Response) => {
    const id = parsePathId(req.params.id);
    if (id === null) return void res.status(400).json({ error: 'Identificador de cita inválido' });
    const { estado, esPrimeraSesion, idServicio } = req.body as Record<string, unknown>;
    if (estado !== undefined && typeof estado !== 'string') return void res.status(400).json({ error: 'El estado de cita debe ser texto.' });
    const estadoNuevo = typeof estado === 'string' ? estado.trim().toUpperCase() : undefined;
    if (estadoNuevo !== undefined && !esEstadoCita(estadoNuevo)) return void res.status(400).json({ error: 'Estado de cita inválido' });
    if (esPrimeraSesion !== undefined && typeof esPrimeraSesion !== 'boolean') {
        return void res.status(400).json({ error: 'esPrimeraSesion debe ser un valor booleano.' });
    }
    if (idServicio !== undefined && !isPositiveInteger(idServicio)) {
        return void res.status(400).json({ error: 'El servicio debe identificarse con un entero positivo.' });
    }

    try {
        const actualizada = await prisma.$transaction(async (tx) => {
            const actual = await tx.cita.findUnique({ where: { idCita: id } });
            if (!actual) throw new Error('CITA_NO_EXISTE');
            if (idServicio !== undefined) {
                const servicio = await tx.servicio.findUnique({ where: { idServicio } });
                if (!servicio) throw new Error('SERVICIO_NO_EXISTE');
                if (!servicio.activo) throw new Error('SERVICIO_INACTIVO');
            }
            if (estadoNuevo === 'INASISTENCIA' && actual.estado !== 'CONFIRMADA') throw new Error('INASISTENCIA_REQUIERE_CONFIRMACION');
            if (estadoNuevo === 'CANCELADA' && actual.estado !== 'CANCELADA') {
                await tx.slotdisponibilidad.update({ where: { idSlot: actual.idSlot }, data: { estado: true } });
            }
            if (estadoNuevo === 'INASISTENCIA') {
                const multa = await tx.multa.findFirst({ where: { idCita: id } });
                if (!multa) await tx.multa.create({ data: { idCita: id, monto: MONTO_MULTA_INASISTENCIA, estado: 'PENDIENTE', fechaGeneracion: new Date() } });
            }
            return tx.cita.update({
                where: { idCita: id },
                data: {
                    ...(estadoNuevo !== undefined ? { estado: estadoNuevo } : {}),
                    ...(esPrimeraSesion !== undefined ? { esPrimeraSesion } : {}),
                    ...(idServicio !== undefined ? { idServicio } : {})
                }
            });
        });
        res.json(actualizada);
    } catch (error) {
        if (error instanceof Error && error.message === 'CITA_NO_EXISTE') return void res.status(404).json({ error: 'La cita no existe.' });
        if (error instanceof Error && error.message === 'SERVICIO_NO_EXISTE') return void res.status(404).json({ error: 'El servicio no existe.' });
        if (error instanceof Error && error.message === 'SERVICIO_INACTIVO') return void res.status(400).json({ error: 'El servicio seleccionado está inactivo.' });
        if (error instanceof Error && error.message === 'INASISTENCIA_REQUIERE_CONFIRMACION') return void res.status(400).json({ error: 'Primero debe estar CONFIRMADA para generar la multa por inasistencia.' });
        console.error('Error al actualizar cita:', error);
        res.status(500).json({ error: 'Error al actualizar la cita' });
    }
};

// Cancela una cita y libera el horario sin eliminar el historial.
export const deleteCita = async (req: Request, res: Response) => {
    const id = parsePathId(req.params.id);
    if (id === null) return void res.status(400).json({ error: 'Identificador de cita inválido' });
    try {
        await prisma.$transaction(async (tx) => {
            const cita = await tx.cita.findUnique({ where: { idCita: id } });
            if (!cita) throw new Error('CITA_NO_EXISTE');
            if (cita.estado !== 'CANCELADA') {
                await tx.cita.update({ where: { idCita: id }, data: { estado: 'CANCELADA' } });
                await tx.slotdisponibilidad.update({ where: { idSlot: cita.idSlot }, data: { estado: true } });
            }
        });
        res.json({ mensaje: 'Cita cancelada y horario liberado correctamente' });
    } catch (error) {
        if (error instanceof Error && error.message === 'CITA_NO_EXISTE') return void res.status(404).json({ error: 'La cita no existe.' });
        console.error('Error al cancelar cita:', error);
        res.status(500).json({ error: 'No se pudo cancelar la cita' });
    }
};
