import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Convierte "HH:mm" o "HH:mm:ss" a un objeto Date válido para columnas TIME de MySQL
const parseTime = (timeValue: string): Date => {
    if (timeValue.includes('T')) return new Date(timeValue);
    const normalized = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
    return new Date(`1970-01-01T${normalized}Z`);
};

// Obtener todas las citas con datos de paciente, servicio, slot/terapeuta y pagos
export const getCitas = async (req: Request, res: Response) => {
    try {
        const citas = await prisma.cita.findMany({
            include: {
                paciente: {
                    select: {
                        idPaciente: true,
                        codigo: true,
                        nombre: true,
                        aPaterno: true,
                        aMaterno: true,
                        contactoTelefonico: true
                    }
                },
                servicio: {
                    select: {
                        idServicio: true,
                        codigo: true,
                        nombre: true
                    }
                },
                slotdisponibilidad: {
                    include: {
                        terapeuta: {
                            select: {
                                idTerapeuta: true,
                                nombreCompleto: true,
                                especialidad: true
                            }
                        }
                    }
                },
                pago: true
            },
            orderBy: [
                { fecha: 'desc' },
                { hora: 'asc' }
            ]
        });
        res.json(citas);
    } catch (error) {
        console.error('Error al obtener citas:', error);
        res.status(500).json({ error: 'Error al obtener la lista de citas' });
    }
};

// Agendar una nueva cita y marcar el slot como ocupado (estado: 0)
export const createCita = async (req: Request, res: Response) => {
    const {
        codigo,
        fecha,
        hora,
        estado,
        esPrimeraSesion,
        multaGenerada,
        idPaciente,
        idSlot,
        idServicio
    } = req.body;

    if (!idPaciente || !idSlot || !idServicio) {
        res.status(400).json({ error: 'Debes seleccionar paciente, servicio y horario disponible' });
        return;
    }

    try {
        const slotIdNumber = Number(idSlot);
        const pacienteIdNumber = Number(idPaciente);

        // 1. Verificar que el slot exista y esté disponible (estado === 1)
        const slot = await prisma.slotdisponibilidad.findUnique({
            where: { idSlot: slotIdNumber }
        });

        if (!slot) {
            res.status(404).json({ error: 'El horario seleccionado no existe' });
            return;
        }

        if (slot.estado !== 1) {
            res.status(409).json({ error: 'Horario duplicado: este horario ya se encuentra ocupado por otra cita' });
            return;
        }

        // 2. Verificar que la fecha del horario no sea pasada
        const fechaSlotStr = slot.fecha.toISOString().split('T')[0];
        const hoyStr = new Date().toISOString().split('T')[0];
        if (fechaSlotStr < hoyStr) {
            res.status(400).json({ error: 'Horario inválido: no se pueden agendar citas en fechas pasadas' });
            return;
        }

        const fechaCita = fecha ? new Date(fecha) : slot.fecha;
        const horaCita = hora ? parseTime(hora) : slot.inicio;

        // 3. Verificar que el paciente no tenga ya una cita activa en esa misma fecha y hora
        const citaDuplicadaPaciente = await prisma.cita.findFirst({
            where: {
                idPaciente: pacienteIdNumber,
                fecha: fechaCita,
                hora: horaCita,
                estado: { not: 'Cancelada' }
            }
        });

        if (citaDuplicadaPaciente) {
            res.status(409).json({ error: 'Horario duplicado: el paciente ya tiene una cita agendada en esa fecha y hora' });
            return;
        }

        const codigoFinal = codigo || `CIT-${Math.floor(10000 + Math.random() * 90000)}`;

        const nuevaCita = await prisma.$transaction(async (tx) => {
            const citaCreada = await tx.cita.create({
                data: {
                    codigo: codigoFinal,
                    fecha: fechaCita,
                    hora: horaCita,
                    estado: (estado || 'Agendada').slice(0, 10),
                    esPrimeraSesion: esPrimeraSesion ? 1 : 0,
                    multaGenerada: multaGenerada ? 1 : 0,
                    idPaciente: pacienteIdNumber,
                    idSlot: slotIdNumber,
                    idServicio: Number(idServicio)
                }
            });

            await tx.slotdisponibilidad.update({
                where: { idSlot: slotIdNumber },
                data: { estado: 0 }
            });

            return citaCreada;
        });

        res.status(201).json(nuevaCita);
    } catch (error) {
        console.error('Error al crear cita:', error);
        res.status(500).json({ error: 'Error al agendar la cita' });
    }
};

// Actualizar una cita existente (estado, fecha, hora, multa, etc.)
export const updateCita = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const {
        fecha,
        hora,
        estado,
        esPrimeraSesion,
        multaGenerada,
        idPaciente,
        idSlot,
        idServicio
    } = req.body;

    try {
        const citaActualizada = await prisma.$transaction(async (tx) => {
            const citaPrevia = await tx.cita.findUnique({ where: { idCita: id } });

            const actualizada = await tx.cita.update({
                where: { idCita: id },
                data: {
                    ...(fecha !== undefined && { fecha: new Date(fecha) }),
                    ...(hora !== undefined && { hora: parseTime(hora) }),
                    ...(estado !== undefined && { estado: String(estado).slice(0, 10) }),
                    ...(esPrimeraSesion !== undefined && { esPrimeraSesion: esPrimeraSesion ? 1 : 0 }),
                    ...(multaGenerada !== undefined && { multaGenerada: multaGenerada ? 1 : 0 }),
                    ...(idPaciente !== undefined && { idPaciente: Number(idPaciente) }),
                    ...(idSlot !== undefined && { idSlot: Number(idSlot) }),
                    ...(idServicio !== undefined && { idServicio: Number(idServicio) })
                }
            });

            // Si la cita se marca como Cancelada, libera el horario automáticamente
            if (estado === 'Cancelada' && citaPrevia) {
                await tx.slotdisponibilidad.update({
                    where: { idSlot: citaPrevia.idSlot },
                    data: { estado: 1 }
                });
            }

            return actualizada;
        });

        res.json(citaActualizada);
    } catch (error) {
        console.error('Error al actualizar cita:', error);
        res.status(500).json({ error: 'Error al actualizar la cita' });
    }
};

// Eliminar una cita y liberar nuevamente su slot
export const deleteCita = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.$transaction(async (tx) => {
            const cita = await tx.cita.findUnique({ where: { idCita: id } });

            await tx.cita.delete({
                where: { idCita: id }
            });

            if (cita) {
                await tx.slotdisponibilidad.update({
                    where: { idSlot: cita.idSlot },
                    data: { estado: 1 }
                });
            }
        });

        res.json({ mensaje: 'Cita eliminada correctamente y horario liberado' });
    } catch (error) {
        console.error('Error al eliminar cita:', error);
        res.status(500).json({ error: 'No se pudo eliminar la cita (verifica si tiene pagos registrados)' });
    }
};