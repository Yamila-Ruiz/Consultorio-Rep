import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Monto predeterminado de multa cuando una cita pasa a INASISTENCIA
const MONTO_MULTA_INASISTENCIA = 200.0;

// Obtener todas las citas con datos de paciente, servicio, multa y slot/terapeuta
export const getCitas = async (req: Request, res: Response) => {
    try {
        const citas = await prisma.cita.findMany({
            orderBy: [
                { slotdisponibilidad: { fecha: 'asc' } },
                { slotdisponibilidad: { inicio: 'asc' } }
            ],
            include: {
                paciente: {
                    select: {
                        idPaciente: true,
                        nombre: true,
                        aPaterno: true,
                        aMaterno: true,
                        contactoTelefonico: true
                    }
                },
                servicio: {
                    select: {
                        idServicio: true,
                        nombre: true
                    }
                },
                multa: true,
                slotdisponibilidad: {
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
                }
            }
        });
        res.json(citas);
    } catch (error) {
        console.error('Error al obtener citas:', error);
        res.status(500).json({ error: 'Error al obtener la lista de citas' });
    }
};

// Agendar una nueva cita y marcar el slot como ocupado (estado = false)
export const createCita = async (req: Request, res: Response) => {
    const { idPaciente, idServicio, idSlot, esPrimeraSesion } = req.body;

    if (!idPaciente || !idServicio || !idSlot) {
        res.status(400).json({ error: 'Paciente, servicio y horario disponible son obligatorios.' });
        return;
    }

    try {
        const nuevaCita = await prisma.$transaction(async (tx) => {
            const slot = await tx.slotdisponibilidad.findUnique({
                where: { idSlot: Number(idSlot) }
            });

            if (!slot) {
                throw new Error('SLOT_NO_EXISTE');
            }

            if (!slot.estado) {
                throw new Error('SLOT_OCUPADO');
            }

            // Evitar que el mismo paciente tenga otra cita activa el mismo día y hora
            const citaDuplicada = await tx.cita.findFirst({
                where: {
                    idPaciente: Number(idPaciente),
                    estado: { not: 'CANCELADA' },
                    slotdisponibilidad: {
                        fecha: slot.fecha,
                        inicio: slot.inicio
                    }
                }
            });

            if (citaDuplicada) {
                throw new Error('CITA_DUPLICADA');
            }

            const citaCreada = await tx.cita.create({
                data: {
                    idPaciente: Number(idPaciente),
                    idServicio: Number(idServicio),
                    idSlot: Number(idSlot),
                    esPrimeraSesion: Boolean(esPrimeraSesion),
                    estado: 'AGENDADA'
                }
            });

            await tx.slotdisponibilidad.update({
                where: { idSlot: Number(idSlot) },
                data: { estado: false }
            });

            return citaCreada;
        });

        res.status(201).json(nuevaCita);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'SLOT_NO_EXISTE') {
                res.status(404).json({ error: 'El horario seleccionado no existe.' });
                return;
            }
            if (error.message === 'SLOT_OCUPADO') {
                res.status(409).json({ error: 'Este horario ya fue ocupado por otra cita.' });
                return;
            }
            if (error.message === 'CITA_DUPLICADA') {
                res.status(409).json({ error: 'El paciente ya tiene una cita agendada en esa misma fecha y hora.' });
                return;
            }
        }
        console.error('Error al agendar cita:', error);
        res.status(500).json({ error: 'Error interno al agendar la cita' });
    }
};

// Actualizar estado de una cita (libera slot en CANCELADA y registra multa en INASISTENCIA)
export const updateCita = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { estado, esPrimeraSesion, idServicio, montoMulta } = req.body;

    try {
        const citaActualizada = await prisma.$transaction(async (tx) => {
            const citaActual = await tx.cita.findUnique({
                where: { idCita: id }
            });

            if (!citaActual) {
                throw new Error('CITA_NO_EXISTE');
            }

            const estadoNuevo = estado ? String(estado).trim().toUpperCase() : undefined;

            // Si se cancela la cita, liberar el slot para que vuelva a estar disponible
            if (estadoNuevo === 'CANCELADA' && citaActual.estado !== 'CANCELADA') {
                await tx.slotdisponibilidad.update({
                    where: { idSlot: citaActual.idSlot },
                    data: { estado: true }
                });
            }

            // Si pasa a INASISTENCIA, generar registro en la tabla multa si aún no tiene una
            if (estadoNuevo === 'INASISTENCIA' && citaActual.estado !== 'INASISTENCIA') {
                const multaExistente = await tx.multa.findFirst({
                    where: { idCita: id }
                });

                if (!multaExistente) {
                    await tx.multa.create({
                        data: {
                            idCita: id,
                            monto: montoMulta !== undefined ? Number(montoMulta) : MONTO_MULTA_INASISTENCIA,
                            estado: 'PENDIENTE',
                            fechaGeneracion: new Date()
                        }
                    });
                }
            }

            return tx.cita.update({
                where: { idCita: id },
                data: {
                    ...(estadoNuevo !== undefined && { estado: estadoNuevo as any }),
                    ...(esPrimeraSesion !== undefined && { esPrimeraSesion: Boolean(esPrimeraSesion) }),
                    ...(idServicio !== undefined && { idServicio: Number(idServicio) })
                }
            });
        });

        res.json(citaActualizada);
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'CITA_NO_EXISTE') {
            res.status(404).json({ error: 'La cita no existe.' });
            return;
        }
        console.error('Error al actualizar cita:', error);
        res.status(500).json({ error: 'Error al actualizar la cita' });
    }
};

// Cancelar cita y liberar horario
export const deleteCita = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.$transaction(async (tx) => {
            const cita = await tx.cita.findUnique({ where: { idCita: id } });
            if (!cita) {
                throw new Error('CITA_NO_EXISTE');
            }

            await tx.cita.update({
                where: { idCita: id },
                data: { estado: 'CANCELADA' }
            });

            await tx.slotdisponibilidad.update({
                where: { idSlot: cita.idSlot },
                data: { estado: true }
            });
        });

        res.json({ mensaje: 'Cita cancelada y horario liberado correctamente' });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'CITA_NO_EXISTE') {
            res.status(404).json({ error: 'La cita no existe.' });
            return;
        }
        console.error('Error al cancelar cita:', error);
        res.status(500).json({ error: 'No se pudo cancelar la cita' });
    }
};