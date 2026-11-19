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
  FormControlLabel,
  Grid,
  IconButton,
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
import { IconArrowLeft, IconClock, IconEdit, IconRefresh, IconTrash, IconUserPlus } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Muestra primero Nombre(s), luego Apellido Paterno y Apellido Materno
const formatearNombre = (persona) => {
  if (!persona) return '—';
  return `${persona.nombre || ''} ${persona.aPaterno || ''} ${persona.aMaterno || ''}`.trim().toUpperCase();
};

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
    nombre: '',
    aPaterno: '',
    aMaterno: '',
    contactoTelefonico: '',
    especialidad: '',
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
      const [resTer, resSlots] = await Promise.all([fetch(`${API_URL}/terapeutas`), fetch(`${API_URL}/slots`)]);
      if (resTer.ok) {
        const dataTer = await resTer.json();
        dataTer.sort(
          (a, b) =>
            (a.aPaterno || '').localeCompare(b.aPaterno || '', 'es') ||
            (a.aMaterno || '').localeCompare(b.aMaterno || '', 'es') ||
            (a.nombre || '').localeCompare(b.nombre || '', 'es')
        );
        setTerapeutas(dataTer);
      }
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

    const telefonoLimpio = formUsuario.contactoTelefonico.replace(/\D/g, '');
    if (telefonoLimpio.length !== 10) {
      setMensaje({ tipo: 'error', texto: 'El teléfono debe tener exactamente 10 dígitos.' });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formUsuario,
          nombre: formUsuario.nombre.trim().toUpperCase(),
          aPaterno: formUsuario.aPaterno.trim().toUpperCase(),
          aMaterno: formUsuario.aMaterno.trim().toUpperCase(),
          especialidad: formUsuario.especialidad.trim().toUpperCase(),
          contactoTelefonico: telefonoLimpio
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'Error al registrar usuario' });
        return;
      }

      setMensaje({
        tipo: 'success',
        texto: `Usuario registrado correctamente. Usuario generado: ${data.nombreUsuario}`
      });
      setOpenRegistro(false);
      setFormUsuario({
        rol: 'terapeuta',
        nombre: '',
        aPaterno: '',
        aMaterno: '',
        contactoTelefonico: '',
        especialidad: '',
        contrasena: ''
      });
      cargarDatos();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor' });
    }
  };

  const handleActualizarTerapeuta = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    const telefonoLimpio = (terapeutaEdit.contactoTelefonico || '').replace(/\D/g, '');
    if (telefonoLimpio.length !== 10) {
      setMensaje({ tipo: 'error', texto: 'El teléfono debe tener exactamente 10 dígitos.' });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/terapeutas/${terapeutaEdit.idTerapeuta}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: terapeutaEdit.nombre.trim().toUpperCase(),
          aPaterno: terapeutaEdit.aPaterno.trim().toUpperCase(),
          aMaterno: terapeutaEdit.aMaterno.trim().toUpperCase(),
          contactoTelefonico: telefonoLimpio,
          especialidad: terapeutaEdit.especialidad.trim().toUpperCase(),
          activo: Boolean(terapeutaEdit.activo)
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo actualizar el terapeuta' });
        return;
      }

      setMensaje({ tipo: 'success', texto: 'Datos del terapeuta actualizados' });
      setOpenEditar(false);
      cargarDatos();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al actualizar el terapeuta' });
    }
  };

  const handleEliminarTerapeuta = async (terapeuta) => {
    const confirmado = window.confirm(`¿Deseas dar de baja al terapeuta ${formatearNombre(terapeuta)}?`);
    if (!confirmado) return;

    setMensaje({ tipo: '', texto: '' });
    try {
      const res = await fetch(`${API_URL}/terapeutas/${terapeuta.idTerapeuta}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo dar de baja al terapeuta' });
        return;
      }

      setMensaje({ tipo: 'success', texto: 'Terapeuta dado de baja correctamente' });
      cargarDatos();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al dar de baja al terapeuta' });
    }
  };

  const handleReactivarTerapeuta = async (terapeuta) => {
    const confirmado = window.confirm(`¿Deseas reactivar al terapeuta ${formatearNombre(terapeuta)}?`);
    if (!confirmado) return;

    setMensaje({ tipo: '', texto: '' });
    try {
      const res = await fetch(`${API_URL}/terapeutas/${terapeuta.idTerapeuta}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: true })
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo reactivar al terapeuta' });
        return;
      }

      setMensaje({ tipo: 'success', texto: 'Terapeuta reactivado correctamente' });
      cargarDatos();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al reactivar al terapeuta' });
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

  const terapeutasActivos = terapeutas.filter((t) => t.activo !== false && t.activo !== 0);
  const terapeutasInactivos = terapeutas.filter((t) => t.activo === false || t.activo === 0);

  return (
    <MainCard
      title="Terapeutas y Disponibilidad"
      secondary={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" color="primary" startIcon={<IconClock size={18} />} onClick={() => setOpenSlot(true)}>
            Agregar Horario
          </Button>
          {esRecepcionista && (
            <Button variant="contained" color="primary" startIcon={<IconUserPlus size={18} />} onClick={() => setOpenRegistro(true)}>
              Registrar Usuario
            </Button>
          )}
          <Button variant="outlined" size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate('/')}>
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
                <strong>Especialidad</strong>
              </TableCell>
              <TableCell>
                <strong>Teléfono</strong>
              </TableCell>
              <TableCell>
                <strong>Usuario</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Acciones</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {terapeutasActivos.map((t) => (
              <TableRow key={t.idTerapeuta}>
                <TableCell>{`T-${t.idTerapeuta}`}</TableCell>
                <TableCell>{(t.nombre || '').toUpperCase()}</TableCell>
                <TableCell>{(t.aPaterno || '').toUpperCase()}</TableCell>
                <TableCell>{(t.aMaterno || '').toUpperCase()}</TableCell>
                <TableCell>{(t.especialidad || '').toUpperCase()}</TableCell>
                <TableCell>{formatearTelefono(t.contactoTelefonico)}</TableCell>
                <TableCell>{(t.usuario?.nombreUsuario || '—').toUpperCase()}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => {
                        setTerapeutaEdit({
                          ...t,
                          nombre: (t.nombre || '').toUpperCase(),
                          aPaterno: (t.aPaterno || '').toUpperCase(),
                          aMaterno: (t.aMaterno || '').toUpperCase(),
                          especialidad: (t.especialidad || '').toUpperCase(),
                          contactoTelefonico: formatearTelefono(t.contactoTelefonico),
                          activo: true
                        });
                        setOpenEditar(true);
                      }}
                    >
                      <IconEdit size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Dar de baja">
                    <IconButton size="small" color="error" onClick={() => handleEliminarTerapeuta(t)}>
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {terapeutasActivos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay terapeutas activos registrados aún.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h4" sx={{ mb: 2 }}>
        TERAPEUTAS DADOS DE BAJA
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
                <strong>Especialidad</strong>
              </TableCell>
              <TableCell>
                <strong>Teléfono</strong>
              </TableCell>
              <TableCell>
                <strong>Usuario</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Acciones</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {terapeutasInactivos.map((t) => (
              <TableRow key={t.idTerapeuta} sx={{ opacity: 0.75 }}>
                <TableCell>{`T-${t.idTerapeuta}`}</TableCell>
                <TableCell>{(t.nombre || '').toUpperCase()}</TableCell>
                <TableCell>{(t.aPaterno || '').toUpperCase()}</TableCell>
                <TableCell>{(t.aMaterno || '').toUpperCase()}</TableCell>
                <TableCell>{(t.especialidad || '').toUpperCase()}</TableCell>
                <TableCell>{formatearTelefono(t.contactoTelefonico)}</TableCell>
                <TableCell>{(t.usuario?.nombreUsuario || '—').toUpperCase()}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Reactivar terapeuta">
                    <IconButton size="small" color="success" onClick={() => handleReactivarTerapeuta(t)}>
                      <IconRefresh size={18} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {terapeutasInactivos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay terapeutas dados de baja.
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
              <TableCell>
                <strong>Terapeuta</strong>
              </TableCell>
              <TableCell>
                <strong>Fecha</strong>
              </TableCell>
              <TableCell>
                <strong>Inicio</strong>
              </TableCell>
              <TableCell>
                <strong>Fin</strong>
              </TableCell>
              <TableCell>
                <strong>Estado</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {slots.map((s) => (
              <TableRow key={s.idSlot}>
                <TableCell>{formatearNombre(s.terapeuta)}</TableCell>
                <TableCell>{s.fecha?.split('T')[0]}</TableCell>
                <TableCell>{s.inicio?.split('T')[1]?.slice(0, 5)}</TableCell>
                <TableCell>{s.fin?.split('T')[1]?.slice(0, 5)}</TableCell>
                <TableCell>
                  <Chip label={s.estado === 1 ? 'DISPONIBLE' : 'OCUPADO'} color={s.estado === 1 ? 'success' : 'default'} size="small" />
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
                  <MenuItem value="terapeuta">TERAPEUTA</MenuItem>
                  <MenuItem value="recepcionista">RECEPCIONISTA</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Nombre(s)"
                  inputProps={{ maxLength: 60 }}
                  value={formUsuario.nombre}
                  onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Apellido Paterno"
                  inputProps={{ maxLength: 60 }}
                  value={formUsuario.aPaterno}
                  onChange={(e) => setFormUsuario({ ...formUsuario, aPaterno: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Apellido Materno"
                  inputProps={{ maxLength: 60 }}
                  value={formUsuario.aMaterno}
                  onChange={(e) => setFormUsuario({ ...formUsuario, aMaterno: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Teléfono"
                  inputProps={{ maxLength: 13 }}
                  value={formUsuario.contactoTelefonico}
                  onChange={(e) => setFormUsuario({ ...formUsuario, contactoTelefonico: formatearTelefono(e.target.value) })}
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
                    onChange={(e) => setFormUsuario({ ...formUsuario, especialidad: e.target.value.toUpperCase() })}
                  />
                </Grid>
              )}
              <Grid item xs={12} sm={formUsuario.rol === 'terapeuta' ? 12 : 6}>
                <TextField
                  fullWidth
                  required
                  type="password"
                  label="Contraseña"
                  inputProps={{ maxLength: 30 }}
                  value={formUsuario.contrasena}
                  onChange={(e) => setFormUsuario({ ...formUsuario, contrasena: e.target.value })}
                  helperText="El usuario se creará automáticamente como ROL + PRIMER NOMBRE (en mayúsculas)"
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
                  label="Nombre(s)"
                  inputProps={{ maxLength: 60 }}
                  value={terapeutaEdit.nombre || ''}
                  onChange={(e) => setTerapeutaEdit({ ...terapeutaEdit, nombre: e.target.value.toUpperCase() })}
                />
                <TextField
                  fullWidth
                  required
                  label="Apellido Paterno"
                  inputProps={{ maxLength: 60 }}
                  value={terapeutaEdit.aPaterno || ''}
                  onChange={(e) => setTerapeutaEdit({ ...terapeutaEdit, aPaterno: e.target.value.toUpperCase() })}
                />
                <TextField
                  fullWidth
                  required
                  label="Apellido Materno"
                  inputProps={{ maxLength: 60 }}
                  value={terapeutaEdit.aMaterno || ''}
                  onChange={(e) => setTerapeutaEdit({ ...terapeutaEdit, aMaterno: e.target.value.toUpperCase() })}
                />
                <TextField
                  fullWidth
                  required
                  label="Especialidad"
                  inputProps={{ maxLength: 30 }}
                  value={terapeutaEdit.especialidad || ''}
                  onChange={(e) => setTerapeutaEdit({ ...terapeutaEdit, especialidad: e.target.value.toUpperCase() })}
                />
                <TextField
                  fullWidth
                  required
                  label="Teléfono"
                  inputProps={{ maxLength: 13 }}
                  value={terapeutaEdit.contactoTelefonico || ''}
                  onChange={(e) => setTerapeutaEdit({ ...terapeutaEdit, contactoTelefonico: formatearTelefono(e.target.value) })}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(terapeutaEdit.activo)}
                      onChange={(e) => setTerapeutaEdit({ ...terapeutaEdit, activo: e.target.checked })}
                    />
                  }
                  label="Terapeuta activo"
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
                {terapeutasActivos.map((t) => (
                  <MenuItem key={t.idTerapeuta} value={t.idTerapeuta}>
                    {`${formatearNombre(t)} (${(t.especialidad || '').toUpperCase()})`}
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
