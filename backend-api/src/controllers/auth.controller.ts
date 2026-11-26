import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Iniciar sesión y detectar automáticamente
export const login = async (req: Request, res: Response) => {
    const { nombreUsuario, contrasena } = req.body;
//Valida que se hayan ingresado nombre de usuario y contraseña
    if (!nombreUsuario || !contrasena) {
        res.status(400).json({ error: 'Debe ingresar usuario y contraseña' });
        return;
    }
//Bloque try-cathc para manejo de interrupciones y busca el usuario con el metodo de prisma .findFirst dentro de terapeuta y recepcionista
    try {
        const usuario = await prisma.usuario.findFirst({
            where: { nombreUsuario: String(nombreUsuario).trim().toUpperCase() },
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
        rol,
        nombre,
        aPaterno,
        aMaterno,
        contactoTelefonico,
        especialidad
    } = req.body;
    //Formatear valores de teléfono y rol
    const telefono = String(contactoTelefonico || '').replace(/\D/g, '');
    const rolNormalizado = String(rol || '').trim().toLowerCase();
//Validación de que el formulario tiene los datos completos
    if (
        (rolNormalizado !== 'recepcionista' && rolNormalizado !== 'terapeuta') ||
        !contrasena?.trim() ||
        !nombre?.trim() ||
        !aPaterno?.trim() ||
        !aMaterno?.trim() ||
        !/^\d{10}$/.test(telefono)
    ) {
        res.status(400).json({ error: 'Completa todos los campos obligatorios y verifica que el teléfono tenga 10 dígitos.' });
        return;
    }
//Verifica que exista especialidad, siguiendo la lógica de Registrar terapeuta
    if (rolNormalizado === 'terapeuta' && !especialidad?.trim()) {
        res.status(400).json({ error: 'La especialidad es obligatoria para el rol de terapeuta.' });
        return;
    }
//Generar el usuario que se muestra con rol y nombre diviendolo, se muestra en mayúsculas
    const rolMayus = rolNormalizado.toUpperCase();
    const primerNombreMayus = nombre.trim().split(/\s+/)[0].toUpperCase();
    const nombreUsuarioGenerado = `${rolMayus} ${primerNombreMayus}`;

    try {
        //Validación de nombre de usuario
        const usuarioExistente = await prisma.usuario.findFirst({
            where: { nombreUsuario: nombreUsuarioGenerado }
        });

        if (usuarioExistente) {
            res.status(409).json({
                error: `El usuario "${nombreUsuarioGenerado}" ya existe.`
            });
            return;
        }

        const resultado = await prisma.$transaction(async (tx) => {
            const nuevoUsuario = await tx.usuario.create({
                data: {
                    nombreUsuario: nombreUsuarioGenerado,
                    contrasena: String(contrasena).trim().slice(0, 30)
                }
            });

            let perfilCreado: unknown = null;
//Transacción para crear usuario y validaciones de datos
            if (rolNormalizado === 'recepcionista') {
                perfilCreado = await tx.recepcionista.create({
                    data: {
                        nombre: String(nombre).trim().slice(0, 60).toUpperCase(),
                        aPaterno: String(aPaterno).trim().slice(0, 60).toUpperCase(),
                        aMaterno: String(aMaterno).trim().slice(0, 60).toUpperCase(),
                        contactoTelefonico: telefono,
                        idUsuario: nuevoUsuario.idUsuario
                    }
                });
            } else if (rolNormalizado === 'terapeuta') {
                perfilCreado = await tx.terapeuta.create({
                    data: {
                        nombre: String(nombre).trim().slice(0, 60).toUpperCase(),
                        aPaterno: String(aPaterno).trim().slice(0, 60).toUpperCase(),
                        aMaterno: String(aMaterno).trim().slice(0, 60).toUpperCase(),
                        contactoTelefonico: telefono,
                        especialidad: String(especialidad).trim().slice(0, 30).toUpperCase(),
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
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ error: 'Error al registrar el usuario en la base de datos' });
    }
};

// Actualizar datos de un usuario
export const actualizarUsuario = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { nombreUsuario, contrasena } = req.body;
//Validaciones longitud y datos válidos
    try {
        const usuarioActualizado = await prisma.usuario.update({
            where: { idUsuario: id },
            data: {
                //Si se deja un campo vacío se deja guardado el valor anterior
                ...(nombreUsuario !== undefined && { nombreUsuario: String(nombreUsuario).trim().toUpperCase().slice(0, 50) }),
                ...(contrasena !== undefined && { contrasena: String(contrasena).trim().slice(0, 30) })
            },
            //Validación de los datos que se mostrarán
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
export const eliminarUsuario = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        await prisma.usuario.delete({
            where: { idUsuario: id }
        });
        res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ error: 'No se pudo eliminar el usuario' });
    }
};