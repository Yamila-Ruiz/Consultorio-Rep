import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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
import { IconArrowLeft, IconCalendarPlus } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Muestra primero Nombre(s), luego Apellido Paterno y Apellido Materno
const formatearNombre = (persona) => {
  if (!persona) return '—';
  return `${persona.nombre || ''} ${persona.aPaterno || ''} ${persona.aMaterno || ''}`.trim().toUpperCase();
};

const ordenarPorApellidos = (lista) =>
  [...lista].sort(
    (a, b) =>
      (a.aPaterno || '').localeCompare(b.aPaterno || '', 'es') ||
      (a.aMaterno || '').localeCompare(b.aMaterno || '', 'es') ||
      (a.nombre || '').localeCompare(b.nombre || '', 'es')
  );

export default function Citas() {
  const navigate = useNavigate();
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [terapeutas, setTerapeutas] = useState([]);
  const [slots, setSlots] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const [openModal, setOpenModal] = useState(false);
  const [terapeutaFiltro, setTerapeutaFiltro] = useState('');
  const [form, setForm] = useState({
    idPaciente: '',
    idServicio: '',
    idSlot: '',
    esPrimeraSesion: false
  });

  const cargarTodo = async () => {
    try {
      const [resCitas, resPac, resSrv, resTer, resSlots] = await Promise.all([
        fetch(`${API_URL}/citas`),
        fetch(`${API_URL}/pacientes`),
        fetch(`${API_URL}/servicios`),
        fetch(`${API_URL}/terapeutas`),
        fetch(`${API_URL}/slots`)
      ]);

      if (resCitas.ok) setCitas(await resCitas.json());
      if (resPac.ok) {
        const dataPac = await resPac.json();
        setPacientes(ordenarPorApellidos(dataPac.filter((p) => Boolean(p.activo))));
      }
      if (resSrv.ok) {
        const dataSrv = await resSrv.json();
        setServicios(dataSrv.filter((s) => Boolean(s.activo)));
      }
      if (resTer.ok) {
        const dataTer = await resTer.json();
        setTerapeutas(ordenarPorApellidos(dataTer.filter((t) => Boolean(t.activo))));
      }
      if (resSlots.ok) setSlots(await resSlots.json());
    } catch (error) {
      console.error('Error al cargar datos de citas:', error);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const slotsDisponibles = slots.filter((s) => s.estado === 1 && (!terapeutaFiltro || Number(s.idTerapeuta) === Number(terapeutaFiltro)));

  const handleAgendarCita = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    const slotSeleccionado = slots.find((s) => Number(s.idSlot) === Number(form.idSlot));
    if (!slotSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un horario disponible válido' });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/citas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPaciente: form.idPaciente,
          idServicio: form.idServicio,
          idSlot: form.idSlot,
          fecha: slotSeleccionado.fecha.split('T')[0],
          hora: slotSeleccionado.inicio.split('T')[1].slice(0, 5),
          esPrimeraSesion: form.esPrimeraSesion
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo agendar la cita' });
        return;
      }

      setMensaje({ tipo: 'success', texto: 'Cita agendada correctamente y horario reservado' });
      setOpenModal(false);
      setForm({ idPaciente: '', idServicio: '', idSlot: '', esPrimeraSesion: false });
      cargarTodo();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor' });
    }
  };

  return (
    <MainCard
      title="Gestión y Agendamiento de Citas"
      secondary={
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<IconCalendarPlus size={18} />} onClick={() => setOpenModal(true)}>
            Agendar Cita
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
                <strong>Fecha</strong>
              </TableCell>
              <TableCell>
                <strong>Hora</strong>
              </TableCell>
              <TableCell>
                <strong>Paciente</strong>
              </TableCell>
              <TableCell>
                <strong>Terapeuta</strong>
              </TableCell>
              <TableCell>
                <strong>Servicio</strong>
              </TableCell>
              <TableCell>
                <strong>Sesión</strong>
              </TableCell>
              <TableCell>
                <strong>Estado</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {citas.map((c) => (
              <TableRow key={c.idCita}>
                <TableCell>{`C-${c.idCita}`}</TableCell>
                <TableCell>{c.fecha?.split('T')[0]}</TableCell>
                <TableCell>{c.hora?.split('T')[1]?.slice(0, 5)}</TableCell>
                <TableCell>{formatearNombre(c.paciente)}</TableCell>
                <TableCell>{formatearNombre(c.slotdisponibilidad?.terapeuta)}</TableCell>
                <TableCell>{(c.servicio?.nombre || '—').toUpperCase()}</TableCell>
                <TableCell>{c.esPrimeraSesion === 1 ? 'PRIMERA VEZ' : 'SUBSECUENTE'}</TableCell>
                <TableCell>
                  <Chip label={(c.estado || '').toUpperCase()} color="primary" size="small" />
                </TableCell>
              </TableRow>
            ))}
            {citas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay citas agendadas todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleAgendarCita}>
          <DialogTitle>Agendar Nueva Cita</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                fullWidth
                required
                label="Paciente"
                value={form.idPaciente}
                onChange={(e) => {
                  const idPac = e.target.value;
                  const pac = pacientes.find((p) => Number(p.idPaciente) === Number(idPac));
                  setForm({ ...form, idPaciente: idPac, idSlot: '' });
                  if (pac?.idTerapeuta) setTerapeutaFiltro(pac.idTerapeuta);
                }}
              >
                {pacientes.map((p) => (
                  <MenuItem key={p.idPaciente} value={p.idPaciente}>
                    {formatearNombre(p)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                required
                label="Servicio"
                value={form.idServicio}
                onChange={(e) => setForm({ ...form, idServicio: e.target.value })}
              >
                {servicios.map((s) => (
                  <MenuItem key={s.idServicio} value={s.idServicio}>
                    {(s.nombre || '').toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Filtrar horarios por Terapeuta"
                value={terapeutaFiltro}
                onChange={(e) => {
                  setTerapeutaFiltro(e.target.value);
                  setForm({ ...form, idSlot: '' });
                }}
              >
                <MenuItem value="">TODOS LOS TERAPEUTAS</MenuItem>
                {terapeutas.map((t) => (
                  <MenuItem key={t.idTerapeuta} value={t.idTerapeuta}>
                    {formatearNombre(t)} ({(t.especialidad || '').toUpperCase()})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                required
                label="Horario Disponible"
                value={form.idSlot}
                onChange={(e) => setForm({ ...form, idSlot: e.target.value })}
                helperText={
                  slotsDisponibles.length === 0
                    ? 'No hay horarios libres. Registra disponibilidad primero en el módulo Terapeutas.'
                    : 'Solo se muestran horarios disponibles para evitar duplicados.'
                }
              >
                {slotsDisponibles.map((s) => (
                  <MenuItem key={s.idSlot} value={s.idSlot}>
                    {s.fecha?.split('T')[0]} | {s.inicio?.split('T')[1]?.slice(0, 5)} - {s.fin?.split('T')[1]?.slice(0, 5)} —{' '}
                    {formatearNombre(s.terapeuta)}
                  </MenuItem>
                ))}
              </TextField>

              <FormControlLabel
                control={
                  <Checkbox checked={form.esPrimeraSesion} onChange={(e) => setForm({ ...form, esPrimeraSesion: e.target.checked })} />
                }
                label="Es primera sesión del paciente"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={slotsDisponibles.length === 0}>
              Agendar Cita
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </MainCard>
  );
}
