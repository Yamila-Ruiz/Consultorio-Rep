import { Request, Response } from 'express';
import prisma from '../config/prisma';

const normalizarTexto = (texto: unknown) =>
    String(texto || '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

// Consulta los pagos y recupera paciente, servicio y terapeuta mediante la cita relacionada.
export const getPagos = async (_req: Request, res: Response) => {
    try {
        const pagos = await prisma.pago.findMany({
            include: {
                cita: {
                    include: {
                        paciente: true,
                        servicio: true,
                        slotdisponibilidad: { include: { terapeuta: true } }
                    }
                }
            },
            orderBy: [{ fecha: 'desc' }, { idPago: 'desc' }]
        });

        // Se incluye el alias "facturacion" para que el frontend lo lea directamente
        const pagosFormateados = pagos.map((p) => ({
            ...p,
            facturacion: p.requiereFactura
        }));

        res.json(pagosFormateados);
    } catch (error) {
        console.error('Error al obtener pagos:', error);
        res.status(500).json({ error: 'Error al obtener los pagos registrados' });
    }
};

// Registra un pago tomando el monto del precio actual del servicio de la cita.
export const registrarPago = async (req: Request, res: Response) => {
    const {
        idCita,
        metodoPago,
        metodo,
        nombreFacturacion,
        correoFacturacion
    } = req.body;

    // Recibir la opción de facturación desde React o desde Prisma.
    const facturacionRecibida = req.body.requiereFactura ?? req.body.facturacion;

    let requiereFactura = false;

    if (
        facturacionRecibida === true ||
        facturacionRecibida === 'true' ||
        facturacionRecibida === 'SI' ||
        facturacionRecibida === 1
    ) {
        requiereFactura = true;
    } else if (
        facturacionRecibida === false ||
        facturacionRecibida === 'false' ||
        facturacionRecibida === 'NO' ||
        facturacionRecibida === 0 ||
        facturacionRecibida === undefined ||
        facturacionRecibida === null
    ) {
        requiereFactura = false;
    } else {
        res.status(400).json({
            error: 'El campo de facturación debe ser verdadero o falso'
        });
        return;
    }

    const citaId = Number(idCita);

    if (!Number.isInteger(citaId) || citaId <= 0) {
        res.status(400).json({
            error: 'Debes seleccionar una cita válida'
        });
        return;
    }

    // Validar el método de pago aceptando con o sin acentos.
    const metodoNormalizado = normalizarTexto(metodoPago ?? metodo);

    const metodosPermitidos = [
        'EFECTIVO',
        'TARJETA DE DEBITO',
        'TARJETA DE CREDITO',
        'TRANSFERENCIA'
    ];

    if (!metodosPermitidos.includes(metodoNormalizado)) {
        res.status(400).json({
            error: 'Selecciona un método de pago válido'
        });
        return;
    }

    // Obtener los datos de facturación únicamente cuando se solicite.
    const nombre = requiereFactura
        ? String(nombreFacturacion || '').trim().toUpperCase()
        : null;

    const correo = requiereFactura
        ? String(correoFacturacion || '').trim().toLowerCase()
        : null;

    const correoValido = correo
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
        : false;

    if (
        requiereFactura &&
        (!nombre || nombre.length > 50 || !correo || correo.length > 60 || !correoValido)
    ) {
        res.status(400).json({
            error: 'Para facturar captura un nombre y correo válidos'
        });
        return;
    }

    try {
        const pago = await prisma.$transaction(async (tx) => {
            const cita = await tx.cita.findUnique({
                where: { idCita: citaId },
                include: { servicio: true }
            });

            if (!cita) throw new Error('CITA_NO_EXISTE');

            if (cita.estado !== 'CONFIRMADA' && cita.estado !== 'ATENDIDA') {
                throw new Error('CITA_NO_COBRABLE');
            }

            const existente = await tx.pago.findUnique({
                where: { idCita: citaId }
            });

            if (existente) throw new Error('PAGO_DUPLICADO');

            const monto = cita.servicio.precio;

            if (Number(monto) <= 0) throw new Error('PRECIO_INVALIDO');

            const nuevoPago = await tx.pago.create({
                data: {
                    fecha: new Date(),
                    metodo: metodoNormalizado,
                    monto,
                    requiereFactura,
                    nombreFacturacion: nombre,
                    correoFacturacion: correo,
                    idCita: citaId
                },
                include: {
                    cita: {
                        include: {
                            paciente: true,
                            servicio: true,
                            slotdisponibilidad: {
                                include: { terapeuta: true }
                            }
                        }
                    }
                }
            });

            if (cita.estado === 'CONFIRMADA') {
                await tx.cita.update({
                    where: { idCita: citaId },
                    data: { estado: 'ATENDIDA' }
                });
            }

            return {
                ...nuevoPago,
                facturacion: nuevoPago.requiereFactura
            };
        });

        res.status(201).json(pago);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'CITA_NO_EXISTE') {
                res.status(404).json({ error: 'La cita no existe' });
                return;
            }
            if (error.message === 'CITA_NO_COBRABLE') {
                res.status(400).json({ error: 'Solo se pueden cobrar citas confirmadas o atendidas' });
                return;
            }
            if (error.message === 'PAGO_DUPLICADO') {
                res.status(409).json({ error: 'Esta cita ya tiene un pago registrado' });
                return;
            }
            if (error.message === 'PRECIO_INVALIDO') {
                res.status(400).json({ error: 'El servicio no tiene un precio válido' });
                return;
            }
        }

        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
            res.status(409).json({ error: 'Esta cita ya tiene un pago registrado' });
            return;
        }

        console.error('Error al registrar pago:', error);
        res.status(500).json({ error: 'Error al registrar el pago' });
    }
};

// Permite corregir el método y los datos de facturación sin alterar el importe histórico.
export const updatePago = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: 'Identificador de pago inválido' });

    const { metodoPago, metodo, nombreFacturacion, correoFacturacion } = req.body;
    const facturacionRecibida = req.body.requiereFactura ?? req.body.facturacion;

    try {
        const actual = await prisma.pago.findUnique({ where: { idPago: id } });
        if (!actual) return void res.status(404).json({ error: 'No se encontró el pago' });
        const data: Record<string, unknown> = {};

        const metodoEntrada = metodoPago ?? metodo;
        if (metodoEntrada !== undefined) {
            const metodoNormalizado = normalizarTexto(metodoEntrada);
            if (!['EFECTIVO', 'TARJETA DE DEBITO', 'TARJETA DE CREDITO', 'TRANSFERENCIA'].includes(metodoNormalizado)) {
                return void res.status(400).json({ error: 'Método de pago inválido' });
            }
            data.metodo = metodoNormalizado;
        }

        if (facturacionRecibida !== undefined) {
            if (typeof facturacionRecibida !== 'boolean') {
                return void res.status(400).json({ error: 'El campo de facturación debe ser verdadero o falso' });
            }
            data.requiereFactura = facturacionRecibida;
            if (!facturacionRecibida) {
                data.nombreFacturacion = null;
                data.correoFacturacion = null;
            } else {
                const nombre = String(nombreFacturacion ?? actual.nombreFacturacion ?? '').trim().toUpperCase();
                const correo = String(correoFacturacion ?? actual.correoFacturacion ?? '').trim().toLowerCase();
                if (!nombre || nombre.length > 50 || correo.length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
                    return void res.status(400).json({ error: 'Datos de facturación inválidos' });
                }
                data.nombreFacturacion = nombre;
                data.correoFacturacion = correo;
            }
        } else if (nombreFacturacion !== undefined || correoFacturacion !== undefined) {
            if (!actual.requiereFactura) return void res.status(400).json({ error: 'Este pago no tiene facturación habilitada' });
            const nombre = String(nombreFacturacion ?? actual.nombreFacturacion ?? '').trim().toUpperCase();
            const correo = String(correoFacturacion ?? actual.correoFacturacion ?? '').trim().toLowerCase();
            if (!nombre || nombre.length > 50 || correo.length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
                return void res.status(400).json({ error: 'Datos de facturación inválidos' });
            }
            data.nombreFacturacion = nombre;
            data.correoFacturacion = correo;
        }

        if (!Object.keys(data).length) return void res.status(400).json({ error: 'No hay datos para actualizar' });

        const actualizado = await prisma.pago.update({
            where: { idPago: id },
            data,
            include: { cita: { include: { paciente: true, servicio: true, slotdisponibilidad: { include: { terapeuta: true } } } } }
        });

        res.json({ ...actualizado, facturacion: actualizado.requiereFactura });
    } catch (error) {
        console.error('Error al actualizar pago:', error);
        res.status(500).json({ error: 'Error al actualizar el pago' });
    }
};

export const deletePago = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: 'Identificador de pago inválido' });
    try {
        await prisma.pago.delete({ where: { idPago: id } });
        res.json({ mensaje: 'Pago eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar pago:', error);
        res.status(500).json({ error: 'Error al eliminar el pago' });
    }
};