import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getPagos = async (req: Request, res: Response) => {
    try {
        const pagos = await prisma.pago.findMany({
            include: {
                cita: {
                    include: {
                        paciente: {
                            select: {
                                idPaciente: true,
                                nombre: true,
                                aPaterno: true,
                                aMaterno: true,
                                nombreFacturacion: true,
                                correoFacturacion: true
                            }
                        },
                        servicio: {
                            select: {
                                idServicio: true,
                                nombre: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                fecha: 'desc'
            }
        });
        res.json(pagos);
    } catch (error) {
        console.error('Error al obtener pagos:', error);
        res.status(500).json({ error: 'Error al obtener la lista de pagos' });
    }
};

export const createPago = async (req: Request, res: Response) => {
    const { fecha, metodo, facturacion, idCita } = req.body;

    if (!idCita || !metodo) {
        res.status(400).json({ error: 'Debes indicar la cita y el método de pago' });
        return;
    }

    try {
        const nuevoPago = await prisma.pago.create({
            data: {
                fecha: fecha ? new Date(fecha) : new Date(),
                metodo: String(metodo).trim().toUpperCase(),
                facturacion: facturacion ? 1 : 0,
                idCita: Number(idCita)
            }
        });
        res.status(201).json(nuevoPago);
    } catch (error) {
        console.error('Error al crear pago:', error);
        res.status(500).json({ error: 'Error al registrar el pago' });
    }
};

export const updatePago = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { fecha, metodo, facturacion, idCita } = req.body;

    try {
        const pagoActualizado = await prisma.pago.update({
            where: { idPago: id },
            data: {
                ...(fecha !== undefined && { fecha: new Date(fecha) }),
                ...(metodo !== undefined && { metodo: String(metodo).trim().toUpperCase() }),
                ...(facturacion !== undefined && { facturacion: facturacion ? 1 : 0 }),
                ...(idCita !== undefined && { idCita: Number(idCita) })
            }
        });
        res.json(pagoActualizado);
    } catch (error) {
        console.error('Error al actualizar pago:', error);
        res.status(500).json({ error: 'Error al actualizar el pago' });
    }
};

export const deletePago = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.pago.delete({
            where: { idPago: id }
        });
        res.json({ mensaje: 'Pago eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar pago:', error);
        res.status(500).json({ error: 'Error al eliminar el pago' });
    }
};