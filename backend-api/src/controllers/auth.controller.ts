import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Iniciar sesión y detectar automáticamente el rol del usuario
export const login = async (req: Request, res: Response) => {
    const { nombreUsuario, contrasena } = req.body;

    if (!nombreUsuario || !contrasena) {
        res.status(400).json({ error: 'Debes ingresar usuario y contraseña' });
        return;
    }

    try {
        const usuario = await prisma.usuario.findFirst({
            where: { nombreUsuario },
            include: {
                recepcionista: true,
                terapeuta: true
            }
        });

        if (!usuario || usuario.contrasena !== contrasena) {
            res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
            return;
        }

        // Determina el rol según la tabla con la que esté vinculado el usuario
        let rol = 'usuario';
        let perfil: unknown = null;

        if (usuario.recepcionista.length > 0) {
            rol = 'recepcionista';
            perfil = usuario.recepcionista[0];
        } else if (usuario.terapeuta.length > 0) {
            rol = 'terapeuta';
            perfil = usuario.terapeuta[0];
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

// Obtener todos los usuarios (sin exponer contraseñas)
export const getUsuarios = async (req: Request, res: Response) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            select: {
                idUsuario: true,
                nombreUsuario: true,
                recepcionista: true,
                terapeuta: true
            }
        });
        res.json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener la lista de usuarios' });
    }
};

// Registrar un nuevo usuario junto con su perfil (recepcionista o terapeuta)
export const registrarUsuario = async (req: Request, res: Response) => {
    const {
        nombreUsuario,
        contrasena,
        rol,
        nombreCompleto,
        contactoTelefonico,
        especialidad
    } = req.body;

    if (!nombreUsuario?.trim() || !contrasena?.trim() || !nombreCompleto?.trim()) {
        res.status(400).json({ error: 'Debes completar nombre completo, usuario y contraseña' });
        return;
    }

    try {
        const usuarioExistente = await prisma.usuario.findFirst({
            where: { nombreUsuario: String(nombreUsuario).trim() }
        });

        if (usuarioExistente) {
            res.status(409).json({ error: 'Ese nombre de usuario ya está en uso, elige otro' });
            return;
        }

        const resultado = await prisma.$transaction(async (tx) => {
            const nuevoUsuario = await tx.usuario.create({
                data: {
                    nombreUsuario: String(nombreUsuario).trim().slice(0, 20),
                    contrasena: String(contrasena).slice(0, 30)
                }
            });

            let perfilCreado: unknown = null;

            if (rol === 'recepcionista') {
                perfilCreado = await tx.recepcionista.create({
                    data: {
                        nombreCompleto: String(nombreCompleto).trim().slice(0, 60).toUpperCase(),
                        contactoTelefonico: String(contactoTelefonico || '').slice(0, 10),
                        idUsuario: nuevoUsuario.idUsuario
                    }
                });
            } else if (rol === 'terapeuta') {
                perfilCreado = await tx.terapeuta.create({
                    data: {
                        nombreCompleto: String(nombreCompleto).trim().toUpperCase(),
                        contactoTelefonico: String(contactoTelefonico || '').slice(0, 10),
                        especialidad: String(especialidad || 'General').slice(0, 30),
                        idUsuario: nuevoUsuario.idUsuario
                    }
                });
            }

            return {
                idUsuario: nuevoUsuario.idUsuario,
                nombreUsuario: nuevoUsuario.nombreUsuario,
                rol: rol || 'usuario',
                perfil: perfilCreado
            };
        });

        res.status(201).json(resultado);
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ error: 'Error al registrar el usuario en la base de datos' });
    }
};

// Actualizar credenciales de un usuario
export const updateUsuario = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { nombreUsuario, contrasena } = req.body;

    try {
        const usuarioActualizado = await prisma.usuario.update({
            where: { idUsuario: id },
            data: {
                ...(nombreUsuario !== undefined && { nombreUsuario: String(nombreUsuario).slice(0, 20) }),
                ...(contrasena !== undefined && { contrasena: String(contrasena).slice(0, 30) })
            },
            select: {
                idUsuario: true,
                nombreUsuario: true
            }
        });
        res.json(usuarioActualizado);
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
};

// Eliminar un usuario
export const deleteUsuario = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.usuario.delete({
            where: { idUsuario: id }
        });
        res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ error: 'No se pudo eliminar el usuario (verifica si tiene un perfil de terapeuta o recepcionista vinculado)' });
    }
};