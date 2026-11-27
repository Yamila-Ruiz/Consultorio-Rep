import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getMultas = async (_req: Request, res: Response) => {
    try {
        const multas = await prisma.multa.findMany({
            include: {
                cita: {
                    include: {
                        paciente: {
                            select: {
                                idPaciente: true,
                                nombre: true,
                                aPaterno: true,
                                aMaterno: true
                            }
                        },
                        servicio: { select: { nombre: true } },
                        slotdisponibilidad: {
                            include: {
                                terapeuta: {
                                    select: {
                                        idTerapeuta: true,
                                        nombre: true,
                                        aPaterno: true,
                                        aMaterno: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [{ fechaGeneracion: 'desc' }, { idMulta: 'desc' }]
        });
        res.json(multas);
    } catch (error) {
        console.error('Error al obtener multas:', error);
        res.status(500).json({ error: 'Error al obtener la lista de multas' });
    }
};
