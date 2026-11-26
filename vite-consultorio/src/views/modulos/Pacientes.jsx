import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { IconArrowLeft, IconCheck, IconEdit, IconPlus, IconRefresh, IconSearch, IconTrash, IconX } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const obtenerFechaLocalISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Muestra primero Nombre(s), luego Apellido Paterno y Apellido Materno
const formatearNombre = (persona) => {
  if (!persona) return 'SIN ASIGNAR';
  return `${persona.nombre || ''} ${persona.aPaterno || ''} ${persona.aMaterno || ''}`.trim().toUpperCase();
};

// Ordena alfabéticamente por Apellido Paterno, Apellido Materno y Nombre
const ordenarPorApellidos = (lista) =>
  [...lista].sort(
    (a, b) =>
      (a.aPaterno || '').localeCompare(b.aPaterno || '', 'es') ||
      (a.aMaterno || '').localeCompare(b.aMaterno || '', 'es') ||
      (a.nombre || '').localeCompare(b.nombre || '', 'es')
  );

const formatearTelefono = (valor) => {
  const digitos = String(valor || '')
    .replace(/\D/g, '')
    .slice(0, 10);
  if (digitos.length < 3) return digitos;
  if (digitos.length === 3) {
    return String(valor || '').endsWith(')') ? `(${digitos})` : digitos;
  }
  if (digitos.length <= 6) {
    return `(${digitos.slice(0, 3)})${digitos.slice(3)}`;
  }
  return `(${digitos.slice(0, 3)})${digitos.slice(3, 6)}-${digitos.slice(6, 10)}`;
};

const estadoInicial = {
  nombre: '',
  aPaterno: '',
  aMaterno: '',
  edad: '',
  contactoTelefonico: '',
  fechaRegistro: obtenerFechaLocalISO(),
  idTerapeuta: '',
  activo: true
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
      const [resPac, resTer] = await Promise.all([fetch(`${API_URL}/pacientes`), fetch(`${API_URL}/terapeutas`)]);
      if (resPac.ok) {
        const dataPac = await resPac.json();
        setPacientes(ordenarPorApellidos(dataPac));
      }
      if (resTer.ok) {
        const dataTer = await resTer.json();
        setTerapeutas(ordenarPorApellidos(dataTer));
      }
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
      nombre: (paciente.nombre || '').toUpperCase(),
      aPaterno: (paciente.aPaterno || '').toUpperCase(),
      aMaterno: (paciente.aMaterno || '').toUpperCase(),
      edad: paciente.edad,
      contactoTelefonico: formatearTelefono(paciente.contactoTelefonico),
      fechaRegistro: String(paciente.fechaRegistro || obtenerFechaLocalISO()).slice(0, 10),
      idTerapeuta: paciente.idTerapeuta,
      activo: Boolean(paciente.activo)
    });
    setOpenModal(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    const telefonoLimpio = form.contactoTelefonico.replace(/\D/g, '');
    if (telefonoLimpio.length !== 10) {
      setMensaje({ tipo: 'error', texto: 'El teléfono debe tener exactamente 10 dígitos.' });
      return;
    }

    const url = editandoId ? `${API_URL}/pacientes/${editandoId}` : `${API_URL}/pacientes`;
    const method = editandoId ? 'PUT' : 'POST';

    const payload = {
      nombre: form.nombre.trim().toUpperCase(),
      aPaterno: form.aPaterno.trim().toUpperCase(),
      aMaterno: form.aMaterno.trim().toUpperCase(),
      edad: Number(form.edad),
      contactoTelefonico: telefonoLimpio,
      fechaRegistro: form.fechaRegistro,
      idTerapeuta: Number(form.idTerapeuta),
      activo: Boolean(form.activo)
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

  const handleEliminar = async (paciente) => {
    const confirmado = window.confirm(`¿Deseas dar de baja al paciente ${formatearNombre(paciente)}?`);
    if (!confirmado) return;

    setMensaje({ tipo: '', texto: '' });
    try {
      const res = await fetch(`${API_URL}/pacientes/${paciente.idPaciente}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo dar de baja al paciente' });
        return;
      }

      setMensaje({ tipo: 'success', texto: 'Paciente dado de baja correctamente' });
      cargarDatos();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al dar de baja al paciente' });
    }
  };

  const handleReactivar = async (paciente) => {
    const confirmado = window.confirm(`¿Deseas reactivar al paciente ${formatearNombre(paciente)}?`);
    if (!confirmado) return;

    setMensaje({ tipo: '', texto: '' });
    try {
      const res = await fetch(`${API_URL}/pacientes/${paciente.idPaciente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: true })
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo reactivar al paciente' });
        return;
      }

      setMensaje({ tipo: 'success', texto: 'Paciente reactivado correctamente' });
      cargarDatos();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al reactivar al paciente' });
    }
  };

  const pacientesFiltrados = pacientes.filter((p) => {
    const telFormateado = formatearTelefono(p.contactoTelefonico);
    const texto = `P-${p.idPaciente} ${p.nombre} ${p.aPaterno} ${p.aMaterno} ${p.contactoTelefonico} ${telFormateado}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  const pacientesActivos = pacientesFiltrados.filter((p) => p.activo !== false && p.activo !== 0);
  const pacientesInactivos = pacientesFiltrados.filter((p) => p.activo === false || p.activo === 0);
  const terapeutasActivos = terapeutas.filter((t) => t.activo !== false && t.activo !== 0);

  return (
    <MainCard
      title="Catálogo de Pacientes"
      secondary={
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={abrirNuevo}>
            Nuevo Paciente
          </Button>
          <Button variant="outlined" size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate('/')}>
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

      <Typography variant="h4" sx={{ mb: 2 }}>
        PACIENTES ACTIVOS
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Código</strong>
              </TableCell>
              <TableCell>
                <strong>Nombre(s)</strong>
              </TableCell>
              <TableCell>
                <strong>Apellido Paterno</strong>
              </TableCell>
              <TableCell>
                <strong>Apellido Materno</strong>
              </TableCell>
              <TableCell>
                <strong>Edad</strong>
              </TableCell>
              <TableCell>
                <strong>Teléfono</strong>
              </TableCell>
              <TableCell>
                <strong>Terapeuta Asignado</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Acciones</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pacientesActivos.map((p) => (
              <TableRow key={p.idPaciente}>
                <TableCell>{`P-${p.idPaciente}`}</TableCell>
                <TableCell>{(p.nombre || '').toUpperCase()}</TableCell>
                <TableCell>{(p.aPaterno || '').toUpperCase()}</TableCell>
                <TableCell>{(p.aMaterno || '').toUpperCase()}</TableCell>
                <TableCell>{p.edad} AÑOS</TableCell>
                <TableCell>{formatearTelefono(p.contactoTelefonico)}</TableCell>
                <TableCell>{formatearNombre(p.terapeuta)}</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="Editar">
                      <IconButton size="small" color="primary" onClick={() => abrirEditar(p)}>
                        <IconEdit size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Dar de baja">
                      <IconButton size="small" color="error" onClick={() => handleEliminar(p)}>
                        <IconTrash size={18} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {pacientesActivos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No se encontraron pacientes activos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h4" sx={{ mb: 2 }}>
        PACIENTES DADOS DE BAJA
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Código</strong>
              </TableCell>
              <TableCell>
                <strong>Nombre(s)</strong>
              </TableCell>
              <TableCell>
                <strong>Apellido Paterno</strong>
              </TableCell>
              <TableCell>
                <strong>Apellido Materno</strong>
              </TableCell>
              <TableCell>
                <strong>Edad</strong>
              </TableCell>
              <TableCell>
                <strong>Teléfono</strong>
              </TableCell>
              <TableCell>
                <strong>Terapeuta Asignado</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Acciones</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pacientesInactivos.map((p) => (
              <TableRow key={p.idPaciente} sx={{ opacity: 0.75 }}>
                <TableCell>{`P-${p.idPaciente}`}</TableCell>
                <TableCell>{(p.nombre || '').toUpperCase()}</TableCell>
                <TableCell>{(p.aPaterno || '').toUpperCase()}</TableCell>
                <TableCell>{(p.aMaterno || '').toUpperCase()}</TableCell>
                <TableCell>{p.edad} AÑOS</TableCell>
                <TableCell>{formatearTelefono(p.contactoTelefonico)}</TableCell>
                <TableCell>{formatearNombre(p.terapeuta)}</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="Reactivar">
                    <IconButton color="success" size="small" onClick={() => handleReactivar(p)}>
                      <IconRefresh size={18} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {pacientesInactivos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay pacientes dados de baja.
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
                  inputProps={{ maxLength: 60 }}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Apellido Paterno"
                  inputProps={{ maxLength: 60 }}
                  value={form.aPaterno}
                  onChange={(e) => setForm({ ...form, aPaterno: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Apellido Materno"
                  inputProps={{ maxLength: 60 }}
                  value={form.aMaterno}
                  onChange={(e) => setForm({ ...form, aMaterno: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Edad"
                  inputProps={{ min: 0, max: 17, step: 1 }}
                  value={form.edad}
                  onChange={(e) => setForm({ ...form, edad: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Teléfono"
                  inputProps={{ maxLength: 13 }}
                  value={form.contactoTelefonico}
                  onChange={(e) => setForm({ ...form, contactoTelefonico: formatearTelefono(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Fecha de registro"
                  InputLabelProps={{ shrink: true }}
                  value={form.fechaRegistro || obtenerFechaLocalISO()}
                  onChange={(e) => setForm({ ...form, fechaRegistro: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sx={{ width: '100%' }}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Terapeuta Asignado"
                  value={form.idTerapeuta}
                  onChange={(e) => setForm({ ...form, idTerapeuta: e.target.value })}
                >
                  <MenuItem value="" disabled>
                    SELECCIONA UN TERAPEUTA
                  </MenuItem>
                  {terapeutasActivos.map((t) => (
                    <MenuItem key={t.idTerapeuta} value={t.idTerapeuta}>
                      {formatearNombre(t)} — {(t.especialidad || '').toUpperCase()}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {editandoId && (
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch checked={Boolean(form.activo)} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />}
                    label="Paciente activo"
                  />
                </Grid>
              )}
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
