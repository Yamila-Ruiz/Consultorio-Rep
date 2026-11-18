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
  TextField
} from '@mui/material';
import { IconArrowLeft, IconEdit, IconPlus } from '@tabler/icons-react';
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
      if (res.ok) setServicios(await res.json());
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
      nombre: srv.nombre,
      descripcion: srv.descripcion,
      activo: srv.activo === 1
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
          nombre: form.nombre,
          descripcion: form.descripcion,
          activo: form.activo ? 1 : 0
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
        setMensaje({ tipo: 'error', texto: 'Error al guardar el servicio' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor' });
    }
  };

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
                <strong>Editar</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {servicios.map((s) => (
              <TableRow key={s.idServicio}>
                <TableCell>{`S-${s.idServicio}`}</TableCell>
                <TableCell>{s.nombre}</TableCell>
                <TableCell>{s.descripcion}</TableCell>
                <TableCell>
                  <Chip label={s.activo === 1 ? 'Activo' : 'Inactivo'} color={s.activo === 1 ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="primary" onClick={() => abrirEditar(s)}>
                    <IconEdit size={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {servicios.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay servicios registrados en el catálogo.
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
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <TextField
                fullWidth
                label="Descripción Breve"
                inputProps={{ maxLength: 50 }}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
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
