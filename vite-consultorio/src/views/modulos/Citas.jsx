import { useState, useEffect, useMemo } from 'react';
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
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { IconArrowLeft, IconCalendarPlus, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// SERVICIO PREDETERMINADO AL AGENDAR UNA NUEVA CITA
// Si algún día cambia el servicio por defecto:
const SERVICIO_PREDETERMINADO = 'TERAPIA INDIVIDUAL';

// Paleta de colores para identificar dinámicamente a cada terapeuta activo en el calendario
const PALETA_TERAPEUTAS = [
  { bg: '#E3F2FD', border: '#1976D2', text: '#0D47A1', dot: '#1976D2' },
  { bg: '#F3E5F5', border: '#7B1FA2', text: '#4A148C', dot: '#7B1FA2' },
  { bg: '#E8F5E9', border: '#2E7D32', text: '#1B5E20', dot: '#2E7D32' },
  { bg: '#FFF3E0', border: '#EF6C00', text: '#E65100', dot: '#EF6C00' },
  { bg: '#FCE4EC', border: '#C2185B', text: '#880E4F', dot: '#C2185B' },
  { bg: '#E0F7FA', border: '#00838F', text: '#006064', dot: '#00838F' },
  { bg: '#FFF8E1', border: '#F9A825', text: '#F57F17', dot: '#F9A825' },
  { bg: '#EDE7F6', border: '#512DA8', text: '#311B92', dot: '#512DA8' }
];

const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const DIAS_SEMANA_CORTO = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DIAS_SEMANA_HEADER = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

// Muestra Nombre(s) + Apellido Paterno + Apellido Materno
const formatearNombre = (persona) => {
  if (!persona) return '—';
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

// Obtiene fecha local YYYY-MM-DD sin desfase de zona horaria
const obtenerFechaLocalISO = (fecha = new Date()) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Obtiene la fecha de mañana en formato local YYYY-MM-DD
const obtenerMananaLocalISO = (fechaBase = new Date()) => {
  const manana = new Date(fechaBase);
  manana.setDate(manana.getDate() + 1);
  return obtenerFechaLocalISO(manana);
};

// Formatea YYYY-MM-DD como "miércoles 25 de noviembre de 2026"
const formatearFechaLarga = (fechaISO) => {
  if (!fechaISO) return '';
  const soloFecha = fechaISO.split('T')[0];
  const fechaObj = new Date(`${soloFecha}T12:00:00`);
  return fechaObj.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Construye la cuadrícula mensual (Lunes a Domingo) para un año y mes (0-11)
const generarCeldasMes = (anio, mes) => {
  const primerDia = new Date(anio, mes, 1);
  // Convertir getDay() (0=Dom..6=Sáb) a índice Lunes=0..Domingo=6
  const offsetInicio = (primerDia.getDay() + 6) % 7;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  const celdas = [];
  for (let i = 0; i < offsetInicio; i += 1) {
    celdas.push(null);
  }
  for (let dia = 1; dia <= diasEnMes; dia += 1) {
    const fechaISO = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    celdas.push({ dia, fechaISO });
  }
  while (celdas.length % 7 !== 0) {
    celdas.push(null);
  }
  return celdas;
};

export default function Citas() {
  const navigate = useNavigate();
  const ahora = new Date();
  const hoyISO = obtenerFechaLocalISO(ahora);
  const mananaISO = obtenerMananaLocalISO(ahora);
  const [anioMinPicker, mesMinPicker] = mananaISO.split('-').map(Number);

  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [terapeutas, setTerapeutas] = useState([]);
  const [slots, setSlots] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Mes visible en el calendario principal de citas
  const [mesCalendario, setMesCalendario] = useState(() => {
    const hoy = new Date();
    return { anio: hoy.getFullYear(), mes: hoy.getMonth() };
  });

  // Estados del modal de agendar cita
  const [openModal, setOpenModal] = useState(false);
  const [terapeutaFiltro, setTerapeutaFiltro] = useState('');
  const [mesPicker, setMesPicker] = useState(() => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return { anio: manana.getFullYear(), mes: manana.getMonth() };
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState('');
  const [form, setForm] = useState({
    idPaciente: '',
    idServicio: '',
    idSlot: '',
    esPrimeraSesion: false
  });

  const esPrimerMesPicker = mesPicker.anio < anioMinPicker || (mesPicker.anio === anioMinPicker && mesPicker.mes <= mesMinPicker - 1);

  // Obtiene el ID del servicio predeterminado ("TERAPIA INDIVIDUAL")
  const obtenerIdServicioPredeterminado = (listaServicios) => {
    const encontrado = listaServicios.find((s) => (s.nombre || '').trim().toUpperCase() === SERVICIO_PREDETERMINADO);
    return encontrado ? encontrado.idServicio : '';
  };

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
        setPacientes(ordenarPorApellidos(dataPac.filter((p) => p.activo !== false && p.activo !== 0)));
      }
      if (resSrv.ok) {
        const dataSrv = await resSrv.json();
        const activosSrv = dataSrv.filter((s) => s.activo !== false && s.activo !== 0);
        setServicios(activosSrv);
        // Asignar servicio predeterminado si aún no hay uno seleccionado
        setForm((prev) => ({
          ...prev,
          idServicio: prev.idServicio || obtenerIdServicioPredeterminado(activosSrv)
        }));
      }
      if (resTer.ok) {
        const dataTer = await resTer.json();
        setTerapeutas(ordenarPorApellidos(dataTer.filter((t) => t.activo !== false && t.activo !== 0)));
      }
      if (resSlots.ok) setSlots(await resSlots.json());
    } catch (error) {
      console.error('Error al cargar datos de citas:', error);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // Mapa dinámico de colores por terapeuta activo (se actualiza solo al agregar/desactivar terapeutas)
  const coloresPorTerapeuta = useMemo(() => {
    const mapa = {};
    terapeutas.forEach((t, idx) => {
      mapa[Number(t.idTerapeuta)] = PALETA_TERAPEUTAS[idx % PALETA_TERAPEUTAS.length];
    });
    return mapa;
  }, [terapeutas]);

  // Citas próximas y actuales (fecha >= hoy y no canceladas)
  const citasProximasYActuales = useMemo(
    () =>
      citas.filter((c) => {
        const fechaSlot = c.slotdisponibilidad?.fecha?.split('T')[0];
        return fechaSlot && fechaSlot >= hoyISO && c.estado !== 'CANCELADA';
      }),
    [citas, hoyISO]
  );

  // Agrupar citas próximas y actuales por fecha YYYY-MM-DD para el calendario principal
  const citasPorFecha = useMemo(() => {
    const mapa = {};
    citasProximasYActuales.forEach((c) => {
      const fechaKey = c.slotdisponibilidad?.fecha?.split('T')[0];
      if (!fechaKey) return;
      if (!mapa[fechaKey]) mapa[fechaKey] = [];
      mapa[fechaKey].push(c);
    });
    return mapa;
  }, [citasProximasYActuales]);

  // Horarios disponibles filtrados al terapeuta asignado al paciente y fecha >= mañana
  const slotsDisponibles = useMemo(
    () =>
      slots
        .filter((s) => {
          const fechaSlot = s.fecha?.split('T')[0];
          const esLibre = Boolean(s.estado) && fechaSlot && fechaSlot >= mananaISO;
          const terapeutaActivo = s.terapeuta?.activo !== false && s.terapeuta?.activo !== 0;
          const coincideTerapeuta = !terapeutaFiltro || Number(s.idTerapeuta) === Number(terapeutaFiltro);
          return esLibre && terapeutaActivo && coincideTerapeuta;
        })
        .sort((a, b) => {
          // ... el resto queda igual
          const fA = a.fecha?.split('T')[0] || '';
          const fB = b.fecha?.split('T')[0] || '';
          if (fA !== fB) return fA.localeCompare(fB);
          const hA = a.inicio?.split('T')[1] || '';
          const hB = b.inicio?.split('T')[1] || '';
          return hA.localeCompare(hB);
        }),
    [slots, terapeutaFiltro, mananaISO]
  );
  // Conjunto de fechas YYYY-MM-DD que tienen al menos un slot disponible
  const diasConDisponibilidad = useMemo(() => {
    const setDias = new Set();
    slotsDisponibles.forEach((s) => {
      const f = s.fecha?.split('T')[0];
      if (f) setDias.add(f);
    });
    return setDias;
  }, [slotsDisponibles]);

  // Horarios disponibles del día seleccionado en el calendario gráfico del modal
  const horariosDelDiaSeleccionado = useMemo(() => {
    if (!diaSeleccionado) return [];
    return slotsDisponibles.filter((s) => s.fecha?.split('T')[0] === diaSeleccionado);
  }, [slotsDisponibles, diaSeleccionado]);

  const abrirModalAgendar = () => {
    setMensaje({ tipo: '', texto: '' });
    setTerapeutaFiltro('');
    setDiaSeleccionado('');
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    setMesPicker({ anio: manana.getFullYear(), mes: manana.getMonth() });
    setForm({
      idPaciente: '',
      // Aquí se establece "TERAPIA INDIVIDUAL" como servicio predeterminado al abrir el modal
      idServicio: obtenerIdServicioPredeterminado(servicios),
      idSlot: '',
      esPrimeraSesion: false
    });
    setOpenModal(true);
  };

  const handleSeleccionarPaciente = (idPac) => {
    const pac = pacientes.find((p) => Number(p.idPaciente) === Number(idPac));
    const idTerAsignado = pac?.idTerapeuta ? Number(pac.idTerapeuta) : '';

    setTerapeutaFiltro(idTerAsignado);
    setDiaSeleccionado('');
    setForm((prev) => ({
      ...prev,
      idPaciente: idPac,
      idSlot: ''
    }));

    // Posicionar automáticamente el calendario en el mes del primer horario libre del terapeuta asignado
    if (idTerAsignado) {
      const primerSlotTerapeuta = slots
        .filter(
          (s) =>
            Boolean(s.estado) &&
            s.terapeuta?.activo !== false &&
            s.terapeuta?.activo !== 0 &&
            Number(s.idTerapeuta) === idTerAsignado &&
            (s.fecha?.split('T')[0] || '') >= mananaISO
        )
        .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))[0];

      if (primerSlotTerapeuta?.fecha) {
        const [anioStr, mesStr] = primerSlotTerapeuta.fecha.split('T')[0].split('-');
        setMesPicker({ anio: Number(anioStr), mes: Number(mesStr) - 1 });
      }
    }
  };

  const handleAgendarCita = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    if (!form.idSlot) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un día y un horario disponible en el calendario.' });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/citas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPaciente: Number(form.idPaciente),
          idServicio: Number(form.idServicio),
          idSlot: Number(form.idSlot),
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
      cargarTodo();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor' });
    }
  };

  const cambiarMesPrincipal = (delta) => {
    setMesCalendario((prev) => {
      const nuevaFecha = new Date(prev.anio, prev.mes + delta, 1);
      return { anio: nuevaFecha.getFullYear(), mes: nuevaFecha.getMonth() };
    });
  };

  const cambiarMesPicker = (delta) => {
    setMesPicker((prev) => {
      const nuevaFecha = new Date(prev.anio, prev.mes + delta, 1);
      const nuevoAnio = nuevaFecha.getFullYear();
      const nuevoMes = nuevaFecha.getMonth();

      if (nuevoAnio < anioMinPicker || (nuevoAnio === anioMinPicker && nuevoMes < mesMinPicker - 1)) {
        return prev;
      }

      return { anio: nuevoAnio, mes: nuevoMes };
    });
  };

  const celdasCalendarioPrincipal = useMemo(() => generarCeldasMes(mesCalendario.anio, mesCalendario.mes), [mesCalendario]);

  const celdasCalendarioPicker = useMemo(() => generarCeldasMes(mesPicker.anio, mesPicker.mes), [mesPicker]);

  const pacienteSeleccionadoObj = pacientes.find((p) => Number(p.idPaciente) === Number(form.idPaciente));
  const terapeutaAsignadoObj = terapeutas.find((t) => Number(t.idTerapeuta) === Number(terapeutaFiltro));

  return (
    <MainCard
      title="Calendario de Citas Próximas y Actuales"
      secondary={
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<IconCalendarPlus size={18} />} onClick={abrirModalAgendar}>
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

      {/* Leyenda dinámica de colores por Terapeuta activo */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 2 }}>
        {terapeutas.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay terapeutas activos registrados.
          </Typography>
        ) : (
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {terapeutas.map((t) => {
              const color = coloresPorTerapeuta[Number(t.idTerapeuta)] || PALETA_TERAPEUTAS[0];
              return (
                <Chip
                  key={t.idTerapeuta}
                  label={formatearNombre(t)}
                  size="small"
                  sx={{
                    bgcolor: color.bg,
                    color: color.text,
                    border: `1px solid ${color.border}`,
                    fontWeight: 600
                  }}
                  icon={
                    <Box
                      component="span"
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: color.dot,
                        ml: 1
                      }}
                    />
                  }
                />
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Encabezado de navegación del Calendario Principal */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <IconButton onClick={() => cambiarMesPrincipal(-1)} size="small">
          <IconChevronLeft size={20} />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {`${MESES_ES[mesCalendario.mes]} ${mesCalendario.anio}`}
        </Typography>
        <IconButton onClick={() => cambiarMesPrincipal(1)} size="small">
          <IconChevronRight size={20} />
        </IconButton>
      </Stack>

      {/* Cuadrícula del Calendario Principal */}
      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
        {/* Días de la semana */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            bgcolor: 'action.hover',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          {DIAS_SEMANA_HEADER.map((diaNombre) => (
            <Box key={diaNombre} sx={{ py: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {diaNombre}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Celdas de los días */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)'
          }}
        >
          {celdasCalendarioPrincipal.map((celda, index) => {
            if (!celda) {
              return (
                <Box
                  key={`empty-${index}`}
                  sx={{
                    minHeight: 115,
                    bgcolor: 'action.disabledBackground',
                    opacity: 0.35,
                    borderRight: (index + 1) % 7 !== 0 ? '1px solid' : 'none',
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                />
              );
            }

            const citasDelDia = citasPorFecha[celda.fechaISO] || [];
            const esHoy = celda.fechaISO === hoyISO;

            return (
              <Box
                key={celda.fechaISO}
                sx={{
                  minHeight: 115,
                  p: 1,
                  borderRight: (index + 1) % 7 !== 0 ? '1px solid' : 'none',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: esHoy ? 'primary.lighter' : 'background.paper'
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: esHoy ? 800 : 600,
                      color: esHoy ? 'primary.main' : 'text.primary'
                    }}
                  >
                    {celda.dia}
                  </Typography>
                  {esHoy && <Chip label="HOY" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />}
                </Stack>

                {/* Bloques de citas del día: SOLO muestran fecha y nombre del paciente */}
                <Stack spacing={0.5}>
                  {citasDelDia.map((c) => {
                    const idTer = Number(c.slotdisponibilidad?.idTerapeuta);
                    const color = coloresPorTerapeuta[idTer] || PALETA_TERAPEUTAS[0];
                    const fechaCita = c.slotdisponibilidad?.fecha?.split('T')[0] || '';
                    const nombrePaciente = formatearNombre(c.paciente);
                    const horaInicio = c.slotdisponibilidad?.inicio?.split('T')[1]?.slice(0, 5) || '';
                    const nombreTerapeuta = formatearNombre(c.slotdisponibilidad?.terapeuta);

                    return (
                      <Tooltip key={c.idCita} title={`Hora: ${horaInicio} | Terapeuta: ${nombreTerapeuta}`} arrow>
                        <Box
                          sx={{
                            px: 0.75,
                            py: 0.5,
                            borderRadius: 1,
                            bgcolor: color.bg,
                            borderLeft: `3px solid ${color.border}`,
                            color: color.text
                          }}
                        >
                          <Typography variant="caption" display="block" sx={{ fontWeight: 700, lineHeight: 1.15, fontSize: '0.68rem' }}>
                            {fechaCita}
                          </Typography>
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{ fontWeight: 600, lineHeight: 1.2, fontSize: '0.72rem' }}
                            noWrap
                          >
                            {nombrePaciente}
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Modal: Agendar Nueva Cita con Calendario Gráfico de Disponibilidad */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <Box component="form" onSubmit={handleAgendarCita}>
          <DialogTitle>Agendar Nueva Cita</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              <Grid container spacing={2} sx={{ width: '100%' }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Paciente"
                    value={form.idPaciente}
                    onChange={(e) => handleSeleccionarPaciente(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    SelectProps={{ displayEmpty: true }}
                  >
                    <MenuItem value="" disabled>
                      SELECCIONA UN PACIENTE
                    </MenuItem>
                    {pacientes.map((p) => (
                      <MenuItem key={p.idPaciente} value={p.idPaciente}>
                        {formatearNombre(p)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Servicio"
                    value={form.idServicio}
                    onChange={(e) => setForm({ ...form, idServicio: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  >
                    {servicios.map((s) => (
                      <MenuItem key={s.idServicio} value={s.idServicio}>
                        {(s.nombre || '').toUpperCase()}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              {pacienteSeleccionadoObj && (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  Terapeuta asignado al paciente: <strong>{formatearNombre(terapeutaAsignadoObj)}</strong>
                </Alert>
              )}

              <Divider />

              {/* Sección gráfica de Día y Horario (Estilo calendario interactivo) */}
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Día y horario
              </Typography>

              {!form.idPaciente ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
                  <Typography color="text.secondary">
                    Selecciona primero un paciente para mostrar los días disponibles de su terapeuta asignado.
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={3} alignItems="flex-start">
                  {/* Columna Izquierda: Mini Calendario Mensual */}
                  <Grid item xs={12} md={6}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, px: 1 }}>
                      <IconButton size="small" disabled={esPrimerMesPicker} onClick={() => cambiarMesPicker(-1)}>
                        <IconChevronLeft size={18} />
                      </IconButton>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {`${MESES_ES[mesPicker.mes]} ${mesPicker.anio}`}
                      </Typography>
                      <IconButton size="small" onClick={() => cambiarMesPicker(1)}>
                        <IconChevronRight size={18} />
                      </IconButton>
                    </Stack>

                    {/* Encabezado L M M J V S D */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75, mb: 1 }}>
                      {DIAS_SEMANA_CORTO.map((letra, idx) => (
                        <Box key={`${letra}-${idx}`} sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            {letra}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Días del mes */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75 }}>
                      {celdasCalendarioPicker.map((celda, idx) => {
                        if (!celda) {
                          return <Box key={`picker-empty-${idx}`} sx={{ height: 40 }} />;
                        }

                        const esAnteriorAManana = celda.fechaISO < mananaISO;
                        const tieneDisponibilidad = !esAnteriorAManana && diasConDisponibilidad.has(celda.fechaISO);
                        const estaSeleccionado = !esAnteriorAManana && diaSeleccionado === celda.fechaISO;

                        return (
                          <Button
                            key={celda.fechaISO}
                            disabled={!tieneDisponibilidad}
                            onClick={() => {
                              setDiaSeleccionado(celda.fechaISO);
                              setForm((prev) => ({ ...prev, idSlot: '' }));
                            }}
                            sx={{
                              minWidth: 0,
                              height: 40,
                              borderRadius: 2,
                              fontWeight: tieneDisponibilidad ? 700 : 400,
                              bgcolor: estaSeleccionado ? '#7a203a' : tieneDisponibilidad ? '#f3e8eb' : 'transparent',
                              color: estaSeleccionado ? '#ffffff' : tieneDisponibilidad ? '#7a203a' : 'text.disabled',
                              '&:hover': {
                                bgcolor: estaSeleccionado ? '#63182e' : tieneDisponibilidad ? '#e8d5da' : 'transparent'
                              },
                              '&.Mui-disabled': {
                                color: 'text.disabled',
                                bgcolor: 'transparent'
                              }
                            }}
                          >
                            {celda.dia}
                          </Button>
                        );
                      })}
                    </Box>
                  </Grid>

                  {/* Columna Derecha: Horarios del día seleccionado */}
                  <Grid item xs={12} md={6}>
                    {!diaSeleccionado ? (
                      <Typography variant="body1" color="text.secondary" sx={{ pt: 1 }}>
                        {diasConDisponibilidad.size === 0
                          ? 'El terapeuta asignado no tiene horarios disponibles registrados.'
                          : 'Elige un día marcado en el calendario.'}
                      </Typography>
                    ) : (
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                          {`Horarios del ${formatearFechaLarga(diaSeleccionado)}`}
                        </Typography>

                        <Grid container spacing={1.25}>
                          {horariosDelDiaSeleccionado.map((slot) => {
                            const seleccionado = Number(form.idSlot) === Number(slot.idSlot);
                            const horaInicio = slot.inicio?.split('T')[1]?.slice(0, 5) || '';

                            return (
                              <Grid item xs={4} sm={3} key={slot.idSlot}>
                                <Button
                                  fullWidth
                                  variant={seleccionado ? 'contained' : 'outlined'}
                                  onClick={() => setForm((prev) => ({ ...prev, idSlot: slot.idSlot }))}
                                  sx={{
                                    py: 1,
                                    borderRadius: 2,
                                    fontWeight: 600,
                                    borderColor: seleccionado ? '#7a203a' : 'divider',
                                    bgcolor: seleccionado ? '#7a203a' : '#fff',
                                    color: seleccionado ? '#fff' : 'text.primary',
                                    '&:hover': {
                                      bgcolor: seleccionado ? '#63182e' : '#f3e8eb',
                                      borderColor: '#7a203a'
                                    }
                                  }}
                                >
                                  {horaInicio}
                                </Button>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              )}

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
            <Button type="submit" variant="contained" disabled={!form.idSlot}>
              Agendar Cita
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </MainCard>
  );
}
