import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
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
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const cargar = async () => {
    try {
      const r = await fetch(`${API_URL}/pagos`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'No se pudieron cargar los pagos');
      setPagos(d);
    } catch (e) {
      setError(e.message);
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

  return (
    <PageCard
      title="Control de pagos"
      secondary={
        <Button variant="outlined" onClick={() => navigate('/')}>
          Inicio
        </Button>
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
                <TableCell>{p.facturacion ? `${p.nombreFacturacion} · ${p.correoFacturacion}` : 'No requiere'}</TableCell>
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
    </PageCard>
  );
}
