import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { isNonEmptyString, isOptionalString, parsePathId } from '../utils/requestValidation';
import { generarNombreUsuarioDisponible } from '../utils/nombreUsuario';

// Iniciar sesión y detectar automáticamente
export const login = async (req: Request, res: Response) => {
    const { nombreUsuario, contrasena } = req.body as Record<string, unknown>;
    if (!isNonEmptyString(nombreUsuario, 50) || !isNonEmptyString(contrasena, 30)) {
        res.status(400).json({ error: 'El usuario y la contraseña deben ser texto válido.' });
        return;
    }
    try {
        const usuario = await prisma.usuario.findFirst({
            where: { nombreUsuario: nombreUsuario.trim().toUpperCase() },
            include: {
                recepcionista: true,
                terapeuta: true
            }
        });
//Valida si los valore ingresados coinciden con la bd
        if (!usuario || usuario.contrasena !== contrasena) {
            res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
            return;
        }
//Si lo son, define el rol de acuerdo a su procedencia
        let rol = 'usuario';
        let perfil: unknown = null;

        if (usuario.recepcionista) {
            rol = 'recepcionista';
            perfil = usuario.recepcionista;
        } else if (usuario.terapeuta) {
            //Validación de iniciar sesión solo con terapeutas activos
            if (usuario.terapeuta.activo === false) {
                res.status(403).json({ error: 'Esta cuenta de terapeuta está dada de baja.' });
                return;
            }
            rol = 'terapeuta';
            perfil = usuario.terapeuta;
        }

        res.json({
            mensaje: 'Inicio de sesión exitoso',
            usuario: {
                idUsuario: usuario.idUsuario,
                nombreUsuario: usuario.nombreUsuario,
                rol,
                perfil
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno al iniciar sesión' });
    }
};

// Obtener todos los usuarios ordenados alfabéticamente por apellidos
export const consultarUsuarios = async (req: Request, res: Response) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            select: {
                idUsuario: true,
                nombreUsuario: true,
                recepcionista: true,
                terapeuta: true
            }
        });
        //Validación usuario activo
        const usuariosActivos = usuarios.filter(
            (u) => !u.terapeuta || u.terapeuta.activo !== false
        );
        usuariosActivos.sort((a, b) => {
            const pA = a.recepcionista || a.terapeuta || { aPaterno: '', aMaterno: '', nombre: '' };
            const pB = b.recepcionista || b.terapeuta || { aPaterno: '', aMaterno: '', nombre: '' };
            return (
                (pA.aPaterno || '').localeCompare(pB.aPaterno || '', 'es') ||
                (pA.aMaterno || '').localeCompare(pB.aMaterno || '', 'es') ||
                (pA.nombre || '').localeCompare(pB.nombre || '', 'es')
            );
        });
        res.json(usuariosActivos);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener la lista de usuarios' });
    }
};

// Registrar un nuevo usuario recibiendo datos del formulario de requistro
export const registrarUsuario = async (req: Request, res: Response) => {
    const {
        contrasena,
        nombreUsuario,
        rol,
        nombre,
        aPaterno,
        aMaterno,
        contactoTelefonico,
        especialidad
    } = req.body as Record<string, unknown>;
    if (
        !isNonEmptyString(rol, 20) ||
        !isNonEmptyString(contrasena, 30) ||
        !isNonEmptyString(nombre, 60) ||
        !isNonEmptyString(aPaterno, 60) ||
        !isNonEmptyString(aMaterno, 60) ||
        typeof contactoTelefonico !== 'string' ||
        !isOptionalString(especialidad, 30) ||
        (nombreUsuario !== undefined && !isNonEmptyString(nombreUsuario, 50))
    ) {
        res.status(400).json({ error: 'Los nombres, rol, contraseña y teléfono deben tener tipos y longitudes válidos.' });
        return;
    }

    const telefono = contactoTelefonico.replace(/\D/g, '');
    const rolNormalizado = rol.trim().toLowerCase();
    if (
        (rolNormalizado !== 'recepcionista' && rolNormalizado !== 'terapeuta') ||
        !nombre.trim() ||
        !aPaterno.trim() ||
        !aMaterno.trim() ||
        !/^\d{10}$/.test(telefono)
    ) {
        res.status(400).json({ error: 'Completa todos los campos obligatorios y verifica que el teléfono tenga 10 dígitos.' });
        return;
    }
    let especialidadNormalizada = '';
    if (rolNormalizado === 'terapeuta') {
        if (!isNonEmptyString(especialidad, 30)) {
            res.status(400).json({ error: 'La especialidad es obligatoria para el rol de terapeuta.' });
            return;
        }
        especialidadNormalizada = especialidad.trim().toUpperCase();
    } else if (especialidad !== undefined && typeof especialidad !== 'string') {
        res.status(400).json({ error: 'La especialidad debe ser texto.' });
        return;
    }

    const rolMayus = rolNormalizado.toUpperCase();
    const primerNombreMayus = nombre.trim().split(/\s+/)[0].toUpperCase();
    const nombreUsuarioBase = `${rolMayus} ${primerNombreMayus}`;

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const nombreUsuarioFinal = typeof nombreUsuario === 'string'
                ? nombreUsuario.trim().toUpperCase()
                : await generarNombreUsuarioDisponible(
                    nombreUsuarioBase,
                    async (nombre) =>
                        (await tx.usuario.findFirst({ where: { nombreUsuario: nombre } })) !== null
                );
            const usuarioExistente = await tx.usuario.findFirst({
                where: { nombreUsuario: nombreUsuarioFinal }
            });
            if (usuarioExistente) throw new Error('NOMBRE_USUARIO_DUPLICADO');

            const nuevoUsuario = await tx.usuario.create({
                data: {
                    nombreUsuario: nombreUsuarioFinal,
                    contrasena: contrasena.trim()
                }
            });

            let perfilCreado: unknown = null;
//Transacción para crear usuario y validaciones de datos
            if (rolNormalizado === 'recepcionista') {
                perfilCreado = await tx.recepcionista.create({
                    data: {
                        nombre: nombre.trim().toUpperCase(),
                        aPaterno: aPaterno.trim().toUpperCase(),
                        aMaterno: aMaterno.trim().toUpperCase(),
                        contactoTelefonico: telefono,
                        idUsuario: nuevoUsuario.idUsuario
                    }
                });
            } else if (rolNormalizado === 'terapeuta') {
                perfilCreado = await tx.terapeuta.create({
                    data: {
                        nombre: nombre.trim().toUpperCase(),
                        aPaterno: aPaterno.trim().toUpperCase(),
                        aMaterno: aMaterno.trim().toUpperCase(),
                        contactoTelefonico: telefono,
                        especialidad: especialidadNormalizada,
                        idUsuario: nuevoUsuario.idUsuario
                    }
                });
            }

            return {
                idUsuario: nuevoUsuario.idUsuario,
                nombreUsuario: nuevoUsuario.nombreUsuario,
                rol: rolNormalizado,
                perfil: perfilCreado
            };
        });

        res.status(201).json(resultado);
    } catch (error) {
        if (error instanceof Error && error.message === 'NOMBRE_USUARIO_DUPLICADO') {
            res.status(409).json({ error: 'Ese nombre de usuario ya está registrado. Elige otro.' });
            return;
        }
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ error: 'Error al registrar el usuario en la base de datos' });
    }
};

// Actualizar datos de un usuario
export const actualizarUsuario = async (req: Request, res: Response) => {
    const id = parsePathId(req.params.id);
    if (id === null) {
        res.status(400).json({ error: 'Identificador de usuario inválido.' });
        return;
    }
    const { nombreUsuario, contrasena } = req.body as Record<string, unknown>;
    if (
        (nombreUsuario !== undefined && !isNonEmptyString(nombreUsuario, 50)) ||
        (contrasena !== undefined && !isNonEmptyString(contrasena, 30)) ||
        (nombreUsuario === undefined && contrasena === undefined)
    ) {
        res.status(400).json({ error: 'El nombre de usuario y la contraseña deben ser texto válido; envía al menos un campo.' });
        return;
    }
    try {
        const usuarioActualizado = await prisma.usuario.update({
            where: { idUsuario: id },
            data: {
                ...(nombreUsuario !== undefined && { nombreUsuario: nombreUsuario.trim().toUpperCase() }),
                ...(contrasena !== undefined && { contrasena: contrasena.trim() })
            },
            select: {
                idUsuario: true,
                nombreUsuario: true
            }
        });
        res.json(usuarioActualizado);
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error) {
            if (error.code === 'P2025') {
                res.status(404).json({ error: 'No se encontró el usuario.' });
                return;
            }
            if (error.code === 'P2002') {
                res.status(409).json({ error: 'El nombre de usuario ya está en uso.' });
                return;
            }
        }
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
};

// Eliminar un usuario
export const eliminarUsuario = async (req: Request, res: Response) => {
    const id = parsePathId(req.params.id);
    if (id === null) {
        res.status(400).json({ error: 'Identificador de usuario inválido.' });
        return;
    }

    try {
        await prisma.usuario.delete({
            where: { idUsuario: id }
        });
        res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
            res.status(404).json({ error: 'No se encontró el usuario.' });
            return;
        }
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ error: 'No se pudo eliminar el usuario' });
    }
};