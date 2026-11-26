import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { isNonEmptyString, isNonNegativeInteger, isPositiveInteger, parsePathId } from '../utils/requestValidation';

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
    const { nombre, aPaterno, aMaterno, edad, contactoTelefonico, fechaRegistro, idTerapeuta, activo } =
        req.body as Record<string, unknown>;
    if (
        !isNonEmptyString(nombre, 30) ||
        !isNonEmptyString(aPaterno, 30) ||
        !isNonEmptyString(aMaterno, 30)
    ) return void res.status(400).json({ error: 'Nombre y apellidos deben ser texto y no superar 30 caracteres' });
    const nombreLimpio = nombre.trim().toUpperCase();
    const paterno = aPaterno.trim().toUpperCase();
    const materno = aMaterno.trim().toUpperCase();
    if (!isNonNegativeInteger(edad) || edad > 17) return void res.status(400).json({ error: 'La edad debe ser un entero entre 0 y 17 años' });
    if (typeof contactoTelefonico !== 'string') return void res.status(400).json({ error: 'El teléfono debe enviarse como texto de 10 dígitos' });
    const telefono = contactoTelefonico.replace(/\D/g, '');
    if (!/^\d{10}$/.test(telefono)) return void res.status(400).json({ error: 'El teléfono debe contener 10 dígitos' });
    if (!isPositiveInteger(idTerapeuta)) return void res.status(400).json({ error: 'Selecciona un terapeuta válido' });
    if (activo !== undefined && typeof activo !== 'boolean') return void res.status(400).json({ error: 'El estado activo debe ser booleano' });
    const terapeutaId = idTerapeuta;
    const fecha = fechaRegistro === undefined || fechaRegistro === '' ? fechaLocalHoy() : validarFecha(fechaRegistro);
    if (!fecha) return void res.status(400).json({ error: 'La fecha de registro debe tener formato AAAA-MM-DD y ser válida' });
    try {
        const terapeuta = await prisma.terapeuta.findUnique({ where: { idTerapeuta: terapeutaId } });
        if (!terapeuta || !terapeuta.activo) return void res.status(400).json({ error: 'El terapeuta no existe o está inactivo' });
        const paciente = await prisma.paciente.create({
            data: { nombre: nombreLimpio, aPaterno: paterno, aMaterno: materno, edad, contactoTelefonico: telefono, fechaRegistro: fecha, idTerapeuta: terapeutaId, activo: true },
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
    const id = parsePathId(req.params.id);
    if (id === null) return void res.status(400).json({ error: 'Identificador de paciente inválido' });
    const { nombre, aPaterno, aMaterno, edad, contactoTelefonico, fechaRegistro, idTerapeuta, activo } =
        req.body as Record<string, unknown>;
    try {
        const actual = await prisma.paciente.findUnique({ where: { idPaciente: id } });
        if (!actual) return void res.status(404).json({ error: 'No se encontró el paciente' });
        const data: any = {};
        for (const [campo, valor] of [['nombre', nombre], ['aPaterno', aPaterno], ['aMaterno', aMaterno]] as const) {
            if (valor !== undefined) {
                if (!isNonEmptyString(valor, 30)) return void res.status(400).json({ error: `${campo} debe ser texto y no superar 30 caracteres` });
                data[campo] = valor.trim().toUpperCase();
            }
        }
        if (edad !== undefined) {
            if (!isNonNegativeInteger(edad) || edad > 17) return void res.status(400).json({ error: 'La edad debe ser un entero entre 0 y 17 años' });
            data.edad = edad;
        }
        if (contactoTelefonico !== undefined) {
            if (typeof contactoTelefonico !== 'string') return void res.status(400).json({ error: 'El teléfono debe enviarse como texto de 10 dígitos' });
            const tel = contactoTelefonico.replace(/\D/g, '');
            if (!/^\d{10}$/.test(tel)) return void res.status(400).json({ error: 'El teléfono debe contener 10 dígitos' });
            data.contactoTelefonico = tel;
        }
        if (fechaRegistro !== undefined) {
            const fecha = validarFecha(fechaRegistro);
            if (!fecha) return void res.status(400).json({ error: 'La fecha de registro no es válida' });
            data.fechaRegistro = fecha;
        }
        if (idTerapeuta !== undefined) {
            if (!isPositiveInteger(idTerapeuta)) return void res.status(400).json({ error: 'Terapeuta inválido' });
            const terapeutaId = idTerapeuta;
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
    const id = parsePathId(req.params.id);
    if (id === null) return void res.status(400).json({ error: 'Identificador de paciente inválido' });
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
