import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import PageCard from '../../components/PageCard.jsx';
import { getStoredUser } from '../../utils/session.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const fechaLocal = () => {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const nombreCompleto = (persona) =>
  `${persona?.nombre || ''} ${persona?.aPaterno || ''} ${persona?.aMaterno || ''}`.trim();

const horaLocal = (valor) => {
  if (typeof valor !== 'string') return '--:--';
  const coincidencia = valor.match(/T(\d{2}:\d{2})/) || valor.match(/^(\d{2}:\d{2})/);
  return coincidencia ? coincidencia[1] : valor.slice(0, 5);
};

const fechaLegible = (valor) =>
  new Date(`${valor}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

async function leerLista(respuesta, recurso) {
  let datos;
  try {
    datos = await respuesta.json();
  } catch {
    throw new Error(`El servidor devolvió una respuesta inválida al cargar ${recurso}.`);
  }

  if (!respuesta.ok) {
    throw new Error(datos?.error || `No fue posible cargar ${recurso}.`);
  }
  if (!Array.isArray(datos)) {
    throw new Error(`La respuesta de ${recurso} tiene un formato inválido.`);
  }
  return datos;
}

export default function InicioTerapeuta() {
  const usuario = getStoredUser();
  const idTerapeuta = Number(usuario?.perfil?.idTerapeuta);
  const idValido = Number.isSafeInteger(idTerapeuta) && idTerapeuta > 0;
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const hoy = fechaLocal();

  useEffect(() => {
    let activo = true;

    if (!idValido) {
      setError('No se pudo identificar la cuenta del terapeuta. Cierra sesión e inicia nuevamente.');
      setCargando(false);
      return () => {
        activo = false;
      };
    }

    const cargarDatos = async () => {
      setCargando(true);
      setError('');
      try {
        const [respuestaCitas, respuestaPacientes] = await Promise.all([
          fetch(`${API_URL}/citas`),
          fetch(`${API_URL}/pacientes`)
        ]);
        const [listaCitas, listaPacientes] = await Promise.all([
          leerLista(respuestaCitas, 'las citas'),
          leerLista(respuestaPacientes, 'los pacientes')
        ]);

        if (activo) {
          setCitas(listaCitas);
          setPacientes(listaPacientes);
        }
      } catch (requestError) {
        if (activo) {
          setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar los datos.');
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarDatos();
    return () => {
      activo = false;
    };
  }, [idTerapeuta, idValido]);

  const citasAgendadas = useMemo(
    () =>
      citas
        .filter((cita) => {
          const fecha = cita.slotdisponibilidad?.fecha?.slice(0, 10);
          const terapeutaId = cita.slotdisponibilidad?.idTerapeuta ?? cita.slotdisponibilidad?.terapeuta?.idTerapeuta;
          return (
            Number(terapeutaId) === idTerapeuta &&
            fecha >= hoy &&
            (cita.estado === 'AGENDADA' || cita.estado === 'CONFIRMADA')
          );
        })
        .sort((a, b) => {
          const fechaA = a.slotdisponibilidad?.fecha?.slice(0, 10) || '';
          const fechaB = b.slotdisponibilidad?.fecha?.slice(0, 10) || '';
          return (
            fechaA.localeCompare(fechaB) ||
            horaLocal(a.slotdisponibilidad?.inicio).localeCompare(horaLocal(b.slotdisponibilidad?.inicio))
          );
        }),
    [citas, hoy, idTerapeuta]
  );

  const pacientesAsignados = useMemo(
    () =>
      pacientes
        .filter((paciente) => Number(paciente.idTerapeuta) === idTerapeuta)
        .sort(
          (a, b) =>
            (a.aPaterno || '').localeCompare(b.aPaterno || '', 'es') ||
            (a.aMaterno || '').localeCompare(b.aMaterno || '', 'es') ||
            (a.nombre || '').localeCompare(b.nombre || '', 'es')
        ),
    [pacientes, idTerapeuta]
  );

  const nombreTerapeuta = nombreCompleto(usuario?.perfil) || 'Terapeuta';

  return (
    <PageCard
      title="Mi panel"
      secondary={
        <Typography variant="body2" color="text.secondary">
          {`Bienvenido/a, ${nombreTerapeuta}`}
        </Typography>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Cargando citas y pacientes" />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xl: '1.2fr 0.8fr' },
            gap: 2
          }}
        >
          <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h4">Mis próximas citas</Typography>
              <Chip label={citasAgendadas.length} color="primary" size="small" />
            </Box>
            <TableContainer>
              <Table size="small" aria-label="Próximas citas del terapeuta">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Hora</TableCell>
                    <TableCell>Paciente</TableCell>
                    <TableCell>Servicio</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {citasAgendadas.map((cita) => {
                    const fecha = cita.slotdisponibilidad?.fecha?.slice(0, 10) || '';
                    return (
                      <TableRow key={cita.idCita}>
                        <TableCell>{fecha ? fechaLegible(fecha) : '—'}</TableCell>
                        <TableCell>{horaLocal(cita.slotdisponibilidad?.inicio)}</TableCell>
                        <TableCell>{nombreCompleto(cita.paciente) || 'Sin paciente'}</TableCell>
                        <TableCell>{cita.servicio?.nombre || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={cita.estado}
                            color={cita.estado === 'CONFIRMADA' ? 'info' : 'primary'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {citasAgendadas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No tienes citas próximas agendadas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h4">Mis pacientes asignados</Typography>
              <Chip label={pacientesAsignados.length} color="secondary" size="small" />
            </Box>
            <TableContainer>
              <Table size="small" aria-label="Pacientes asignados al terapeuta">
                <TableHead>
                  <TableRow>
                    <TableCell>Paciente</TableCell>
                    <TableCell>Edad</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pacientesAsignados.map((paciente) => (
                    <TableRow key={paciente.idPaciente}>
                      <TableCell>{nombreCompleto(paciente) || 'Sin nombre'}</TableCell>
                      <TableCell>{`${paciente.edad} años`}</TableCell>
                      <TableCell>{paciente.contactoTelefonico || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={paciente.activo ? 'Activo' : 'Inactivo'}
                          color={paciente.activo ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {pacientesAsignados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No tienes pacientes asignados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}
    </PageCard>
  );
}
