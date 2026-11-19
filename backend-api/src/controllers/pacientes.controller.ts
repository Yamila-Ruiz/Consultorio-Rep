import { Request, Response } from 'express';
import prisma from '../config/prisma';

const CORREO_PUBLICO_GENERAL = 'publico.general@clinica.com';

export const getPacientes = async (req: Request, res: Response) => {
    try {
        const pacientes = await prisma.paciente.findMany({
            orderBy: [
                { aPaterno: 'asc' },
                { aMaterno: 'asc' },
                { nombre: 'asc' }
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
        res.json(pacientes);
    } catch (error) {
        console.error('Error al obtener pacientes:', error);
        res.status(500).json({ error: 'Error al obtener la lista de pacientes' });
    }
};

export const createPaciente = async (req: Request, res: Response) => {
    const {
        nombre,
        aPaterno,
        aMaterno,
        edad,
        contactoTelefonico,
        requiereFactura,
        nombreFacturacion,
        correoFacturacion,
        fechaRegistro,
        idTerapeuta
    } = req.body;

    const telefonoLimpio = String(contactoTelefonico || '').replace(/\D/g, '');

    if (!/^\d{10}$/.test(telefonoLimpio)) {
        res.status(400).json({ error: 'El teléfono debe contener exactamente 10 dígitos numéricos.' });
        return;
    }

    const edadNum = Number(edad);
    const edadValida =
        edad !== undefined &&
        edad !== null &&
        String(edad).trim() !== '' &&
        !Number.isNaN(edadNum) &&
        Number.isInteger(edadNum) &&
        edadNum >= 0 &&
        edadNum < 18;

    if (!nombre?.trim() || !aPaterno?.trim() || !aMaterno?.trim() || !edadValida || !idTerapeuta) {
        res.status(400).json({ error: 'Rellene todos los campos obligatorios con datos válidos.' });
        return;
    }

    const necesitaFactura = Boolean(
        requiereFactura === true || requiereFactura === 1 || requiereFactura === 'true'
    );

    let nombreFactFinal = 'PÚBLICO GENERAL';
    let correoFactFinal = CORREO_PUBLICO_GENERAL;

    if (necesitaFactura) {
        const correoLimpio = String(correoFacturacion || '').trim().toLowerCase();
        if (!nombreFacturacion?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
            res.status(400).json({
                error: 'Si requiere factura, debe capturar un nombre y correo de facturación válidos.'
            });
            return;
        }
        nombreFactFinal = String(nombreFacturacion).trim().toUpperCase();
        correoFactFinal = correoLimpio;
    }

    try {
        const nuevoPaciente = await prisma.paciente.create({
            data: {
                nombre: String(nombre).trim().toUpperCase(),
                aPaterno: String(aPaterno).trim().toUpperCase(),
                aMaterno: String(aMaterno).trim().toUpperCase(),
                edad: edadNum,
                contactoTelefonico: telefonoLimpio,
                requiereFactura: necesitaFactura,
                nombreFacturacion: nombreFactFinal,
                correoFacturacion: correoFactFinal,
                fechaRegistro: fechaRegistro ? new Date(fechaRegistro) : new Date(),
                idTerapeuta: Number(idTerapeuta),
                activo: true
            }
        });
        res.status(201).json(nuevoPaciente);
    } catch (error) {
        console.error('Error al crear paciente:', error);
        res.status(500).json({ error: 'Error al registrar el paciente' });
    }
};

export const updatePaciente = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const {
        nombre,
        aPaterno,
        aMaterno,
        edad,
        contactoTelefonico,
        requiereFactura,
        nombreFacturacion,
        correoFacturacion,
        idTerapeuta,
        activo
    } = req.body;

    const telefonoLimpio =
        contactoTelefonico !== undefined ? String(contactoTelefonico).replace(/\D/g, '') : undefined;

    if (telefonoLimpio !== undefined && !/^\d{10}$/.test(telefonoLimpio)) {
        res.status(400).json({ error: 'El teléfono debe contener exactamente 10 dígitos numéricos.' });
        return;
    }

    if (edad !== undefined) {
        const edadNum = Number(edad);
        if (
            edad === '' ||
            edad === null ||
            Number.isNaN(edadNum) ||
            !Number.isInteger(edadNum) ||
            edadNum < 0 ||
            edadNum >= 18
        ) {
            res.status(400).json({ error: 'La edad debe ser un número entero menor a 18 años.' });
            return;
        }
    }

    let datosFacturacion: {
        requiereFactura?: boolean;
        nombreFacturacion?: string;
        correoFacturacion?: string;
    } = {};

    if (requiereFactura !== undefined) {
        const necesitaFactura = Boolean(
            requiereFactura === true || requiereFactura === 1 || requiereFactura === 'true'
        );

        if (!necesitaFactura) {
            datosFacturacion = {
                requiereFactura: false,
                nombreFacturacion: 'PÚBLICO GENERAL',
                correoFacturacion: CORREO_PUBLICO_GENERAL
            };
        } else {
            const correoLimpio = String(correoFacturacion || '').trim().toLowerCase();
            if (!nombreFacturacion?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
                res.status(400).json({
                    error: 'Si requiere factura, debe capturar un nombre y correo de facturación válidos.'
                });
                return;
            }
            datosFacturacion = {
                requiereFactura: true,
                nombreFacturacion: String(nombreFacturacion).trim().toUpperCase(),
                correoFacturacion: correoLimpio
            };
        }
    } else {
        if (nombreFacturacion !== undefined) {
            datosFacturacion.nombreFacturacion = String(nombreFacturacion).trim().toUpperCase();
        }
        if (correoFacturacion !== undefined) {
            datosFacturacion.correoFacturacion = String(correoFacturacion).trim().toLowerCase();
        }
    }

    try {
        const pacienteActualizado = await prisma.paciente.update({
            where: { idPaciente: id },
            data: {
                ...(nombre !== undefined && { nombre: String(nombre).trim().toUpperCase() }),
                ...(aPaterno !== undefined && { aPaterno: String(aPaterno).trim().toUpperCase() }),
                ...(aMaterno !== undefined && { aMaterno: String(aMaterno).trim().toUpperCase() }),
                ...(edad !== undefined && { edad: Number(edad) }),
                ...(telefonoLimpio !== undefined && { contactoTelefonico: telefonoLimpio }),
                ...datosFacturacion,
                ...(idTerapeuta !== undefined && { idTerapeuta: Number(idTerapeuta) }),
                ...(activo !== undefined && { activo: Boolean(activo) })
            }
        });
        res.json(pacienteActualizado);
    } catch (error) {
        console.error('Error al actualizar paciente:', error);
        res.status(500).json({ error: 'Error al actualizar el paciente' });
    }
};

// Borrado lógico de paciente
export const deletePaciente = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.paciente.update({
            where: { idPaciente: id },
            data: { activo: false }
        });
        res.json({ mensaje: 'Paciente dado de baja correctamente' });
    } catch (error) {
        console.error('Error al dar de baja paciente:', error);
        res.status(500).json({ error: 'No se pudo dar de baja al paciente' });
    }
};