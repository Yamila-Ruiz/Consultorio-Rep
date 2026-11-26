import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Grid,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const COLORES_TERAPEUTAS = [
  { bg: '#E3F2FD', border: '#1976D2', text: '#0D47A1', dot: '#1976D2' },
  { bg: '#F3E5F5', border: '#7B1FA2', text: '#4A148C', dot: '#7B1FA2' },
  { bg: '#E8F5E9', border: '#2E7D32', text: '#1B5E20', dot: '#2E7D32' },
  { bg: '#FFF3E0', border: '#EF6C00', text: '#E65100', dot: '#EF6C00' },
  { bg: '#FCE4EC', border: '#C2185B', text: '#880E4F', dot: '#C2185B' },
  { bg: '#E0F7FA', border: '#00838F', text: '#006064', dot: '#00838F' },
  { bg: '#FFF8E1', border: '#F9A825', text: '#F57F17', dot: '#F9A825' },
  { bg: '#EDE7F6', border: '#512DA8', text: '#311B92', dot: '#512DA8' }
];
const fechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nombreCompleto = (p) => `${p?.nombre || ''} ${p?.aPaterno || ''} ${p?.aMaterno || ''}`.trim().toUpperCase();
const horaLocal = (v) => {
  if (!v) return '--:--';
  const s = String(v);
  const match = s.match(/T(\d{2}:\d{2})/) || s.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : s.slice(0, 5);
};
const fechaLegible = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default function Inicio() {
  const navigate = useNavigate();
  const hoy = fechaLocal();
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [slots, setSlots] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [cargando, setCargando] = useState(false);
  const [ahora, setAhora] = useState(new Date());
  const [modalPago, setModalPago] = useState(null);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [facturacion, setFacturacion] = useState(false);
  const [nombreFacturacion, setNombreFacturacion] = useState('');
  const [correoFacturacion, setCorreoFacturacion] = useState('');
  const [modalCita, setModalCita] = useState(null);
  const [idServicio, setIdServicio] = useState('');
  const [idSlot, setIdSlot] = useState('');

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const rutas = ['citas', 'pacientes', 'servicios', 'slots', 'pagos'];
      const respuestas = await Promise.all(rutas.map((r) => fetch(`${API_URL}/${r}`)));
      const datos = await Promise.all(respuestas.map(async (r) => (r.ok ? r.json() : [])));
      setCitas(datos[0]);
      setPacientes(datos[1].filter((p) => p.activo !== false));
      setServicios(datos[2].filter((s) => s.activo !== false));
      setSlots(datos[3]);
      setPagos(datos[4]);
    } catch (e) {
      console.error(e);
      setMensaje({ tipo: 'error', texto: 'No fue posible conectar con el servidor.' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(reloj);
  }, []);

  const citasHoy = useMemo(
    () =>
      citas
        .filter((c) => c.slotdisponibilidad?.fecha?.slice(0, 10) === hoy && c.estado !== 'CANCELADA')
        .sort((a, b) => horaLocal(a.slotdisponibilidad?.inicio).localeCompare(horaLocal(b.slotdisponibilidad?.inicio))),
    [citas, hoy]
  );

  const terapeutasHoy = useMemo(() => {
    const map = new Map();
    citasHoy.forEach((c) => {
      const t = c.slotdisponibilidad?.terapeuta;
      const id = t?.idTerapeuta ?? 'sin-terapeuta';
      if (!map.has(id)) map.set(id, { terapeuta: t, citas: [] });
      map.get(id).citas.push(c);
    });
    return [...map.values()];
  }, [citasHoy]);

  const colorTerapeuta = (id) => {
    const ids = [...new Set(citasHoy.map((c) => c.slotdisponibilidad?.terapeuta?.idTerapeuta))];
    return COLORES_TERAPEUTAS[Math.max(0, ids.indexOf(id)) % COLORES_TERAPEUTAS.length];
  };

  const actualizarEstado = async (cita, estado) => {
    setMensaje({ tipo: '', texto: '' });
    try {
      const r = await fetch(`${API_URL}/citas/${cita.idCita}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'No se pudo actualizar la cita.');
      setMensaje({
        tipo: 'success',
        texto:
          estado === 'INASISTENCIA'
            ? 'Inasistencia registrada. Se generó la multa correspondiente si la cita estaba confirmada.'
            : 'Asistencia registrada.'
      });
      await cargarDatos();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  };

  const abrirPago = (cita) => {
    const ultimo = [...pagos]
      .filter((p) => p.requiereFactura && p.nombreFacturacion && p.correoFacturacion)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0];
    setModalPago(cita);
    setMetodoPago('EFECTIVO');
    setFacturacion(Boolean(ultimo));
    setNombreFacturacion(ultimo?.nombreFacturacion || '');
    setCorreoFacturacion(ultimo?.correoFacturacion || '');
  };

  const guardarPago = async () => {
    if (!modalPago) return;

    try {
      const datosPago = {
        idCita: modalPago.idCita,
        metodoPago,
        facturacion: facturacion === true,
        nombreFacturacion: facturacion ? nombreFacturacion.trim() : null,
        correoFacturacion: facturacion ? correoFacturacion.trim() : null
      };

      console.log('Datos enviados al registrar pago:', datosPago);

      const r = await fetch(`${API_URL}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosPago)
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.error || 'No se pudo registrar el pago.');
      }

      setModalPago(null);

      setMensaje({
        tipo: 'success',
        texto: `Pago registrado por $${Number(d.monto ?? d.pago?.monto ?? modalPago.servicio?.precio ?? 0).toFixed(2)}.`
      });

      await cargarDatos();
    } catch (e) {
      console.error('Error al registrar pago:', e);
      setMensaje({ tipo: 'error', texto: e.message });
    }
  };

  const abrirNuevaCita = async (cita) => {
    const paciente = pacientes.find((p) => p.idPaciente === cita.idPaciente);
    if (!paciente) {
      setMensaje({ tipo: 'error', texto: 'El paciente no está activo o no se encontró.' });
      return;
    }
    setModalCita({ paciente, citaOrigen: cita });
    setIdServicio(servicios[0]?.idServicio || '');
    setIdSlot('');
  };

  const terapeutaAsignado = modalCita?.paciente?.idTerapeuta;
  const slotsPaciente = slots.filter((s) => s.estado && Number(s.idTerapeuta) === Number(terapeutaAsignado));

  const guardarNuevaCita = async () => {
    if (!modalCita || !idServicio || !idSlot) {
      setMensaje({ tipo: 'warning', texto: 'Selecciona un servicio y un horario disponible.' });
      return;
    }
    try {
      const r = await fetch(`${API_URL}/citas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPaciente: modalCita.paciente.idPaciente,
          idServicio: Number(idServicio),
          idSlot: Number(idSlot),
          esPrimeraSesion: false
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'No se pudo agendar la nueva cita.');
      setModalCita(null);
      setMensaje({ tipo: 'success', texto: 'Nueva cita agendada conservando el paciente.' });
      await cargarDatos();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  };

  return (
    <MainCard
      title="Agenda de hoy"
      secondary={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/citas')}>
            Calendario de citas
          </Button>
          <Button variant="contained" onClick={() => navigate('/citas')}>
            Agendar cita
          </Button>
        </Stack>
      }
    >
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', bgcolor: 'background.default' }}>
              <Typography variant="overline" color="text.secondary">
                AGENDA DEL DÍA
              </Typography>
              <Typography variant="h2" fontWeight={800} color="primary.main">
                {new Date(`${hoy}T12:00:00`).getDate()}
              </Typography>
              <Typography variant="h6" fontWeight={700} textTransform="capitalize">
                {new Date(`${hoy}T12:00:00`).toLocaleDateString('es-MX', { month: 'long' })}
              </Typography>
              <Typography variant="body2" color="text.secondary" textTransform="capitalize">
                {fechaLegible(hoy)}
              </Typography>
              <Chip sx={{ mt: 2 }} color="primary" label={`${citasHoy.length} citas`} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={9}>
            {mensaje.texto && (
              <Alert severity={mensaje.tipo} sx={{ mb: 2 }} onClose={() => setMensaje({ tipo: '', texto: '' })}>
                {mensaje.texto}
              </Alert>
            )}
            {cargando && <Typography sx={{ mb: 2 }}>Actualizando agenda…</Typography>}
            {terapeutasHoy.length === 0 && (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No hay citas registradas para hoy.</Typography>
              </Paper>
            )}
            <Stack spacing={2}>
              {terapeutasHoy.map(({ terapeuta, citas: citasTerapeuta }) => {
                const color = colorTerapeuta(terapeuta?.idTerapeuta);
                return (
                  <Paper
                    key={terapeuta?.idTerapeuta || 'sin-terapeuta'}
                    variant="outlined"
                    sx={{ p: 2, borderLeft: `6px solid ${color.border}` }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color.dot }} />
                      <Typography variant="h6" sx={{ color: color.text }}>
                        {nombreCompleto(terapeuta) || 'Terapeuta no asignado'}
                      </Typography>
                    </Stack>
                    <Stack spacing={1.25}>
                      {citasTerapeuta.map((c) => {
                        const paciente = c.paciente;
                        const estadoFinal = ['ATENDIDA', 'INASISTENCIA', 'CANCELADA'].includes(c.estado);
                        const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
                        const minutosInicio =
                          Number(horaLocal(c.slotdisponibilidad?.inicio).slice(0, 2)) * 60 +
                          Number(horaLocal(c.slotdisponibilidad?.inicio).slice(3, 5));
                        const minutosFin =
                          Number(horaLocal(c.slotdisponibilidad?.fin).slice(0, 2)) * 60 +
                          Number(horaLocal(c.slotdisponibilidad?.fin).slice(3, 5));
                        const enCurso = minutosActuales >= minutosInicio && minutosActuales < minutosFin;
                        return (
                          <Paper
                            key={c.idCita}
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              bgcolor: color.bg,
                              borderColor: enCurso ? 'primary.main' : color.border,
                              borderWidth: enCurso ? 2 : 1
                            }}
                          >
                            <Stack
                              direction={{ xs: 'column', md: 'row' }}
                              spacing={1.5}
                              justifyContent="space-between"
                              alignItems={{ md: 'center' }}
                            >
                              <Box sx={{ minWidth: 220 }}>
                                <Typography fontWeight={800}>
                                  {horaLocal(c.slotdisponibilidad?.inicio)} – {horaLocal(c.slotdisponibilidad?.fin)}
                                </Typography>
                                <Typography fontWeight={700}>{nombreCompleto(paciente)}</Typography>
                                <Typography variant="body2">
                                  {c.servicio?.nombre || 'Servicio'} · ${Number(c.servicio?.precio || 0).toFixed(2)}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                  <Chip size="small" label={c.estado} />
                                  {enCurso && <Chip size="small" color="primary" label="EN CURSO" />}
                                </Stack>
                              </Box>
                              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                                {!estadoFinal && (
                                  <>
                                    {c.estado === 'AGENDADA' && (
                                      <Button size="small" variant="outlined" onClick={() => actualizarEstado(c, 'CONFIRMADA')}>
                                        Confirmar
                                      </Button>
                                    )}
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="success"
                                      onClick={() => actualizarEstado(c, 'ATENDIDA')}
                                    >
                                      Asistencia
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="error"
                                      onClick={() => actualizarEstado(c, 'INASISTENCIA')}
                                    >
                                      Inasistencia
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => abrirPago(c)}
                                  disabled={c.estado === 'INASISTENCIA' || c.estado === 'CANCELADA' || Boolean(c.pago)}
                                >
                                  Registrar pago
                                </Button>
                                <Button size="small" variant="outlined" onClick={() => abrirNuevaCita(c)}>
                                  Agendar nueva cita
                                </Button>
                              </Stack>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Dialog open={Boolean(modalPago)} onClose={() => setModalPago(null)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar pago</DialogTitle>
        <DialogContent>
          {modalPago && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography>
                {nombreCompleto(modalPago.paciente)} · {modalPago.servicio?.nombre}
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                ${Number(modalPago.servicio?.precio || 0).toFixed(2)}
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Método de pago</InputLabel>
                <Select label="Método de pago" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                  <MenuItem value="TARJETA DE DEBITO">Tarjeta de débito</MenuItem>
                  <MenuItem value="TARJETA DE CREDITO">Tarjeta de crédito</MenuItem>
                  <MenuItem value="TRANSFERENCIA">Transferencia bancaria</MenuItem>
                </Select>
              </FormControl>
              <FormControl>
                <InputLabel>¿Requiere factura?</InputLabel>
                <Select
                  value={facturacion ? 'SI' : 'NO'}
                  label="¿Requiere factura?"
                  onChange={(e) => setFacturacion(e.target.value === 'SI')}
                >
                  <MenuItem value="NO">No</MenuItem>
                  <MenuItem value="SI">Sí</MenuItem>
                </Select>
              </FormControl>
              {facturacion && (
                <>
                  <TextField
                    label="Nombre de facturación"
                    value={nombreFacturacion}
                    onChange={(e) => setNombreFacturacion(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Correo de facturación"
                    type="email"
                    value={correoFacturacion}
                    onChange={(e) => setCorreoFacturacion(e.target.value)}
                    fullWidth
                  />
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalPago(null)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarPago}>
            Guardar pago
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(modalCita)} onClose={() => setModalCita(null)} fullWidth maxWidth="sm">
        <DialogTitle>Agendar nueva cita</DialogTitle>
        <DialogContent>
          {modalCita && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography fontWeight={700}>Paciente: {nombreCompleto(modalCita.paciente)}</Typography>
              <Typography variant="body2" color="text.secondary">
                Se conservará el paciente y se mostrarán horarios del terapeuta asignado.
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Servicio</InputLabel>
                <Select label="Servicio" value={idServicio} onChange={(e) => setIdServicio(e.target.value)}>
                  {servicios.map((s) => (
                    <MenuItem key={s.idServicio} value={s.idServicio}>
                      {s.nombre} — ${Number(s.precio || 0).toFixed(2)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Horario disponible</InputLabel>
                <Select label="Horario disponible" value={idSlot} onChange={(e) => setIdSlot(e.target.value)}>
                  {slotsPaciente.map((s) => (
                    <MenuItem key={s.idSlot} value={s.idSlot}>
                      {new Date(`${String(s.fecha).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX')} · {horaLocal(s.inicio)}–
                      {horaLocal(s.fin)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {slotsPaciente.length === 0 && (
                <Alert severity="warning">
                  El terapeuta asignado no tiene horarios disponibles. Agrega horarios desde el catálogo de terapeutas.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCita(null)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarNuevaCita} disabled={!slotsPaciente.length}>
            Agendar
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
}
