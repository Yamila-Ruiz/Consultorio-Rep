import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { isOptionalNullableString, isPositiveInteger, parsePathId } from '../utils/requestValidation';

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
        res.json(pagos);
    } catch (error) {
        console.error('Error al obtener pagos:', error);
        res.status(500).json({ error: 'Error al obtener los pagos registrados' });
    }
};

// Registra un pago tomando el monto del precio actual del servicio de la cita.
// El nombre y correo de facturación se guardan en el pago, nunca en el paciente.

export const registrarPago = async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const {
        idCita,
        metodoPago,
        nombreFacturacion,
        correoFacturacion
    } = body;

    const facturacionRecibida = body.facturacion !== undefined ? body.facturacion : body.requiereFactura;
    if (facturacionRecibida !== undefined && typeof facturacionRecibida !== 'boolean') {
        res.status(400).json({
            error: 'El campo de facturación debe ser booleano.'
        });
        return;
    }
    const requiereFactura = facturacionRecibida ?? false;

    if (!isPositiveInteger(idCita)) {
        res.status(400).json({
            error: 'Debes seleccionar una cita válida'
        });
        return;
    }
    const citaId = idCita;

    if (typeof metodoPago !== 'string') {
        res.status(400).json({ error: 'El método de pago debe enviarse como texto.' });
        return;
    }
    if (
        !isOptionalNullableString(nombreFacturacion, 50) ||
        !isOptionalNullableString(correoFacturacion, 60)
    ) {
        res.status(400).json({ error: 'El nombre y el correo de facturación deben ser texto.' });
        return;
    }
    const metodo = metodoPago.trim().toUpperCase();

    const metodosPermitidos = [
        'EFECTIVO',
        'TARJETA DE DEBITO',
        'TARJETA DE CREDITO',
        'TRANSFERENCIA'
    ];

    if (!metodosPermitidos.includes(metodo)) {
        res.status(400).json({
            error: 'Selecciona un método de pago válido'
        });
        return;
    }

    // Obtener los datos de facturación únicamente cuando se solicite.
    const nombre = requiereFactura && typeof nombreFacturacion === 'string'
        ? nombreFacturacion.trim().toUpperCase()
        : null;

    const correo = requiereFactura && typeof correoFacturacion === 'string'
        ? correoFacturacion.trim().toLowerCase()
        : null;

    const correoValido = correo
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
        : false;

    if (
        requiereFactura &&
        (!nombre || nombre.length > 50 ||
            !correo || correo.length > 60 || !correoValido)
    ) {
        res.status(400).json({
            error: 'Para facturar captura un nombre y correo válidos'
        });
        return;
    }

    try {
        const pago = await prisma.$transaction(async (tx) => {

            // Consultar la cita y obtener el servicio relacionado.
            const cita = await tx.cita.findUnique({
                where: {
                    idCita: citaId
                },
                include: {
                    servicio: true
                }
            });

            if (!cita) {
                throw new Error('CITA_NO_EXISTE');
            }

            // Solamente se pueden cobrar citas confirmadas o atendidas.
            if (
                cita.estado !== 'CONFIRMADA' &&
                cita.estado !== 'ATENDIDA'
            ) {
                throw new Error('CITA_NO_COBRABLE');
            }

            // Comprobar que la cita todavía no tenga un pago.
            const existente = await tx.pago.findUnique({
                where: {
                    idCita: citaId
                }
            });

            if (existente) {
                throw new Error('PAGO_DUPLICADO');
            }

            // Obtener el monto del precio del servicio.
            const monto = cita.servicio.precio;

            if (Number(monto) <= 0) {
                throw new Error('PRECIO_INVALIDO');
            }

            // Guardar el pago y conservar sus datos históricos de facturación.
            const nuevoPago = await tx.pago.create({
                data: {
                    fecha: new Date(),
                    metodo,
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
                                include: {
                                    terapeuta: true
                                }
                            }
                        }
                    }
                }
            });

            // Cambiar la cita a atendida después de registrar el pago.
            if (cita.estado === 'CONFIRMADA') {
                await tx.cita.update({
                    where: {
                        idCita: citaId
                    },
                    data: {
                        estado: 'ATENDIDA'
                    }
                });
            }

            return nuevoPago;
        });

        res.status(201).json(pago);

    } catch (error) {

        if (error instanceof Error) {
            if (error.message === 'CITA_NO_EXISTE') {
                res.status(404).json({
                    error: 'La cita no existe'
                });
                return;
            }

            if (error.message === 'CITA_NO_COBRABLE') {
                res.status(400).json({
                    error: 'Solo se pueden cobrar citas confirmadas o atendidas'
                });
                return;
            }

            if (error.message === 'PAGO_DUPLICADO') {
                res.status(409).json({
                    error: 'Esta cita ya tiene un pago registrado'
                });
                return;
            }

            if (error.message === 'PRECIO_INVALIDO') {
                res.status(400).json({
                    error: 'El servicio no tiene un precio válido'
                });
                return;
            }
        }

        // Evitar pagos duplicados mediante la restricción UNIQUE de idCita.
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'P2002'
        ) {
            res.status(409).json({
                error: 'Esta cita ya tiene un pago registrado'
            });
            return;
        }

        console.error('Error al registrar pago:', error);

        res.status(500).json({
            error: 'Error al registrar el pago'
        });
    }
};


// Permite corregir el método y los datos de facturación sin alterar el importe histórico.
export const updatePago = async (req: Request, res: Response) => {
    const id = parsePathId(req.params.id);
    if (id === null) return void res.status(400).json({ error: 'Identificador de pago inválido' });

    const { metodoPago, facturacion, nombreFacturacion, correoFacturacion } =
        req.body as Record<string, unknown>;
    if (metodoPago !== undefined && typeof metodoPago !== 'string') {
        return void res.status(400).json({ error: 'El método de pago debe enviarse como texto.' });
    }
    if (facturacion !== undefined && typeof facturacion !== 'boolean') {
        return void res.status(400).json({ error: 'facturacion debe ser un valor booleano.' });
    }
    if (
        !isOptionalNullableString(nombreFacturacion, 50) ||
        !isOptionalNullableString(correoFacturacion, 60)
    ) {
        return void res.status(400).json({ error: 'El nombre y el correo de facturación deben ser texto.' });
    }
    try {
        const actual = await prisma.pago.findUnique({ where: { idPago: id } });
        if (!actual) return void res.status(404).json({ error: 'No se encontró el pago' });
        const data: any = {};

        if (metodoPago !== undefined) {
            const metodo = metodoPago.trim().toUpperCase();
            if (!['EFECTIVO', 'TARJETA DE DEBITO', 'TARJETA DE CREDITO', 'TRANSFERENCIA'].includes(metodo)) {
                return void res.status(400).json({ error: 'Método de pago inválido' });
            }
            data.metodo = metodo;
        }
        if (facturacion !== undefined) {
            if (typeof facturacion !== 'boolean') return void res.status(400).json({ error: 'facturacion debe ser verdadero o falso' });
            data.requiereFactura = facturacion;
            if (!facturacion) {
                data.nombreFacturacion = null;
                data.correoFacturacion = null;
            } else {
                const nombre = (nombreFacturacion ?? actual.nombreFacturacion ?? '').trim().toUpperCase();
                const correo = (correoFacturacion ?? actual.correoFacturacion ?? '').trim().toLowerCase();
                if (!nombre || nombre.length > 50 || correo.length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
                    return void res.status(400).json({ error: 'Datos de facturación inválidos' });
                }
                data.nombreFacturacion = nombre;
                data.correoFacturacion = correo;
            }
        } else if (nombreFacturacion !== undefined || correoFacturacion !== undefined) {
            if (!actual.requiereFactura) return void res.status(400).json({ error: 'Este pago no tiene facturación habilitada' });
            const nombre = (nombreFacturacion ?? actual.nombreFacturacion ?? '').trim().toUpperCase();
            const correo = (correoFacturacion ?? actual.correoFacturacion ?? '').trim().toLowerCase();
            if (!nombre || nombre.length > 50 || correo.length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
                return void res.status(400).json({ error: 'Datos de facturación inválidos' });
            }
            data.nombreFacturacion = nombre;
            data.correoFacturacion = correo;
        }
        if (!Object.keys(data).length) return void res.status(400).json({ error: 'No hay datos para actualizar' });

        const actualizado = await prisma.pago.update({
            where: { idPago: id }, data,
            include: { cita: { include: { paciente: true, servicio: true, slotdisponibilidad: { include: { terapeuta: true } } } } }
        });
        res.json(actualizado);
    } catch (error) {
        console.error('Error al actualizar pago:', error);
        res.status(500).json({ error: 'Error al actualizar el pago' });
    }
};

// Conserva el comportamiento CRUD existente; eliminar pagos requiere definir antes una reversión contable.
export const deletePago = async (req: Request, res: Response) => {
    const id = parsePathId(req.params.id);
    if (id === null) return void res.status(400).json({ error: 'Identificador de pago inválido' });
    try {
        await prisma.pago.delete({ where: { idPago: id } });
        res.json({ mensaje: 'Pago eliminado correctamente' });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
            res.status(404).json({ error: 'No se encontró el pago.' });
            return;
        }
        console.error('Error al eliminar pago:', error);
        res.status(500).json({ error: 'Error al eliminar el pago' });
    }
};
