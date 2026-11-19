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
  IconButton,
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
import { IconArrowLeft, IconEdit, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Servicios() {
  const navigate = useNavigate();
  const [servicios, setServicios] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const [openModal, setOpenModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', activo: true });

  const cargarServicios = async () => {
    try {
      const res = await fetch(`${API_URL}/servicios`);
      if (res.ok) {
        const data = await res.json();
        data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
        setServicios(data);
      }
    } catch (error) {
      console.error('Error al cargar servicios:', error);
    }
  };

  useEffect(() => {
    cargarServicios();
  }, []);

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm({ nombre: '', descripcion: '', activo: true });
    setOpenModal(true);
  };

  const abrirEditar = (srv) => {
    setEditandoId(srv.idServicio);
    setForm({
      nombre: (srv.nombre || '').toUpperCase(),
      descripcion: (srv.descripcion || '').toUpperCase(),
      activo: Boolean(srv.activo)
    });
    setOpenModal(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    const url = editandoId ? `${API_URL}/servicios/${editandoId}` : `${API_URL}/servicios`;
    const method = editandoId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim().toUpperCase(),
          descripcion: form.descripcion.trim().toUpperCase(),
          activo: Boolean(form.activo)
        })
      });

      if (res.ok) {
        setMensaje({
          tipo: 'success',
          texto: editandoId ? 'Servicio actualizado correctamente' : 'Servicio registrado en el catálogo'
        });
        setOpenModal(false);
        cargarServicios();
      } else {
        const data = await res.json();
        setMensaje({ tipo: 'error', texto: data.error || 'Error al guardar el servicio' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor' });
    }
  };

  const handleEliminar = async (srv) => {
    const confirmado = window.confirm(`¿Deseas dar de baja el servicio "${(srv.nombre || '').toUpperCase()}"?`);
    if (!confirmado) return;

    try {
      const res = await fetch(`${API_URL}/servicios/${srv.idServicio}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMensaje({ tipo: 'success', texto: 'Servicio dado de baja correctamente' });
        cargarServicios();
      } else {
        const data = await res.json();
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo dar de baja el servicio' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor' });
    }
  };

  const handleReactivar = async (srv) => {
    try {
      const res = await fetch(`${API_URL}/servicios/${srv.idServicio}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: true })
      });

      if (res.ok) {
        setMensaje({ tipo: 'success', texto: 'Servicio reactivado correctamente' });
        cargarServicios();
      } else {
        const data = await res.json();
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo reactivar el servicio' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor' });
    }
  };

  const serviciosActivos = servicios.filter((s) => Boolean(s.activo));
  const serviciosInactivos = servicios.filter((s) => !Boolean(s.activo));

  return (
    <MainCard
      title="Catálogo de Servicios"
      secondary={
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={abrirNuevo}>
            Nuevo Servicio
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

      <Typography variant="h4" sx={{ mb: 2 }}>
        SERVICIOS ACTIVOS
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Código</strong>
              </TableCell>
              <TableCell>
                <strong>Nombre del Servicio</strong>
              </TableCell>
              <TableCell>
                <strong>Descripción</strong>
              </TableCell>
              <TableCell>
                <strong>Estado</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Acciones</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviciosActivos.map((s) => (
              <TableRow key={s.idServicio}>
                <TableCell>{`S-${s.idServicio}`}</TableCell>
                <TableCell>{(s.nombre || '').toUpperCase()}</TableCell>
                <TableCell>{(s.descripcion || '').toUpperCase()}</TableCell>
                <TableCell>
                  <Chip label="ACTIVO" color="success" size="small" />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" color="primary" onClick={() => abrirEditar(s)}>
                      <IconEdit size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Dar de baja">
                    <IconButton size="small" color="error" onClick={() => handleEliminar(s)}>
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {serviciosActivos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay servicios activos en el catálogo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h4" sx={{ mb: 2 }}>
        SERVICIOS DADOS DE BAJA
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Código</strong>
              </TableCell>
              <TableCell>
                <strong>Nombre del Servicio</strong>
              </TableCell>
              <TableCell>
                <strong>Descripción</strong>
              </TableCell>
              <TableCell>
                <strong>Estado</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Acciones</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviciosInactivos.map((s) => (
              <TableRow key={s.idServicio} sx={{ opacity: 0.75 }}>
                <TableCell>{`S-${s.idServicio}`}</TableCell>
                <TableCell>{(s.nombre || '').toUpperCase()}</TableCell>
                <TableCell>{(s.descripcion || '').toUpperCase()}</TableCell>
                <TableCell>
                  <Chip label="INACTIVO" color="default" size="small" />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Reactivar servicio">
                    <IconButton size="small" color="success" onClick={() => handleReactivar(s)}>
                      <IconRefresh size={18} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {serviciosInactivos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay servicios dados de baja.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleGuardar}>
          <DialogTitle>{editandoId ? 'Actualizar Servicio' : 'Registrar Nuevo Servicio'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                required
                label="Nombre del Servicio"
                inputProps={{ maxLength: 30 }}
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value.toUpperCase() })}
              />
              <TextField
                fullWidth
                label="Descripción Breve"
                inputProps={{ maxLength: 50 }}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value.toUpperCase() })}
              />
              <FormControlLabel
                control={<Switch checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />}
                label="Servicio activo"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Guardar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </MainCard>
  );
}
