import { useState, useEffect, useMemo } from 'react';
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
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconEdit,
  IconRefresh,
  IconTrash,
  IconUserPlus
} from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

// Forma en que se generan los hroarios
const HORAS_INICIO_24H = Array.from({ length: 12 }, (_, i) => `${String(i + 9).padStart(2, '0')}:00`);

// Calcula la hora de fin exactamente 1 hora después en formato 24 horas
const calcularHoraFin24H = (horaInicio) => {
  if (!horaInicio || !horaInicio.includes(':')) return '';
  const [hStr, mStr] = horaInicio.split(':');
  const hFin = Number(hStr) + 1;
  return `${String(hFin).padStart(2, '0')}:${mStr}`;
};

// Obtiene fecha local YYYY-MM-DD
const obtenerFechaLocalISO = (fecha = new Date()) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Obtiene la fecha de mañana en formato YYYY-MM-DD
const obtenerMananaLocalISO = () => {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  return obtenerFechaLocalISO(manana);
};

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

// Ordena los horarios cronológicamente por fecha y hora de inicio
const ordenarSlotsPorFechaYHora = (lista) =>
  [...lista].sort((a, b) => {
    const fechaA = a.fecha?.split('T')[0] || '';
    const fechaB = b.fecha?.split('T')[0] || '';
    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
    const inicioA = a.inicio?.split('T')[1] || '';
    const inicioB = b.inicio?.split('T')[1] || '';
    return inicioA.localeCompare(inicioB);
  });

// Formatea YYYY-MM-DD como "jueves 19 de noviembre de 2026"
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

// Genera las celdas de un mes (Lunes a Domingo)
const generarCeldasMes = (anio, mes) => {
  const primerDia = new Date(anio, mes, 1);
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

export default function Terapeutas() {
  const navigate = useNavigate();
  const usuarioActual = JSON.parse(localStorage.getItem('usuario') || 'null');
  const esRecepcionista = usuarioActual?.rol === 'recepcionista';
  const mananaISO = obtenerMananaLocalISO();

  const [terapeutas, setTerapeutas] = useState([]);
  const [slots, setSlots] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Estados para el calendario interactivo de horarios
  const [filtroSlotTerapeuta, setFiltroSlotTerapeuta] = useState('');
  const [filtroSlotEstado, setFiltroSlotEstado] = useState('TODOS');
  const [mesCalendarioSlots, setMesCalendarioSlots] = useState(() => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return { anio: manana.getFullYear(), mes: manana.getMonth() };
  });
  const [diaSlotSeleccionado, setDiaSlotSeleccionado] = useState('');
  const [anioMinSlots, mesMinSlots] = mananaISO.split('-').map(Number);
  const esPrimerMesPermitido =
    mesCalendarioSlots.anio < anioMinSlots || (mesCalendarioSlots.anio === anioMinSlots && mesCalendarioSlots.mes <= mesMinSlots - 1);

  // Modal Registro de Terapeuta
  const [openRegistro, setOpenRegistro] = useState(false);
  const [formTerapeuta, setFormTerapeuta] = useState({
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

  // Modal Agregar Horario Disponible (predeterminado a mañana y bloques de 1 hora en 24h)
  const [openSlot, setOpenSlot] = useState(false);
  const [formSlot, setFormSlot] = useState({
    idTerapeuta: '',
    fecha: obtenerMananaLocalISO(),
    inicio: '09:00'
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
      if (resSlots.ok) {
        const dataSlots = await resSlots.json();
        const filtradosInicial = ordenarSlotsPorFechaYHora(
          dataSlots.filter((s) => {
            const fechaSlot = s.fecha?.split('T')[0] || '';
            const terapeutaActivo = s.terapeuta?.activo !== false && s.terapeuta?.activo !== 0;
            return fechaSlot >= mananaISO && terapeutaActivo;
          })
        );
        setSlots(filtradosInicial);

        if (filtradosInicial.length > 0 && !diaSlotSeleccionado) {
          const primeraFecha = filtradosInicial[0].fecha?.split('T')[0];
          if (primeraFecha) {
            const [anioStr, mesStr] = primeraFecha.split('-');
            setMesCalendarioSlots({ anio: Number(anioStr), mes: Number(mesStr) - 1 });
            setDiaSlotSeleccionado(primeraFecha);
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar terapeutas:', error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleRegistrarTerapeuta = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    const telefonoLimpio = formTerapeuta.contactoTelefonico.replace(/\D/g, '');
    if (telefonoLimpio.length !== 10) {
      setMensaje({ tipo: 'error', texto: 'El teléfono debe tener exactamente 10 dígitos.' });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rol: 'terapeuta',
          nombre: formTerapeuta.nombre.trim().toUpperCase(),
          aPaterno: formTerapeuta.aPaterno.trim().toUpperCase(),
          aMaterno: formTerapeuta.aMaterno.trim().toUpperCase(),
          especialidad: formTerapeuta.especialidad.trim().toUpperCase(),
          contactoTelefonico: telefonoLimpio,
          contrasena: formTerapeuta.contrasena
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'Error al registrar terapeuta' });
        return;
      }

      setMensaje({
        tipo: 'success',
        texto: `Terapeuta registrado correctamente. Usuario generado: ${data.nombreUsuario}`
      });
      setOpenRegistro(false);
      setFormTerapeuta({
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
    const confirmado = window.confirm(`¿DESEA DAR DE BAJA AL TERAPEUTA ${formatearNombre(terapeuta)}?`);
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
      if (Number(filtroSlotTerapeuta) === Number(terapeuta.idTerapeuta)) {
        setFiltroSlotTerapeuta('');
      }
      await cargarDatos();
      cargarDatos();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al dar de baja al terapeuta' });
    }
  };

  const handleReactivarTerapeuta = async (terapeuta) => {
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

  const abrirModalNuevoSlot = () => {
    setFormSlot({
      idTerapeuta: '',
      fecha: obtenerMananaLocalISO(),
      inicio: '09:00'
    });
    setOpenSlot(true);
  };

  const handleCrearSlot = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    const fechaMinima = obtenerMananaLocalISO();
    if (!formSlot.fecha || formSlot.fecha < fechaMinima) {
      setMensaje({
        tipo: 'error',
        texto: 'Solo puedes registrar horarios a partir de mañana (no en el día actual ni fechas pasadas).'
      });
      return;
    }

    const horaFinCalculada = calcularHoraFin24H(formSlot.inicio);

    try {
      const res = await fetch(`${API_URL}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idTerapeuta: formSlot.idTerapeuta,
          fecha: formSlot.fecha,
          inicio: formSlot.inicio,
          fin: horaFinCalculada
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo registrar el horario' });
        return;
      }

      setMensaje({
        tipo: 'success',
        texto: `Horario disponible agregado (${formSlot.inicio} - ${horaFinCalculada})`
      });
      setOpenSlot(false);

      const [anioStr, mesStr] = formSlot.fecha.split('-');
      setMesCalendarioSlots({ anio: Number(anioStr), mes: Number(mesStr) - 1 });
      setDiaSlotSeleccionado(formSlot.fecha);

      cargarDatos();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al registrar horario' });
    }
  };

  const handleEliminarSlot = async (idSlot) => {
    const confirmado = window.confirm('¿Deseas eliminar este horario disponible?');
    if (!confirmado) return;

    setMensaje({ tipo: '', texto: '' });
    try {
      const res = await fetch(`${API_URL}/slots/${idSlot}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo eliminar el horario' });
        return;
      }

      setMensaje({ tipo: 'success', texto: 'Horario eliminado correctamente' });
      cargarDatos();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al eliminar horario' });
    }
  };

  const handleCambiarFiltroTerapeuta = (idTerapeutaSeleccionado) => {
    setFiltroSlotTerapeuta(idTerapeutaSeleccionado);

    const slotsDelFiltro = ordenarSlotsPorFechaYHora(
      slots.filter((s) => {
        const fechaSlot = s.fecha?.split('T')[0] || '';
        if (!fechaSlot || fechaSlot < mananaISO) return false;

        const esDisponible = Boolean(s.estado);
        const coincideTerapeuta = !idTerapeutaSeleccionado || Number(s.idTerapeuta) === Number(idTerapeutaSeleccionado);
        const coincideEstado =
          filtroSlotEstado === 'TODOS' ||
          (filtroSlotEstado === 'DISPONIBLES' && esDisponible) ||
          (filtroSlotEstado === 'OCUPADOS' && !esDisponible);
        return coincideTerapeuta && coincideEstado;
      })
    );

    if (slotsDelFiltro.length > 0) {
      const primeraFecha = slotsDelFiltro[0].fecha?.split('T')[0];
      if (primeraFecha) {
        const [anioStr, mesStr] = primeraFecha.split('-');
        setMesCalendarioSlots({ anio: Number(anioStr), mes: Number(mesStr) - 1 });
        setDiaSlotSeleccionado(primeraFecha);
      }
    } else {
      setDiaSlotSeleccionado('');
    }
  };

  const cambiarMesSlots = (delta) => {
    setMesCalendarioSlots((prev) => {
      const nuevaFecha = new Date(prev.anio, prev.mes + delta, 1);
      return { anio: nuevaFecha.getFullYear(), mes: nuevaFecha.getMonth() };
    });
  };

  const terapeutasActivos = terapeutas.filter((t) => Boolean(t.activo));
  const terapeutasInactivos = terapeutas.filter((t) => !Boolean(t.activo));

  // Horarios filtrados (disponibles únicamente a partir de mañana) y ordenados cronológicamente
  const slotsFiltrados = useMemo(
    () =>
      ordenarSlotsPorFechaYHora(
        slots.filter((s) => {
          const fechaSlot = s.fecha?.split('T')[0] || '';
          const terapeutaActivo = s.terapeuta?.activo !== false && s.terapeuta?.activo !== 0;
          if (!fechaSlot || fechaSlot < mananaISO || !terapeutaActivo) return false;

          const esDisponible = Boolean(s.estado);
          const coincideTerapeuta = !filtroSlotTerapeuta || Number(s.idTerapeuta) === Number(filtroSlotTerapeuta);
          const coincideEstado =
            filtroSlotEstado === 'TODOS' ||
            (filtroSlotEstado === 'DISPONIBLES' && esDisponible) ||
            (filtroSlotEstado === 'OCUPADOS' && !esDisponible);
          return coincideTerapeuta && coincideEstado;
        })
      ),
    [slots, filtroSlotTerapeuta, filtroSlotEstado, mananaISO]
  );

  const diasConSlots = useMemo(() => {
    const mapaConteo = new Map();
    slotsFiltrados.forEach((s) => {
      const fechaKey = s.fecha?.split('T')[0];
      if (fechaKey) {
        mapaConteo.set(fechaKey, (mapaConteo.get(fechaKey) || 0) + 1);
      }
    });
    return mapaConteo;
  }, [slotsFiltrados]);

  const slotsDelDiaSeleccionado = useMemo(() => {
    if (!diaSlotSeleccionado) return [];
    return slotsFiltrados.filter((s) => s.fecha?.split('T')[0] === diaSlotSeleccionado);
  }, [slotsFiltrados, diaSlotSeleccionado]);

  const celdasCalendarioSlots = useMemo(() => generarCeldasMes(mesCalendarioSlots.anio, mesCalendarioSlots.mes), [mesCalendarioSlots]);

  return (
    <MainCard
      title="Terapeutas y Disponibilidad"
      secondary={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" color="primary" startIcon={<IconClock size={18} />} onClick={abrirModalNuevoSlot}>
            Agregar Horario
          </Button>
          {esRecepcionista && (
            <Button variant="contained" color="primary" startIcon={<IconUserPlus size={18} />} onClick={() => setOpenRegistro(true)}>
              Registrar Terapeuta
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
          Inicia sesión con una cuenta vinculada como <strong>Recepcionista</strong> para habilitar el alta de nuevos terapeutas.
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

      {/* Calendario de Horarios de Disponibilidad */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Typography variant="h4">Horarios de Disponibilidad Registrados</Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            select
            size="small"
            label="Terapeuta"
            value={filtroSlotTerapeuta}
            onChange={(e) => handleCambiarFiltroTerapeuta(e.target.value)}
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="">TODOS LOS TERAPEUTAS</MenuItem>
            {terapeutasActivos.map((t) => (
              <MenuItem key={t.idTerapeuta} value={t.idTerapeuta}>
                {formatearNombre(t)}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={0.5}>
            {['TODOS', 'DISPONIBLES', 'OCUPADOS'].map((estado) => (
              <Chip
                key={estado}
                label={estado}
                clickable
                color={filtroSlotEstado === estado ? 'primary' : 'default'}
                variant={filtroSlotEstado === estado ? 'filled' : 'outlined'}
                onClick={() => setFiltroSlotEstado(estado)}
              />
            ))}
          </Stack>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Grid container spacing={3} alignItems="flex-start">
          {/* Calendario Mensual */}
          <Grid item xs={12} md={5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, px: 1 }}>
              <IconButton size="small" disabled={esPrimerMesPermitido} onClick={() => cambiarMesSlots(-1)}>
                <IconChevronLeft size={18} />
              </IconButton>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {`${MESES_ES[mesCalendarioSlots.mes]} ${mesCalendarioSlots.anio}`}
              </Typography>
              <IconButton size="small" onClick={() => cambiarMesSlots(1)}>
                <IconChevronRight size={18} />
              </IconButton>
            </Stack>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75, mb: 1 }}>
              {DIAS_SEMANA_CORTO.map((letra, idx) => (
                <Box key={`${letra}-${idx}`} sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    {letra}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75 }}>
              {celdasCalendarioSlots.map((celda, idx) => {
                if (!celda) {
                  return <Box key={`slot-empty-${idx}`} sx={{ height: 42 }} />;
                }

                const esAnteriorAManana = celda.fechaISO < mananaISO;
                const cantidadHorarios = esAnteriorAManana ? 0 : diasConSlots.get(celda.fechaISO) || 0;
                const tieneHorarios = !esAnteriorAManana && cantidadHorarios > 0;
                const estaSeleccionado = !esAnteriorAManana && diaSlotSeleccionado === celda.fechaISO;

                return (
                  <Tooltip
                    key={celda.fechaISO}
                    title={tieneHorarios ? `${cantidadHorarios} horario(s) registrado(s)` : 'Sin horarios registrados'}
                    arrow
                  >
                    <span>
                      <Button
                        fullWidth
                        disabled={!tieneHorarios}
                        onClick={() => setDiaSlotSeleccionado(celda.fechaISO)}
                        sx={{
                          minWidth: 0,
                          height: 42,
                          borderRadius: 2,
                          fontWeight: tieneHorarios ? 700 : 400,
                          bgcolor: estaSeleccionado ? 'primary.main' : tieneHorarios ? 'primary.lighter' : 'transparent',
                          color: estaSeleccionado ? 'primary.contrastText' : tieneHorarios ? 'primary.dark' : 'text.disabled',
                          '&:hover': {
                            bgcolor: estaSeleccionado ? 'primary.dark' : tieneHorarios ? 'primary.light' : 'transparent'
                          },
                          '&.Mui-disabled': {
                            color: 'text.disabled',
                            bgcolor: 'transparent'
                          }
                        }}
                      >
                        {celda.dia}
                      </Button>
                    </span>
                  </Tooltip>
                );
              })}
            </Box>
          </Grid>

          {/* Columna Derecha: Horarios del día seleccionado ordenados cronológicamente (24h) */}
          <Grid item xs={12} md={7}>
            {slotsFiltrados.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No hay horarios registrados a partir de mañana con los filtros seleccionados. Usa &quot;Agregar Horario&quot; para
                  habilitar bloques de 1 hora.
                </Typography>
              </Box>
            ) : !diaSlotSeleccionado || slotsDelDiaSeleccionado.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Elige un día marcado en el calendario para consultar los horarios ordenados por fecha y hora.
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                  {`Horarios del ${formatearFechaLarga(diaSlotSeleccionado)}`}
                </Typography>

                <Grid container spacing={1.5}>
                  {slotsDelDiaSeleccionado.map((s) => {
                    const disponible = Boolean(s.estado);
                    const horaInicio = s.inicio?.split('T')[1]?.slice(0, 5) || '';
                    const horaFin = s.fin?.split('T')[1]?.slice(0, 5) || '';

                    return (
                      <Grid item xs={12} sm={6} key={s.idSlot}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: disponible ? 'success.main' : 'divider',
                            bgcolor: disponible ? 'success.lighter' : 'action.hover'
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <IconClock size={16} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {`${horaInicio} - ${horaFin}`}
                              </Typography>
                            </Stack>

                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Chip label={disponible ? 'DISPONIBLE' : 'OCUPADO'} color={disponible ? 'success' : 'default'} size="small" />
                              {disponible && (
                                <Tooltip title="Eliminar horario">
                                  <IconButton size="small" color="error" onClick={() => handleEliminarSlot(s.idSlot)}>
                                    <IconTrash size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </Stack>

                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {formatearNombre(s.terapeuta)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>
                            {(s.terapeuta?.especialidad || '').toUpperCase()}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Modal: Registrar Nuevo Terapeuta */}
      <Dialog open={openRegistro} onClose={() => setOpenRegistro(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleRegistrarTerapeuta}>
          <DialogTitle>Registrar nuevo terapeuta</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Nombre(s)"
                  inputProps={{ maxLength: 60 }}
                  value={formTerapeuta.nombre}
                  onChange={(e) => setFormTerapeuta({ ...formTerapeuta, nombre: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Apellido Paterno"
                  inputProps={{ maxLength: 60 }}
                  value={formTerapeuta.aPaterno}
                  onChange={(e) => setFormTerapeuta({ ...formTerapeuta, aPaterno: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Apellido Materno"
                  inputProps={{ maxLength: 60 }}
                  value={formTerapeuta.aMaterno}
                  onChange={(e) => setFormTerapeuta({ ...formTerapeuta, aMaterno: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Teléfono"
                  inputProps={{ maxLength: 13 }}
                  value={formTerapeuta.contactoTelefonico}
                  onChange={(e) => setFormTerapeuta({ ...formTerapeuta, contactoTelefonico: formatearTelefono(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Especialidad"
                  inputProps={{ maxLength: 30 }}
                  value={formTerapeuta.especialidad}
                  onChange={(e) => setFormTerapeuta({ ...formTerapeuta, especialidad: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  type="password"
                  label="Contraseña"
                  inputProps={{ maxLength: 30 }}
                  value={formTerapeuta.contrasena}
                  onChange={(e) => setFormTerapeuta({ ...formTerapeuta, contrasena: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenRegistro(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Guardar Terapeuta
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

      {/* Agregar Horario Disponible permitiendo fechas a partir del día siguiente */}
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
                inputProps={{ min: mananaISO }}
                value={formSlot.fecha}
                onChange={(e) => setFormSlot({ ...formSlot, fecha: e.target.value })}
              />

              <TextField
                select
                fullWidth
                required
                label="Hora de Inicio"
                value={formSlot.inicio}
                onChange={(e) => setFormSlot({ ...formSlot, inicio: e.target.value })}
              >
                {HORAS_INICIO_24H.map((hora) => (
                  <MenuItem key={hora} value={hora}>
                    {hora}
                  </MenuItem>
                ))}
              </TextField>

              <TextField fullWidth disabled label="Hora de Fin" value={calcularHoraFin24H(formSlot.inicio)} />
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
