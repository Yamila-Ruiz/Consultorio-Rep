import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Consulta el catálogo completo; activos=true permite solicitar solo servicios disponibles para agendar.
export const getServicios = async (req: Request, res: Response) => {
    try {
        const servicios = await prisma.servicio.findMany({
            where: req.query.activos === 'true' ? { activo: true } : {},
            orderBy: { nombre: 'asc' }
        });
        res.json(servicios);
    } catch (error) {
        console.error('Error al obtener servicios:', error);
        res.status(500).json({ error: 'Error al obtener la lista de servicios' });
    }
};

// Registra un servicio con precio obligatorio, que será la fuente del monto de sus pagos futuros.
export const createServicio = async (req: Request, res: Response) => {
    const { nombre, descripcion, precio, activo } = req.body;
    const nombreLimpio = typeof nombre === 'string' ? nombre.trim().toUpperCase() : '';
    const descripcionLimpia = typeof descripcion === 'string' ? descripcion.trim().toUpperCase() : '';
    const precioNumero = Number(precio);

    if (!nombreLimpio || nombreLimpio.length > 30) return void res.status(400).json({ error: 'El nombre es obligatorio y no debe superar 30 caracteres' });
    if (descripcionLimpia.length > 50) return void res.status(400).json({ error: 'La descripción no debe superar 50 caracteres' });
    if (!Number.isFinite(precioNumero) || precioNumero <= 0 || Math.round(precioNumero * 100) !== precioNumero * 100) {
        return void res.status(400).json({ error: 'El precio debe ser mayor que cero y tener máximo dos decimales' });
    }
    if (activo !== undefined && typeof activo !== 'boolean') return void res.status(400).json({ error: 'El estado activo debe ser booleano' });

    try {
        const existente = await prisma.servicio.findFirst({ where: { nombre: nombreLimpio } });
        if (existente) return void res.status(409).json({ error: 'Ya existe un servicio con ese nombre' });
        const servicio = await prisma.servicio.create({
            data: { nombre: nombreLimpio, descripcion: descripcionLimpia, precio: precioNumero, activo: activo ?? true }
        });
        res.status(201).json(servicio);
    } catch (error) {
        console.error('Error al crear servicio:', error);
        res.status(500).json({ error: 'Error al registrar el servicio' });
    }
};

// Actualiza únicamente los campos recibidos; cambiar el precio no altera pagos históricos.
export const updateServicio = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: 'Identificador de servicio inválido' });
    const { nombre, descripcion, precio, activo } = req.body;
    try {
        const actual = await prisma.servicio.findUnique({ where: { idServicio: id } });
        if (!actual) return void res.status(404).json({ error: 'No se encontró el servicio' });
        const data: any = {};
        if (nombre !== undefined) {
            const value = typeof nombre === 'string' ? nombre.trim().toUpperCase() : '';
            if (!value || value.length > 30) return void res.status(400).json({ error: 'El nombre es obligatorio y no debe superar 30 caracteres' });
            const duplicado = await prisma.servicio.findFirst({ where: { nombre: value, NOT: { idServicio: id } } });
            if (duplicado) return void res.status(409).json({ error: 'Ya existe otro servicio con ese nombre' });
            data.nombre = value;
        }
        if (descripcion !== undefined) {
            const value = typeof descripcion === 'string' ? descripcion.trim().toUpperCase() : '';
            if (value.length > 50) return void res.status(400).json({ error: 'La descripción no debe superar 50 caracteres' });
            data.descripcion = value;
        }
        if (precio !== undefined) {
            const value = Number(precio);
            if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) !== value * 100) return void res.status(400).json({ error: 'El precio debe ser mayor que cero y tener máximo dos decimales' });
            data.precio = value;
        }
        if (activo !== undefined) {
            if (typeof activo !== 'boolean') return void res.status(400).json({ error: 'El estado activo debe ser booleano' });
            data.activo = activo;
        }
        if (!Object.keys(data).length) return void res.status(400).json({ error: 'No hay datos para actualizar' });
        const actualizado = await prisma.servicio.update({ where: { idServicio: id }, data });
        res.json(actualizado);
    } catch (error) {
        console.error('Error al actualizar servicio:', error);
        res.status(500).json({ error: 'Error al actualizar el servicio' });
    }
};

// Da de baja lógicamente el servicio para conservar las citas que lo utilizaron.
export const deleteServicio = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: 'Identificador de servicio inválido' });
    try {
        const actual = await prisma.servicio.findUnique({ where: { idServicio: id } });
        if (!actual) return void res.status(404).json({ error: 'No se encontró el servicio' });
        if (!actual.activo) return void res.status(409).json({ error: 'El servicio ya está inactivo' });
        const actualizado = await prisma.servicio.update({ where: { idServicio: id }, data: { activo: false } });
        res.json({ mensaje: 'Servicio dado de baja correctamente', servicio: actualizado });
    } catch (error) {
        console.error('Error al dar de baja servicio:', error);
        res.status(500).json({ error: 'No se pudo dar de baja el servicio' });
    }
};
