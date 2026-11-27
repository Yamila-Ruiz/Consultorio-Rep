import { Request, Response } from 'express';
import type { Prisma } from '../generated/prisma/client';
import prisma from '../config/prisma';
import { isNonEmptyString, isPositiveInteger, isOptionalString, parsePathId } from '../utils/requestValidation';
import { generarNombreUsuarioDisponible } from '../utils/nombreUsuario';

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
            },
            orderBy: [
                { aPaterno: 'asc' },
                { aMaterno: 'asc' },
                { nombre: 'asc' }
            ]
        });
        res.json(terapeutas);
    } catch (error) {
        console.error('Error al obtener terapeutas:', error);
        res.status(500).json({ error: 'Error al obtener la lista de terapeutas' });
    }
};

export const createTerapeuta = async (req: Request, res: Response) => {
    const { nombre, aPaterno, aMaterno, contactoTelefonico, especialidad, idUsuario, contrasena } = req.body;

    if (
        !isNonEmptyString(nombre, 60) ||
        !isNonEmptyString(aPaterno, 60) ||
        !isNonEmptyString(aMaterno, 60) ||
        !isNonEmptyString(especialidad, 30) ||
        typeof contactoTelefonico !== 'string' ||
        (idUsuario !== undefined && !isPositiveInteger(idUsuario)) ||
        !isOptionalString(contrasena, 30)
    ) {
        res.status(400).json({ error: 'Los datos deben tener tipos y longitudes válidos; el teléfono debe ser texto.' });
        return;
    }

    const telefonoLimpio = contactoTelefonico.replace(/\D/g, '');
    if (!/^\d{10}$/.test(telefonoLimpio)) {
        res.status(400).json({ error: 'El teléfono debe contener exactamente 10 dígitos.' });
        return;
    }

    try {
        const nuevoTerapeuta = await prisma.$transaction(async (tx) => {
            let usuarioIdFinal = idUsuario;

            if (!usuarioIdFinal) {
                const primerNombreMayus = nombre.trim().split(/\s+/)[0].toUpperCase();
                const nombreUsuarioGenerado = await generarNombreUsuarioDisponible(
                    `TERAPEUTA ${primerNombreMayus}`,
                    async (nombreUsuario) =>
                        (await tx.usuario.findFirst({ where: { nombreUsuario } })) !== null
                );

                const usuarioCreado = await tx.usuario.create({
                    data: {
                        nombreUsuario: nombreUsuarioGenerado,
                        contrasena: (contrasena || '123456').trim()
                    }
                });
                usuarioIdFinal = usuarioCreado.idUsuario;
            } else {
                const usuarioExistente = await tx.usuario.findUnique({ where: { idUsuario: usuarioIdFinal } });
                if (!usuarioExistente) throw new Error('USUARIO_NO_EXISTE');
            }

            return tx.terapeuta.create({
                data: {
                    nombre: nombre.trim().toUpperCase(),
                    aPaterno: aPaterno.trim().toUpperCase(),
                    aMaterno: aMaterno.trim().toUpperCase(),
                    especialidad: especialidad.trim().toUpperCase(),
                    contactoTelefonico: telefonoLimpio,
                    idUsuario: usuarioIdFinal,
                    activo: true
                }
            });
        });

        res.status(201).json(nuevoTerapeuta);
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'USUARIO_NO_EXISTE') {
            res.status(400).json({ error: 'El usuario seleccionado no existe.' });
            return;
        }
        console.error('Error al crear terapeuta:', error);
        res.status(500).json({ error: 'Error al registrar el terapeuta' });
    }
};

// Procesa la baja y los cambios de agenda en la misma transacción.
const resolverCitasDeBaja = async (
    tx: Prisma.TransactionClient,
    idTerapeuta: number,
    especialidad: string
) => {
    const ahora = new Date();
    const hoy = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
    const hora = new Date(Date.UTC(1970, 0, 1, ahora.getHours(), ahora.getMinutes(), ahora.getSeconds()));
    const citas = await tx.cita.findMany({
        where: {
            estado: { in: ['AGENDADA', 'CONFIRMADA'] },
            slotdisponibilidad: {
                idTerapeuta,
                OR: [{ fecha: { gt: hoy } }, { fecha: hoy, inicio: { gte: hora } }]
            }
        },
        include: { slotdisponibilidad: true },
        orderBy: { idCita: 'asc' }
    });

    const resumen = { reasignadas: 0, canceladas: 0 };
    for (const cita of citas) {
        const { fecha, inicio, fin } = cita.slotdisponibilidad;
                const disponibles = await tx.$queryRaw<{ idSlot: number }[]>`
            SELECT alternativa.idSlot
            FROM slotdisponibilidad AS original
            JOIN slotdisponibilidad AS alternativa
              ON alternativa.fecha = original.fecha
             AND alternativa.inicio = original.inicio
             AND alternativa.fin = original.fin
             AND alternativa.idTerapeuta <> original.idTerapeuta
            JOIN terapeuta AS candidato
              ON candidato.idTerapeuta = alternativa.idTerapeuta
            WHERE original.idSlot = ${cita.idSlot}
              AND candidato.activo = TRUE
              AND candidato.especialidad = ${especialidad}
              AND alternativa.estado = TRUE
              AND NOT EXISTS (
                  SELECT 1
                  FROM slotdisponibilidad AS ocupado
                  JOIN cita AS otra ON otra.idSlot = ocupado.idSlot
                  WHERE ocupado.idTerapeuta = alternativa.idTerapeuta
                    AND ocupado.fecha = original.fecha
                    AND ocupado.inicio < original.fin
                    AND ocupado.fin > original.inicio
                    AND otra.estado <> 'CANCELADA'
              )
            ORDER BY alternativa.idTerapeuta, alternativa.idSlot
        `;

        let reemplazo: number | undefined;
        for (const slot of disponibles) {

            const reserva = await tx.slotdisponibilidad.updateMany({
                where: { idSlot: slot.idSlot, estado: true },
                data: { estado: false }
            });
            if (reserva.count === 1) {
                reemplazo = slot.idSlot;
                break;
            }
        }

        if (reemplazo === undefined) {
            await tx.cita.update({
                where: { idCita: cita.idCita },
                data: { estado: 'CANCELADA' }
            });
            resumen.canceladas++;
        } else {
            await tx.cita.update({
                where: { idCita: cita.idCita },
                data: { idSlot: reemplazo }
            });
            resumen.reasignadas++;
        }

        await tx.slotdisponibilidad.updateMany({
            where: { idSlot: cita.idSlot, cita: { none: { estado: { not: 'CANCELADA' } } } },
            data: { estado: true }
        });
    }

    return resumen;
};

export const updateTerapeuta = async (req: Request, res: Response) => {
    const id = parsePathId(req.params.id);
    if (id === null) return void res.status(400).json({ error: 'Identificador de terapeuta inválido.' });
    const { nombre, aPaterno, aMaterno, contactoTelefonico, especialidad, idUsuario, activo } =
        req.body as Record<string, unknown>;

    if (
        (nombre !== undefined && !isNonEmptyString(nombre, 60)) ||
        (aPaterno !== undefined && !isNonEmptyString(aPaterno, 60)) ||
        (aMaterno !== undefined && !isNonEmptyString(aMaterno, 60)) ||
        (especialidad !== undefined && !isNonEmptyString(especialidad, 30))
    ) return void res.status(400).json({ error: 'Los nombres y la especialidad deben ser texto válido.' });

    const telefonoLimpio = contactoTelefonico !== undefined
        ? typeof contactoTelefonico === 'string' ? contactoTelefonico.replace(/\D/g, '') : null
        : undefined;
    if (telefonoLimpio === null) return void res.status(400).json({ error: 'El teléfono debe enviarse como texto.' });
    if (telefonoLimpio !== undefined && !/^\d{10}$/.test(telefonoLimpio)) {
        return void res.status(400).json({ error: 'El teléfono debe contener exactamente 10 dígitos.' });
    }
    if (idUsuario !== undefined && !isPositiveInteger(idUsuario)) {
        return void res.status(400).json({ error: 'idUsuario debe ser un entero positivo.' });
    }
    if (activo !== undefined && typeof activo !== 'boolean') {
        return void res.status(400).json({ error: 'El estado activo debe ser booleano.' });
    }
    if (
        nombre === undefined &&
        aPaterno === undefined &&
        aMaterno === undefined &&
        especialidad === undefined &&
        telefonoLimpio === undefined &&
        idUsuario === undefined &&
        activo === undefined
    ) return void res.status(400).json({ error: 'No hay datos para actualizar.' });

    try {
        if (idUsuario !== undefined) {
            const usuario = await prisma.usuario.findUnique({ where: { idUsuario } });
            if (!usuario) return void res.status(400).json({ error: 'El usuario seleccionado no existe.' });
        }
        const datos = {
            ...(nombre !== undefined && { nombre: nombre.trim().toUpperCase() }),
            ...(aPaterno !== undefined && { aPaterno: aPaterno.trim().toUpperCase() }),
            ...(aMaterno !== undefined && { aMaterno: aMaterno.trim().toUpperCase() }),
            ...(telefonoLimpio !== undefined && { contactoTelefonico: telefonoLimpio }),
            ...(especialidad !== undefined && { especialidad: especialidad.trim().toUpperCase() }),
            ...(idUsuario !== undefined && { idUsuario }),
            ...(activo !== undefined && { activo })
        };
        if (activo !== false) {
            const terapeutaActualizado = await prisma.terapeuta.update({
                where: { idTerapeuta: id },
                data: datos
            });
            return void res.json(terapeutaActualizado);
        }

        const resultado = await prisma.$transaction(async (tx) => {
            const anterior = await tx.terapeuta.findUnique({ where: { idTerapeuta: id } });
            const terapeuta = await tx.terapeuta.update({ where: { idTerapeuta: id }, data: datos });
            const citas = await resolverCitasDeBaja(tx, id, anterior?.especialidad ?? terapeuta.especialidad);
            return { ...terapeuta, citas };
        }, { isolationLevel: 'Serializable' });
        res.json(resultado);
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error) {
            if (error.code === 'P2025') return void res.status(404).json({ error: 'No se encontró el terapeuta.' });
            if (error.code === 'P2002') return void res.status(409).json({ error: 'El usuario ya está vinculado a otro terapeuta.' });
        }
        console.error('Error al actualizar terapeuta:', error);
        res.status(500).json({ error: 'Error al actualizar el terapeuta' });
    }
};

// Borrado lógico de terapeuta
export const deleteTerapeuta = async (req: Request, res: Response) => {
    const id = parsePathId(req.params.id);
    if (id === null) return void res.status(400).json({ error: 'Identificador de terapeuta inválido.' });

    try {
        const citas = await prisma.$transaction(async (tx) => {
            const terapeuta = await tx.terapeuta.update({
                where: { idTerapeuta: id },
                data: { activo: false }
            });
            return resolverCitasDeBaja(tx, id, terapeuta.especialidad);
        }, { isolationLevel: 'Serializable' });
        res.json({ mensaje: 'Terapeuta dado de baja correctamente', citas });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
            res.status(404).json({ error: 'No se encontró el terapeuta.' });
            return;
        }
        console.error('Error al dar de baja terapeuta:', error);
        res.status(500).json({ error: 'No se pudo dar de baja al terapeuta' });
    }
};