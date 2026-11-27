import { useEffect, useMemo, useState } from 'react';
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
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import PageCard from '../../components/PageCard.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const nombre = (p) => `${p?.nombre || ''} ${p?.aPaterno || ''} ${p?.aMaterno || ''}`.trim().toUpperCase();
const fechaHoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Pagos() {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [citas, setCitas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [facturacion, setFacturacion] = useState(false);
  const [nombreFacturacion, setNombreFacturacion] = useState('');
  const [correoFacturacion, setCorreoFacturacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const cargar = async () => {
    try {
      const [respuestaPagos, respuestaCitas] = await Promise.all([
        fetch(`${API_URL}/pagos`),
        fetch(`${API_URL}/citas`)
      ]);
      const [datosPagos, datosCitas] = await Promise.all([respuestaPagos.json(), respuestaCitas.json()]);
      if (!respuestaPagos.ok) throw new Error(datosPagos.error || 'No se pudieron cargar los pagos');
      if (!respuestaCitas.ok) throw new Error(datosCitas.error || 'No se pudieron cargar las citas');
      if (!Array.isArray(datosPagos) || !Array.isArray(datosCitas)) throw new Error('El servidor devolvió datos de pagos o citas inválidos.');
      setPagos(datosPagos);
      setCitas(datosCitas);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar pagos y citas.');
    }
  };
  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(
    () =>
      pagos.filter((p) => {
        const c = p.cita || {};
        const texto =
          `${nombre(c.paciente)} ${c.servicio?.nombre || ''} ${c.slotdisponibilidad?.terapeuta ? nombre(c.slotdisponibilidad.terapeuta) : ''} ${p.metodo || ''} ${p.nombreFacturacion || ''}`.toLowerCase();
        return texto.includes(busqueda.toLowerCase());
      }),
    [pagos, busqueda]
  );
  const total = filtrados.reduce((s, p) => s + Number(p.monto || 0), 0);
  const citasCobrables = citas.filter(
    (cita) => ['CONFIRMADA', 'ATENDIDA'].includes(cita.estado) && !cita.pago
  );
  const citaActiva = citasCobrables.find((cita) => String(cita.idCita) === String(citaSeleccionada));
  const abrirRegistro = () => {
    setError('');
    setCitaSeleccionada('');
    setMetodoPago('EFECTIVO');
    setFacturacion(false);
    setNombreFacturacion('');
    setCorreoFacturacion('');
    setModalAbierto(true);
  };
  const registrarPago = async () => {
    if (!citaActiva) {
      setError('Selecciona una cita confirmada o atendida sin pago registrado.');
      return;
    }
    if (facturacion && (!nombreFacturacion.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoFacturacion.trim()))) {
      setError('Para solicitar factura, captura un nombre y un correo válido.');
      return;
    }

    setGuardando(true);
    setError('');
    try {
      const respuesta = await fetch(`${API_URL}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idCita: citaActiva.idCita,
          metodoPago,
          facturacion,
          nombreFacturacion: facturacion ? nombreFacturacion.trim() : null,
          correoFacturacion: facturacion ? correoFacturacion.trim() : null
        })
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || 'No se pudo registrar el pago.');
      setModalAbierto(false);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el pago.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PageCard
      title="Control de pagos"
      secondary={
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={abrirRegistro} disabled={!citasCobrables.length}>
            Agregar pago
          </Button>
          <Button variant="outlined" onClick={() => navigate('/')}>Inicio</Button>
        </Stack>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          label="Buscar paciente, servicio, método o facturación"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Paper variant="outlined" sx={{ p: 1.5, minWidth: 180 }}>
          <Typography variant="caption" color="text.secondary">
            Total filtrado
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            ${total.toFixed(2)}
          </Typography>
        </Paper>
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Paciente</TableCell>
              <TableCell>Terapeuta</TableCell>
              <TableCell>Servicio</TableCell>
              <TableCell>Método</TableCell>
              <TableCell>Facturación</TableCell>
              <TableCell align="right">Monto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtrados.map((p) => (
              <TableRow key={p.idPago}>
                <TableCell>{String(p.fecha).slice(0, 10)}</TableCell>
                <TableCell>{nombre(p.cita?.paciente)}</TableCell>
                <TableCell>{nombre(p.cita?.slotdisponibilidad?.terapeuta)}</TableCell>
                <TableCell>{p.cita?.servicio?.nombre || '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={p.metodo} />
                </TableCell>
                <TableCell>
                  {p.requiereFactura ? `${p.nombreFacturacion} · ${p.correoFacturacion}` : 'No requiere'}
                </TableCell>
                <TableCell align="right">
                  <strong>${Number(p.monto || 0).toFixed(2)}</strong>
                </TableCell>
              </TableRow>
            ))}
            {!filtrados.length && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay pagos que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={modalAbierto} onClose={() => !guardando && setModalAbierto(false)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar pago</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <FormControl fullWidth required>
              <InputLabel id="cita-pago-label">Cita</InputLabel>
              <Select
                labelId="cita-pago-label"
                label="Cita"
                value={citaSeleccionada}
                onChange={(e) => setCitaSeleccionada(e.target.value)}
              >
                {citasCobrables.map((cita) => (
                  <MenuItem key={cita.idCita} value={String(cita.idCita)}>
                    {`${nombre(cita.paciente)} · ${cita.servicio?.nombre || 'Servicio'} · ${String(cita.slotdisponibilidad?.fecha || '').slice(0, 10)} ${cita.slotdisponibilidad?.inicio ? String(cita.slotdisponibilidad.inicio).slice(11, 16) : ''} · $${Number(cita.servicio?.precio || 0).toFixed(2)}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {citaActiva && (
              <Typography variant="body2" color="text.secondary">
                Importe del servicio: ${Number(citaActiva.servicio?.precio || 0).toFixed(2)}
              </Typography>
            )}
            <FormControl fullWidth>
              <InputLabel id="metodo-pago-label">Método de pago</InputLabel>
              <Select
                labelId="metodo-pago-label"
                label="Método de pago"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
              >
                <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                <MenuItem value="TARJETA DE DEBITO">Tarjeta de débito</MenuItem>
                <MenuItem value="TARJETA DE CREDITO">Tarjeta de crédito</MenuItem>
                <MenuItem value="TRANSFERENCIA">Transferencia bancaria</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={facturacion} onChange={(e) => setFacturacion(e.target.checked)} />}
              label="¿Solicita factura?"
            />
            {facturacion && (
              <>
                <TextField
                  required
                  fullWidth
                  label="Nombre de facturación"
                  value={nombreFacturacion}
                  inputProps={{ maxLength: 50 }}
                  onChange={(e) => setNombreFacturacion(e.target.value)}
                />
                <TextField
                  required
                  fullWidth
                  type="email"
                  label="Correo de facturación"
                  value={correoFacturacion}
                  inputProps={{ maxLength: 60 }}
                  onChange={(e) => setCorreoFacturacion(e.target.value)}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalAbierto(false)} disabled={guardando}>Cancelar</Button>
          <Button variant="contained" onClick={registrarPago} disabled={guardando || !citasCobrables.length}>
            {guardando ? 'Guardando…' : 'Guardar pago'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageCard>
  );
}
