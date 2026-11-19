import { Request, Response } from 'express';
import prisma from '../config/prisma';

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

    const telefonoLimpio = String(contactoTelefonico || '').replace(/\D/g, '');

    if (
        !nombre?.trim() ||
        !aPaterno?.trim() ||
        !aMaterno?.trim() ||
        !especialidad?.trim() ||
        !/^\d{10}$/.test(telefonoLimpio)
    ) {
        res.status(400).json({ error: 'Por favor ingrese datos válidos y un teléfono de 10 dígitos.' });
        return;
    }

    try {
        const nuevoTerapeuta = await prisma.$transaction(async (tx) => {
            let usuarioIdFinal = idUsuario ? Number(idUsuario) : undefined;

            if (!usuarioIdFinal) {
                const primerNombreMayus = String(nombre).trim().split(/\s+/)[0].toUpperCase();
                const nombreUsuarioGenerado = `TERAPEUTA ${primerNombreMayus}`;

                const existente = await tx.usuario.findFirst({
                    where: { nombreUsuario: nombreUsuarioGenerado }
                });

                if (existente) {
                    throw new Error('USUARIO_DUPLICADO');
                }

                const usuarioCreado = await tx.usuario.create({
                    data: {
                        nombreUsuario: nombreUsuarioGenerado,
                        contrasena: String(contrasena || '123456').trim().slice(0, 30)
                    }
                });
                usuarioIdFinal = usuarioCreado.idUsuario;
            }

            return tx.terapeuta.create({
                data: {
                    nombre: String(nombre).trim().slice(0, 60).toUpperCase(),
                    aPaterno: String(aPaterno).trim().slice(0, 60).toUpperCase(),
                    aMaterno: String(aMaterno).trim().slice(0, 60).toUpperCase(),
                    especialidad: String(especialidad).trim().slice(0, 30).toUpperCase(),
                    contactoTelefonico: telefonoLimpio,
                    idUsuario: usuarioIdFinal,
                    activo: true
                }
            });
        });

        res.status(201).json(nuevoTerapeuta);
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'USUARIO_DUPLICADO') {
            res.status(409).json({ error: 'Ya existe un usuario con ese rol y primer nombre.' });
            return;
        }
        console.error('Error al crear terapeuta:', error);
        res.status(500).json({ error: 'Error al registrar el terapeuta' });
    }
};

export const updateTerapeuta = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { nombre, aPaterno, aMaterno, contactoTelefonico, especialidad, idUsuario, activo } = req.body;

    if (
        (nombre !== undefined && !String(nombre).trim()) ||
        (aPaterno !== undefined && !String(aPaterno).trim()) ||
        (aMaterno !== undefined && !String(aMaterno).trim()) ||
        (especialidad !== undefined && !String(especialidad).trim())
    ) {
        res.status(400).json({ error: 'Los campos enviados no pueden quedar vacíos.' });
        return;
    }

    const telefonoLimpio =
        contactoTelefonico !== undefined ? String(contactoTelefonico).replace(/\D/g, '') : undefined;

    if (telefonoLimpio !== undefined && !/^\d{10}$/.test(telefonoLimpio)) {
        res.status(400).json({ error: 'El teléfono debe contener exactamente 10 dígitos.' });
        return;
    }

    try {
        const terapeutaActualizado = await prisma.terapeuta.update({
            where: { idTerapeuta: id },
            data: {
                ...(nombre !== undefined && { nombre: String(nombre).trim().slice(0, 60).toUpperCase() }),
                ...(aPaterno !== undefined && { aPaterno: String(aPaterno).trim().slice(0, 60).toUpperCase() }),
                ...(aMaterno !== undefined && { aMaterno: String(aMaterno).trim().slice(0, 60).toUpperCase() }),
                ...(telefonoLimpio !== undefined && { contactoTelefonico: telefonoLimpio }),
                ...(especialidad !== undefined && { especialidad: String(especialidad).trim().slice(0, 30).toUpperCase() }),
                ...(idUsuario !== undefined && { idUsuario: Number(idUsuario) }),
                ...(activo !== undefined && { activo: Boolean(activo) })
            }
        });
        res.json(terapeutaActualizado);
    } catch (error) {
        console.error('Error al actualizar terapeuta:', error);
        res.status(500).json({ error: 'Error al actualizar el terapeuta' });
    }
};

// Borrado lógico de terapeuta
export const deleteTerapeuta = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.terapeuta.update({
            where: { idTerapeuta: id },
            data: { activo: false }
        });
        res.json({ mensaje: 'Terapeuta dado de baja correctamente' });
    } catch (error) {
        console.error('Error al dar de baja terapeuta:', error);
        res.status(500).json({ error: 'No se pudo dar de baja al terapeuta' });
    }
};