import { Request, Response } from 'express';
import prisma from '../config/prisma';

const fechaLocalHoy = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
};

const validarFecha = (valor: unknown): Date | null => {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
    const [y, m, d] = valor.split('-').map(Number);
    const fecha = new Date(y, m - 1, d, 12, 0, 0);
    return fecha.getFullYear() === y && fecha.getMonth() === m - 1 && fecha.getDate() === d ? fecha : null;
};

// Consulta los expedientes conservando la relación con el terapeuta asignado.
export const getPacientes = async (_req: Request, res: Response) => {
    try {
        const pacientes = await prisma.paciente.findMany({
            include: { terapeuta: true },
            orderBy: [{ aPaterno: 'asc' }, { aMaterno: 'asc' }, { nombre: 'asc' }]
        });
        res.json(pacientes);
    } catch (error) {
        console.error('Error al obtener pacientes:', error);
        res.status(500).json({ error: 'Error al obtener la lista de pacientes' });
    }
};

// Registra los datos personales; fechaRegistro usa la fecha local actual si no se proporciona.
export const createPaciente = async (req: Request, res: Response) => {
    const { nombre, aPaterno, aMaterno, edad, contactoTelefonico, fechaRegistro, idTerapeuta } = req.body;
    const nombreLimpio = String(nombre || '').trim().toUpperCase();
    const paterno = String(aPaterno || '').trim().toUpperCase();
    const materno = String(aMaterno || '').trim().toUpperCase();
    const edadNumero = Number(edad);
    const telefono = String(contactoTelefonico || '').replace(/\D/g, '');
    const terapeutaId = Number(idTerapeuta);
    if (!nombreLimpio || nombreLimpio.length > 30 || !paterno || paterno.length > 30 || !materno || materno.length > 30) return void res.status(400).json({ error: 'Nombre y apellidos son obligatorios y no deben superar 30 caracteres' });
    if (!Number.isInteger(edadNumero) || edadNumero < 0 || edadNumero > 17) return void res.status(400).json({ error: 'La edad debe ser un entero entre 0 y 17 años' });
    if (!/^\d{10}$/.test(telefono)) return void res.status(400).json({ error: 'El teléfono debe contener 10 dígitos' });
    if (!Number.isInteger(terapeutaId) || terapeutaId <= 0) return void res.status(400).json({ error: 'Selecciona un terapeuta válido' });
    const fecha = fechaRegistro === undefined || fechaRegistro === '' ? fechaLocalHoy() : validarFecha(fechaRegistro);
    if (!fecha) return void res.status(400).json({ error: 'La fecha de registro debe tener formato AAAA-MM-DD y ser válida' });
    try {
        const terapeuta = await prisma.terapeuta.findUnique({ where: { idTerapeuta: terapeutaId } });
        if (!terapeuta || !terapeuta.activo) return void res.status(400).json({ error: 'El terapeuta no existe o está inactivo' });
        const paciente = await prisma.paciente.create({
            data: { nombre: nombreLimpio, aPaterno: paterno, aMaterno: materno, edad: edadNumero, contactoTelefonico: telefono, fechaRegistro: fecha, idTerapeuta: terapeutaId, activo: true },
            include: { terapeuta: true }
        });
        res.status(201).json(paciente);
    } catch (error) {
        console.error('Error al registrar paciente:', error);
        res.status(500).json({ error: 'Error al registrar el paciente' });
    }
};

// Actualiza solo los datos enviados; los datos de facturación pertenecen al pago y no al paciente.
export const updatePaciente = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ error: 'Identificador de paciente inválido' });
    const { nombre, aPaterno, aMaterno, edad, contactoTelefonico, fechaRegistro, idTerapeuta, activo } = req.body;
    try {
        const actual = await prisma.paciente.findUnique({ where: { idPaciente: id } });
        if (!actual) return void res.status(404).json({ error: 'No se encontró el paciente' });
        const data: any = {};
        for (const [campo, valor] of [['nombre', nombre], ['aPaterno', aPaterno], ['aMaterno', aMaterno]] as const) {
            if (valor !== undefined) {
                const texto = String(valor).trim().toUpperCase();
                if (!texto || texto.length > 30) return void res.status(400).json({ error: `${campo} es obligatorio y no debe superar 30 caracteres` });
                data[campo] = texto;
            }
        }
        if (edad !== undefined) {
            const n = Number(edad);
            if (!Number.isInteger(n) || n < 0 || n > 17) return void res.status(400).json({ error: 'La edad debe ser un entero entre 0 y 17 años' });
            data.edad = n;
        }
        if (contactoTelefonico !== undefined) {
            const tel = String(contactoTelefonico).replace(/\D/g, '');
            if (!/^\d{10}$/.test(tel)) return void res.status(400).json({ error: 'El teléfono debe contener 10 dígitos' });
            data.contactoTelefonico = tel;
        }
        if (fechaRegistro !== undefined) {
            const fecha = validarFecha(fechaRegistro);
            if (!fecha) return void res.status(400).json({ error: 'La fecha de registro no es válida' });
            data.fechaRegistro = fecha;
        }
        if (idTerapeuta !== undefined) {
            const terapeutaId = Number(idTerapeuta);
            if (!Number.isInteger(terapeutaId) || terapeutaId <= 0) return void res.status(400).json({ error: 'Terapeuta inválido' });
            const terapeuta = await prisma.terapeuta.findUnique({ where: { idTerapeuta: terapeutaId } });
            if (!terapeuta || !terapeuta.activo) return void res.status(400).json({ error: 'El terapeuta no existe o está inactivo' });
            data.idTerapeuta = terapeutaId;
        }
        if (activo !== undefined) {
            if (typeof activo !== 'boolean') return void res.status(400).json({ error: 'El estado activo debe ser booleano' });
            data.activo = activo;
        }
        if (!Object.keys(data).length) return void res.status(400).json({ error: 'No hay datos para actualizar' });
        const actualizado = await prisma.paciente.update({ where: { idPaciente: id }, data, include: { terapeuta: true } });
        res.json(actualizado);
    } catch (error) {
        console.error('Error al actualizar paciente:', error);
        res.status(500).json({ error: 'Error al actualizar el paciente' });
    }
};

// La baja es lógica para conservar el expediente y su historial de citas.
export const deletePaciente = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        const paciente = await prisma.paciente.findUnique({ where: { idPaciente: id } });
        if (!paciente) return void res.status(404).json({ error: 'No se encontró el paciente' });
        if (!paciente.activo) return void res.status(409).json({ error: 'El paciente ya está inactivo' });
        await prisma.paciente.update({ where: { idPaciente: id }, data: { activo: false } });
        res.json({ mensaje: 'Paciente dado de baja correctamente' });
    } catch (error) {
        console.error('Error al dar de baja paciente:', error);
        res.status(500).json({ error: 'No se pudo dar de baja al paciente' });
    }
};
