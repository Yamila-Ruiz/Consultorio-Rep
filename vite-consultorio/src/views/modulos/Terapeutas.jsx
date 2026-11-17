import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import { IconArrowLeft, IconClock, IconEdit, IconUserPlus } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Terapeutas() {
    const navigate = useNavigate();
    const usuarioActual = JSON.parse(localStorage.getItem('usuario') || 'null');
    const esRecepcionista = usuarioActual?.rol === 'recepcionista';

    const [terapeutas, setTerapeutas] = useState([]);
    const [slots, setSlots] = useState([]);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    // Modal Registro de Usuario (Terapeuta / Recepcionista)
    const [openRegistro, setOpenRegistro] = useState(false);
    const [formUsuario, setFormUsuario] = useState({
        rol: 'terapeuta',
        nombreCompleto: '',
        contactoTelefonico: '',
        especialidad: '',
        nombreUsuario: '',
        contrasena: ''
    });

    // Modal Editar Terapeuta
    const [openEditar, setOpenEditar] = useState(false);
    const [terapeutaEdit, setTerapeutaEdit] = useState(null);

    // Modal Agregar Horario Disponible
    const [openSlot, setOpenSlot] = useState(false);
    const [formSlot, setFormSlot] = useState({
        idTerapeuta: '',
        fecha: new Date().toISOString().split('T')[0],
        inicio: '09:00',
        fin: '10:00'
    });

    const cargarDatos = async () => {
        try {
            const [resTer, resSlots] = await Promise.all([
                fetch(`${API_URL}/terapeutas`),
                fetch(`${API_URL}/slots`)
            ]);
            if (resTer.ok) setTerapeutas(await resTer.json());
            if (resSlots.ok) setSlots(await resSlots.json());
        } catch (error) {
            console.error('Error al cargar terapeutas:', error);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handleRegistrarUsuario = async (e) => {
        e.preventDefault();
        setMensaje({ tipo: '', texto: '' });

        try {
            const res = await fetch(`${API_URL}/auth/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formUsuario)
            });
            const data = await res.json();

            if (!res.ok) {
                setMensaje({ tipo: 'error', texto: data.error || 'Error al registrar usuario' });
                return;
            }

            setMensaje({ tipo: 'success', texto: 'Usuario y perfil registrados correctamente' });
            setOpenRegistro(false);
            setFormUsuario({
                rol: 'terapeuta',
                nombreCompleto: '',
                contactoTelefonico: '',
                especialidad: '',
                nombreUsuario: '',
                contrasena: ''
            });
            cargarDatos();
        } catch {
            setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor' });
        }
    };

    const handleActualizarTerapeuta = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/terapeutas/${terapeutaEdit.idTerapeuta}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombreCompleto: terapeutaEdit.nombreCompleto,
                    contactoTelefonico: terapeutaEdit.contactoTelefonico,
                    especialidad: terapeutaEdit.especialidad
                })
            });
            if (res.ok) {
                setMensaje({ tipo: 'success', texto: 'Datos del terapeuta actualizados' });
                setOpenEditar(false);
                cargarDatos();
            }
        } catch {
            setMensaje({ tipo: 'error', texto: 'No se pudo actualizar el terapeuta' });
        }
    };

    const handleCrearSlot = async (e) => {
        e.preventDefault();
        setMensaje({ tipo: '', texto: '' });

        try {
            const res = await fetch(`${API_URL}/slots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formSlot)
            });
            const data = await res.json();

            if (!res.ok) {
                setMensaje({ tipo: 'error', texto: data.error || 'No se pudo registrar el horario' });
                return;
            }

            setMensaje({ tipo: 'success', texto: 'Horario disponible agregado correctamente' });
            setOpenSlot(false);
            cargarDatos();
        } catch {
            setMensaje({ tipo: 'error', texto: 'Error de conexión al registrar horario' });
        }
    };

    return (
        <MainCard
            title="Terapeutas y Disponibilidad"
            secondary={
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<IconClock size={18} />}
                        onClick={() => setOpenSlot(true)}
                    >
                        Agregar Horario
                    </Button>
                    {esRecepcionista && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<IconUserPlus size={18} />}
                            onClick={() => setOpenRegistro(true)}
                        >
                            Registrar Usuario
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<IconArrowLeft size={16} />}
                        onClick={() => navigate('/')}
                    >
                        Inicio
                    </Button>
                </Stack>
            }
        >
            {!esRecepcionista && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Inicia sesión con una cuenta vinculada como <strong>Recepcionista</strong> para habilitar el alta de nuevos usuarios.
                </Alert>
            )}

            {mensaje.texto && (
                <Alert severity={mensaje.tipo} sx={{ mb: 2 }} onClose={() => setMensaje({ tipo: '', texto: '' })}>
                    {mensaje.texto}
                </Alert>
            )}

            <Typography variant="h4" sx={{ mb: 2 }}>
                Catálogo de Terapeutas
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Código</strong></TableCell>
                            <TableCell><strong>Nombre Completo</strong></TableCell>
                            <TableCell><strong>Especialidad</strong></TableCell>
                            <TableCell><strong>Teléfono</strong></TableCell>
                            <TableCell><strong>Usuario</strong></TableCell>
                            <TableCell align="right"><strong>Acciones</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {terapeutas.map((t) => (
                            <TableRow key={t.idTerapeuta}>
                                <TableCell>{t.codigo}</TableCell>
                                <TableCell>{t.nombreCompleto}</TableCell>
                                <TableCell>{t.especialidad}</TableCell>
                                <TableCell>{t.contactoTelefonico}</TableCell>
                                <TableCell>{t.usuario?.nombreUsuario || '—'}</TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => {
                                            setTerapeutaEdit(t);
                                            setOpenEditar(true);
                                        }}
                                    >
                                        <IconEdit size={18} />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {terapeutas.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    No hay terapeutas registrados aún.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h4" sx={{ mb: 2 }}>
                Horarios de Disponibilidad Registrados
            </Typography>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Terapeuta</strong></TableCell>
                            <TableCell><strong>Fecha</strong></TableCell>
                            <TableCell><strong>Inicio</strong></TableCell>
                            <TableCell><strong>Fin</strong></TableCell>
                            <TableCell><strong>Estado</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {slots.map((s) => (
                            <TableRow key={s.idSlot}>
                                <TableCell>{s.terapeuta?.nombreCompleto}</TableCell>
                                <TableCell>{s.fecha?.split('T')[0]}</TableCell>
                                <TableCell>{s.inicio?.split('T')[1]?.slice(0, 5)}</TableCell>
                                <TableCell>{s.fin?.split('T')[1]?.slice(0, 5)}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={s.estado === 1 ? 'Disponible' : 'Ocupado'}
                                        color={s.estado === 1 ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                        {slots.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No hay horarios registrados. Usa &quot;Agregar Horario&quot; para habilitar bloques de citas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Modal: Registrar Nuevo Usuario (Solo Recepcionista) */}
            <Dialog open={openRegistro} onClose={() => setOpenRegistro(false)} maxWidth="sm" fullWidth>
                <Box component="form" onSubmit={handleRegistrarUsuario}>
                    <DialogTitle>Registrar Nuevo Usuario del Sistema</DialogTitle>
                    <DialogContent dividers>
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            <Grid item xs={12}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Rol del Usuario"
                                    value={formUsuario.rol}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value })}
                                >
                                    <MenuItem value="terapeuta">Terapeuta</MenuItem>
                                    <MenuItem value="recepcionista">Recepcionista</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Nombre Completo"
                                    value={formUsuario.nombreCompleto}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, nombreCompleto: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Teléfono (10 dígitos)"
                                    inputProps={{ maxLength: 10 }}
                                    value={formUsuario.contactoTelefonico}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, contactoTelefonico: e.target.value })}
                                />
                            </Grid>
                            {formUsuario.rol === 'terapeuta' && (
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        required
                                        label="Especialidad"
                                        inputProps={{ maxLength: 30 }}
                                        value={formUsuario.especialidad}
                                        onChange={(e) => setFormUsuario({ ...formUsuario, especialidad: e.target.value })}
                                    />
                                </Grid>
                            )}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Nombre de Usuario (Login)"
                                    inputProps={{ maxLength: 20 }}
                                    value={formUsuario.nombreUsuario}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, nombreUsuario: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    type="password"
                                    label="Contraseña"
                                    inputProps={{ maxLength: 30 }}
                                    value={formUsuario.contrasena}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, contrasena: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenRegistro(false)}>Cancelar</Button>
                        <Button type="submit" variant="contained">
                            Guardar Usuario
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Modal: Editar Terapeuta */}
            <Dialog open={openEditar} onClose={() => setOpenEditar(false)} maxWidth="sm" fullWidth>
                {terapeutaEdit && (
                    <Box component="form" onSubmit={handleActualizarTerapeuta}>
                        <DialogTitle>Actualizar Terapeuta</DialogTitle>
                        <DialogContent dividers>
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Nombre Completo"
                                    value={terapeutaEdit.nombreCompleto}
                                    onChange={(e) => setTerapeutaEdit({ ...terapeutaEdit, nombreCompleto: e.target.value })}
                                />
                                <TextField
                                    fullWidth
                                    required
                                    label="Especialidad"
                                    inputProps={{ maxLength: 30 }}
                                    value={terapeutaEdit.especialidad}
                                    onChange={(e) => setTerapeutaEdit({ ...terapeutaEdit, especialidad: e.target.value })}
                                />
                                <TextField
                                    fullWidth
                                    required
                                    label="Teléfono"
                                    inputProps={{ maxLength: 10 }}
                                    value={terapeutaEdit.contactoTelefonico}
                                    onChange={(e) => setTerapeutaEdit({ ...terapeutaEdit, contactoTelefonico: e.target.value })}
                                />
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenEditar(false)}>Cancelar</Button>
                            <Button type="submit" variant="contained">
                                Actualizar
                            </Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>

            {/* Modal: Agregar Horario Disponible */}
            <Dialog open={openSlot} onClose={() => setOpenSlot(false)} maxWidth="xs" fullWidth>
                <Box component="form" onSubmit={handleCrearSlot}>
                    <DialogTitle>Agregar Horario Disponible</DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField
                                select
                                fullWidth
                                required
                                label="Terapeuta"
                                value={formSlot.idTerapeuta}
                                onChange={(e) => setFormSlot({ ...formSlot, idTerapeuta: e.target.value })}
                            >
                                {terapeutas.map((t) => (
                                    <MenuItem key={t.idTerapeuta} value={t.idTerapeuta}>
                                        {t.nombreCompleto} ({t.especialidad})
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                fullWidth
                                required
                                type="date"
                                label="Fecha"
                                InputLabelProps={{ shrink: true }}
                                value={formSlot.fecha}
                                onChange={(e) => setFormSlot({ ...formSlot, fecha: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                required
                                type="time"
                                label="Hora de Inicio"
                                InputLabelProps={{ shrink: true }}
                                value={formSlot.inicio}
                                onChange={(e) => setFormSlot({ ...formSlot, inicio: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                required
                                type="time"
                                label="Hora de Fin"
                                InputLabelProps={{ shrink: true }}
                                value={formSlot.fin}
                                onChange={(e) => setFormSlot({ ...formSlot, fin: e.target.value })}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenSlot(false)}>Cancelar</Button>
                        <Button type="submit" variant="contained">
                            Guardar Horario
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </MainCard>
    );
}