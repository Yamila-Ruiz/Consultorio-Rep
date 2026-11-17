import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField
} from '@mui/material';
import { IconArrowLeft, IconEdit, IconPlus, IconSearch } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const estadoInicial = {
    nombre: '',
    aPaterno: '',
    aMaterno: '',
    edad: '',
    contactoTelefonico: '',
    nombreFacturacion: '',
    correoFacturacion: '',
    idTerapeuta: ''
};

export default function Pacientes() {
    const navigate = useNavigate();
    const [pacientes, setPacientes] = useState([]);
    const [terapeutas, setTerapeutas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    const [openModal, setOpenModal] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(estadoInicial);

    const cargarDatos = async () => {
        try {
            const [resPac, resTer] = await Promise.all([
                fetch(`${API_URL}/pacientes`),
                fetch(`${API_URL}/terapeutas`)
            ]);
            if (resPac.ok) setPacientes(await resPac.json());
            if (resTer.ok) setTerapeutas(await resTer.json());
        } catch (error) {
            console.error('Error al cargar pacientes:', error);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const abrirNuevo = () => {
        setEditandoId(null);
        setForm(estadoInicial);
        setOpenModal(true);
    };

    const abrirEditar = (paciente) => {
        setEditandoId(paciente.idPaciente);
        setForm({
            nombre: paciente.nombre,
            aPaterno: paciente.aPaterno,
            aMaterno: paciente.aMaterno,
            edad: paciente.edad,
            contactoTelefonico: paciente.contactoTelefonico,
            nombreFacturacion: paciente.nombreFacturacion,
            correoFacturacion: paciente.correoFacturacion,
            idTerapeuta: paciente.idTerapeuta
        });
        setOpenModal(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        setMensaje({ tipo: '', texto: '' });

        const url = editandoId ? `${API_URL}/pacientes/${editandoId}` : `${API_URL}/pacientes`;
        const method = editandoId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();

            if (!res.ok) {
                setMensaje({ tipo: 'error', texto: data.error || 'Error al guardar el paciente' });
                return;
            }

            setMensaje({
                tipo: 'success',
                texto: editandoId ? 'Datos del paciente actualizados' : 'Paciente registrado correctamente'
            });
            setOpenModal(false);
            cargarDatos();
        } catch {
            setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor' });
        }
    };

    const pacientesFiltrados = pacientes.filter((p) => {
        const texto = `${p.codigo} ${p.nombre} ${p.aPaterno} ${p.aMaterno} ${p.contactoTelefonico}`.toLowerCase();
        return texto.includes(busqueda.toLowerCase());
    });

    return (
        <MainCard
            title="Catálogo de Pacientes"
            secondary={
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={abrirNuevo}>
                        Nuevo Paciente
                    </Button>
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
            {mensaje.texto && (
                <Alert severity={mensaje.tipo} sx={{ mb: 2 }} onClose={() => setMensaje({ tipo: '', texto: '' })}>
                    {mensaje.texto}
                </Alert>
            )}

            <TextField
                fullWidth
                size="small"
                placeholder="Buscar paciente por nombre, apellidos, código o teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <IconSearch size={18} />
                        </InputAdornment>
                    )
                }}
            />

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Código</strong></TableCell>
                            <TableCell><strong>Paciente</strong></TableCell>
                            <TableCell><strong>Edad</strong></TableCell>
                            <TableCell><strong>Teléfono</strong></TableCell>
                            <TableCell><strong>Terapeuta Asignado</strong></TableCell>
                            <TableCell align="right"><strong>Editar</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pacientesFiltrados.map((p) => (
                            <TableRow key={p.idPaciente}>
                                <TableCell>{p.codigo}</TableCell>
                                <TableCell>{`${p.nombre} ${p.aPaterno} ${p.aMaterno}`}</TableCell>
                                <TableCell>{p.edad} años</TableCell>
                                <TableCell>{p.contactoTelefonico}</TableCell>
                                <TableCell>{p.terapeuta?.nombreCompleto || 'Sin asignar'}</TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" color="primary" onClick={() => abrirEditar(p)}>
                                        <IconEdit size={18} />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {pacientesFiltrados.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    No se encontraron pacientes.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
                <Box component="form" onSubmit={handleGuardar}>
                    <DialogTitle>{editandoId ? 'Actualizar Datos del Paciente' : 'Registrar Nuevo Paciente'}</DialogTitle>
                    <DialogContent dividers>
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Nombre(s)"
                                    inputProps={{ maxLength: 30 }}
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Apellido Paterno"
                                    inputProps={{ maxLength: 30 }}
                                    value={form.aPaterno}
                                    onChange={(e) => setForm({ ...form, aPaterno: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Apellido Materno"
                                    inputProps={{ maxLength: 30 }}
                                    value={form.aMaterno}
                                    onChange={(e) => setForm({ ...form, aMaterno: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    type="number"
                                    label="Edad"
                                    inputProps={{ min: 1, max: 120 }}
                                    value={form.edad}
                                    onChange={(e) => setForm({ ...form, edad: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Teléfono (10 dígitos)"
                                    inputProps={{ maxLength: 10 }}
                                    value={form.contactoTelefonico}
                                    onChange={(e) => setForm({ ...form, contactoTelefonico: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    select
                                    fullWidth
                                    required
                                    label="Terapeuta Asignado"
                                    value={form.idTerapeuta}
                                    onChange={(e) => setForm({ ...form, idTerapeuta: e.target.value })}
                                >
                                    {terapeutas.map((t) => (
                                        <MenuItem key={t.idTerapeuta} value={t.idTerapeuta}>
                                            {t.nombreCompleto} — {t.especialidad}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Nombre de Facturación"
                                    inputProps={{ maxLength: 50 }}
                                    value={form.nombreFacturacion}
                                    onChange={(e) => setForm({ ...form, nombreFacturacion: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="email"
                                    label="Correo de Facturación"
                                    inputProps={{ maxLength: 60 }}
                                    value={form.correoFacturacion}
                                    onChange={(e) => setForm({ ...form, correoFacturacion: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
                        <Button type="submit" variant="contained">
                            {editandoId ? 'Actualizar' : 'Registrar'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </MainCard>
    );
}