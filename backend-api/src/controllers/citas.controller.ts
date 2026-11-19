import { Request, Response } from 'express';
import prisma from '../config/prisma';

const parseTime = (timeValue: string): Date => {
    if (timeValue.includes('T')) return new Date(timeValue);
    const normalized = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
    return new Date(`1970-01-01T${normalized}Z`);
};

export const getCitas = async (req: Request, res: Response) => {
    try {
        const citas = await prisma.cita.findMany({
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
                slotdisponibilidad: {
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

export const createCita = async (req: Request, res: Response) => {
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

    if (!idPaciente || !idSlot || !idServicio) {
        res.status(400).json({ error: 'Debes seleccionar paciente, servicio y horario disponible' });
        return;
    }

    try {
        const slotIdNumber = Number(idSlot);
        const pacienteIdNumber = Number(idPaciente);

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

        const fechaSlotStr = slot.fecha.toISOString().split('T')[0];
        const ahora = new Date();
        const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

        if (fechaSlotStr < hoyStr) {
            res.status(400).json({ error: 'Horario inválido: no se pueden agendar citas en fechas pasadas' });
            return;
        }

        const fechaCita = fecha ? new Date(fecha) : slot.fecha;
        const horaCita = hora ? parseTime(hora) : slot.inicio;

        const citaDuplicadaPaciente = await prisma.cita.findFirst({
            where: {
                idPaciente: pacienteIdNumber,
                fecha: fechaCita,
                hora: horaCita,
                estado: { not: 'CANCELADA' }
            }
        });

        if (citaDuplicadaPaciente) {
            res.status(409).json({ error: 'Horario duplicado: el paciente ya tiene una cita agendada en esa fecha y hora' });
            return;
        }

        const nuevaCita = await prisma.$transaction(async (tx) => {
            const citaCreada = await tx.cita.create({
                data: {
                    fecha: fechaCita,
                    hora: horaCita,
                    estado: (estado ? String(estado).trim().toUpperCase() : 'AGENDADA') as 'AGENDADA' | 'ATENDIDA' | 'CANCELADA',
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

    const estadoNormalizado = estado !== undefined ? String(estado).trim().toUpperCase() : undefined;

    try {
        const citaActualizada = await prisma.$transaction(async (tx) => {
            const citaPrevia = await tx.cita.findUnique({ where: { idCita: id } });

            if (!citaPrevia) {
                throw new Error('NO_ENCONTRADA');
            }

            let nuevaFecha = fecha !== undefined ? new Date(fecha) : undefined;
            let nuevaHora = hora !== undefined ? parseTime(hora) : undefined;
            const nuevoSlotId = idSlot !== undefined ? Number(idSlot) : undefined;

            if (nuevoSlotId && nuevoSlotId !== citaPrevia.idSlot) {
                const slotNuevo = await tx.slotdisponibilidad.findUnique({
                    where: { idSlot: nuevoSlotId }
                });

                if (!slotNuevo || slotNuevo.estado !== 1) {
                    throw new Error('SLOT_OCUPADO');
                }

                nuevaFecha = slotNuevo.fecha;
                nuevaHora = slotNuevo.inicio;

                await tx.slotdisponibilidad.update({
                    where: { idSlot: citaPrevia.idSlot },
                    data: { estado: 1 }
                });
                await tx.slotdisponibilidad.update({
                    where: { idSlot: nuevoSlotId },
                    data: { estado: 0 }
                });
            }

            const actualizada = await tx.cita.update({
                where: { idCita: id },
                data: {
                    ...(nuevaFecha !== undefined && { fecha: nuevaFecha }),
                    ...(nuevaHora !== undefined && { hora: nuevaHora }),
                    ...(estadoNormalizado !== undefined && {
                        estado: estadoNormalizado as 'AGENDADA' | 'ATENDIDA' | 'CANCELADA'
                    }),
                    ...(esPrimeraSesion !== undefined && { esPrimeraSesion: esPrimeraSesion ? 1 : 0 }),
                    ...(multaGenerada !== undefined && { multaGenerada: multaGenerada ? 1 : 0 }),
                    ...(idPaciente !== undefined && { idPaciente: Number(idPaciente) }),
                    ...(nuevoSlotId !== undefined && { idSlot: nuevoSlotId }),
                    ...(idServicio !== undefined && { idServicio: Number(idServicio) })
                }
            });

            if (estadoNormalizado === 'CANCELADA' && citaPrevia.estado !== 'CANCELADA') {
                await tx.slotdisponibilidad.update({
                    where: { idSlot: actualizada.idSlot },
                    data: { estado: 1 }
                });
            }

            return actualizada;
        });

        res.json(citaActualizada);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'NO_ENCONTRADA') {
                res.status(404).json({ error: 'La cita no existe' });
                return;
            }
            if (error.message === 'SLOT_OCUPADO') {
                res.status(409).json({ error: 'El nuevo horario seleccionado ya está ocupado' });
                return;
            }
        }
        console.error('Error al actualizar cita:', error);
        res.status(500).json({ error: 'Error al actualizar la cita' });
    }
};

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