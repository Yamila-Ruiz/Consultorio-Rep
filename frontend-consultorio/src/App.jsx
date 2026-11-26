import { Fragment, useEffect, useMemo, useState } from 'react'
import api from './services/api'
import './App.css'

const BRAND = 'Consultorio Eli Ruiz & Cía.'
const EMPTY_DATA = {
  citas: [],
  pacientes: [],
  servicios: [],
  pagos: [],
  terapeutas: [],
  slots: [],
}

const NAV_ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'citas', label: 'Citas', icon: 'calendar' },
  { id: 'pacientes', label: 'Pacientes', icon: 'people' },
  { id: 'servicios', label: 'Servicios', icon: 'heart' },
  { id: 'pagos', label: 'Pagos', icon: 'wallet' },
  { id: 'facturacion', label: 'Facturación', icon: 'receipt' },
  { id: 'terapeutas', label: 'Terapeutas', icon: 'therapist' },
]

const STATUSES = ['AGENDADA', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'INASISTENCIA']
const ALLOWED_PAGES = {
  recepcionista: NAV_ITEMS.map((item) => item.id),
  terapeuta: ['inicio', 'citas', 'pacientes'],
}

function Icon({ name, size = 20 }) {
  const paths = {
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-7h6v7" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h3" /></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6" /></>,
    heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /><path d="M3 12h5l2-3 3 6 2-3h6" /></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="2" /><path d="M3 9V5a2 2 0 0 1 2-2h14M16 14h5M16 14a1 1 0 1 0 0 .1" /></>,
    receipt: <><path d="M5 3h11l4 4v14H5z" /><path d="M15 3v5h5M8 12h8M8 16h8" /></>,
    therapist: <><circle cx="10" cy="7" r="4" /><path d="M3 21v-2a7 7 0 0 1 11-5.7M16 19l2 2 4-5" /></>,
    restore: <><path d="M3 11a9 9 0 1 1 2.6 6.4" /><path d="M3 4v7h7" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    edit: <><path d="m4 16.5-.8 4.3 4.3-.8L20 7.5 16.5 4 4 16.5Z" /><path d="m14.8 5.7 3.5 3.5" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3-.5" /></>,
    alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>,
  }
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.home}
    </svg>
  )
}

function displayName(person) {
  if (!person) return '—'
  return [person.nombre, person.aPaterno, person.aMaterno].filter(Boolean).join(' ')
}

function dateISO(value) {
  return value ? String(value).slice(0, 10) : '—'
}

function timeLabel(value) {
  if (!value) return '—'
  const text = String(value)
  const time = text.match(/^(\d{2}:\d{2})/)
  if (time) return time[1]
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toISOString().slice(11, 16)
}

function fullName(person) {
  return person ? displayName(person) : '—'
}

function StatusBadge({ children, tone }) {
  const normalized = String(children || '').toLowerCase().replaceAll(' ', '-')
  return <span className={`status-badge ${tone || normalized}`}>{children}</span>
}

function Login({ onLogin, error, busy }) {
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ nombreUsuario: '', contrasena: '' })
  const submit = (event) => {
    event.preventDefault()
    onLogin(form)
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1 className="brand-title">{BRAND}</h1>
        <h2>Iniciar Sesión</h2>
        <p className="login-subtitle">Ingresa tus credenciales para acceder al sistema</p>
        {error && (
          <div className="alert alert-error" role="alert">
            <Icon name="alert" size={18} />
            <span>{error}</span>
          </div>
        )}
        <label className="login-input">
          <span className="sr-only">Nombre de usuario</span>
          <input
            autoComplete="username"
            placeholder="Nombre de usuario"
            required
            value={form.nombreUsuario}
            onChange={(event) => setForm((current) => ({ ...current, nombreUsuario: event.target.value }))}
          />
        </label>
        <label className="login-input password-input">
          <span className="sr-only">Contraseña</span>
          <input
            autoComplete="current-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Contraseña"
            required
            value={form.contrasena}
            onChange={(event) => setForm((current) => ({ ...current, contrasena: event.target.value }))}
          />
          <button type="button" className="password-toggle" aria-label="Mostrar u ocultar contraseña" onClick={() => setShowPassword((value) => !value)}>
            <Icon name={showPassword ? 'eye' : 'eyeOff'} size={18} />
          </button>
        </label>
        <button className="primary-button login-submit" type="submit" disabled={busy}>
          {busy ? 'Procesando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('consultorio-session') || 'null')
    } catch {
      return null
    }
  })
  const [page, setPage] = useState('inicio')
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [modal, setModal] = useState(null)
  const [collapsed, setCollapsed] = useState(false)

  const allowedPages = ALLOWED_PAGES[user?.rol] || []
  const currentPage = NAV_ITEMS.find((item) => item.id === page) || NAV_ITEMS[0]

  async function loadData() {
    setLoading(true)
    const endpoints = Object.keys(EMPTY_DATA)
    const results = await Promise.allSettled(endpoints.map((endpoint) => api.get(`/${endpoint}`)))
    const next = {}
    const failures = []
    results.forEach((result, index) => {
      const endpoint = endpoints[index]
      if (result.status === 'fulfilled') {
        next[endpoint] = Array.isArray(result.value) ? result.value : []
      } else {
        next[endpoint] = data[endpoint]
        failures.push(result.reason.message)
      }
    })
    setData((current) => ({ ...current, ...next }))
    setError(failures.length ? failures[0] : '')
    setLoading(false)
  }

  useEffect(() => {
    if (user) loadData()
    // Load once per authenticated session; mutations refresh explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.idUsuario])

  async function authenticate(form) {
    setAuthBusy(true)
    setError('')
    try {
      const result = await api.post('/auth/login', {
        nombreUsuario: form.nombreUsuario.trim().toUpperCase(),
        contrasena: form.contrasena,
      })
      const session = result.usuario || result
      localStorage.setItem('consultorio-session', JSON.stringify(session))
      setUser(session)
      setPage('inicio')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setAuthBusy(false)
    }
  }

  function logout() {
    localStorage.removeItem('consultorio-session')
    setUser(null)
    setData(EMPTY_DATA)
    setPage('inicio')
    setError('')
  }

  function navigate(nextPage) {
    if (!allowedPages.includes(nextPage)) return
    setPage(nextPage)
    setSearch('')
    setFilter('todos')
    setError('')
  }

  async function saveRecord(event) {
    event.preventDefault()
    const { resource, record, id } = modal
    const body = Object.fromEntries(new FormData(event.currentTarget).entries())
    event.currentTarget.querySelectorAll('input[type="checkbox"][name]').forEach((checkbox) => {
      body[checkbox.name] = checkbox.checked
    })
    if (resource === 'pacientes') {
      body.edad = Number(body.edad)
      body.idTerapeuta = Number(body.idTerapeuta)
      if (!body.requiereFactura) {
        body.nombreFacturacion = 'PÚBLICO GENERAL'
        body.correoFacturacion = 'publico.general@clinica.com'
      }
    }
    if (resource === 'terapeutas') {
      body.idUsuario = record?.idUsuario
      if (!id) body.contrasena = body.contrasena || '123456'
    }
    if (resource === 'citas') {
      body.idPaciente = Number(body.idPaciente)
      body.idServicio = Number(body.idServicio)
      body.idSlot = Number(body.idSlot)
      body.esPrimeraSesion = Boolean(body.esPrimeraSesion)
      delete body.idTerapeuta
    }
    if (resource === 'pagos') {
      body.idCita = Number(body.idCita)
      body.facturacion = Boolean(body.facturacion)
    }
    if (resource === 'slots') body.idTerapeuta = Number(body.idTerapeuta)

    try {
      if (resource === 'usuarios') await api.post('/auth/registrar', body)
      else if (id) await api.put(`/${resource}/${id}`, body)
      else await api.post(`/${resource}`, body)
      setModal(null)
      setError('')
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function deleteRecord(resource, id) {
    const message = resource === 'citas'
      ? '¿Deseas cancelar esta cita? El horario quedará disponible nuevamente.'
      : resource === 'slots'
        ? '¿Deseas eliminar este horario disponible?'
        : resource === 'pagos'
          ? '¿Deseas eliminar este pago?'
          : '¿Deseas dar de baja este registro?'
    if (!window.confirm(message)) return
    try {
      await api.delete(`/${resource}/${id}`)
      setError('')
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function changeAppointmentStatus(id, estado) {
    try {
      await api.put(`/citas/${id}`, { estado })
      setError('')
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function restorePatient(id) {
    try {
      await api.put(`/pacientes/${id}`, { activo: true })
      setError('')
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function restoreRecord(resource, id) {
    try {
      await api.put(`/${resource}/${id}`, { activo: true })
      setError('')
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const pageInfo = useMemo(() => getPageInfo(page, data), [page, data])
  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    const activeListPage = ['pacientes', 'servicios', 'terapeutas'].includes(page)
    const rows = activeListPage ? pageInfo.rows.filter((row) => row.activo) : pageInfo.rows
    return rows.filter((row) => {
      const matchesSearch = !query || JSON.stringify(row).toLocaleLowerCase('es').includes(query)
      if (!matchesSearch) return false
      if (filter === 'todos') return true
      if (page === 'citas') return row.estado === filter
      if (page === 'horarios') return String(row.estado) === filter
      if (['servicios', 'terapeutas'].includes(page)) return String(row.activo) === filter
      if (page === 'facturacion') return String(row.facturacion) === filter
      return true
    })
  }, [filter, page, pageInfo.rows, search])
  const inactiveRows = useMemo(() => {
    if (!['pacientes', 'servicios', 'terapeutas'].includes(page)) return []
    const query = search.trim().toLocaleLowerCase('es')
    return pageInfo.rows.filter((row) => {
      return !row.activo && (!query || JSON.stringify(row).toLocaleLowerCase('es').includes(query))
    })
  }, [page, pageInfo.rows, search])

  if (!user) return <Login onLogin={authenticate} error={error} busy={authBusy} />

  const canEdit = user.rol === 'recepcionista'
  const showActions = canEdit && pageInfo.actions
  const openNew = (resource = page) => {
    setError('')
    setModal({ resource, id: null })
  }

  return (
    <div className={`app-shell ${collapsed ? 'menu-collapsed' : ''}`}>
      <header className="topbar">
        <button className="icon-button menu-button" type="button" aria-label="Alternar menú" onClick={() => setCollapsed((value) => !value)}>
          <Icon name="menu" size={21} />
        </button>
        <button className="brand-button" type="button" onClick={() => navigate('inicio')}>{BRAND}</button>
        <div className="topbar-right">
          <button className="logout-button" type="button" onClick={logout}>
            <Icon name="logout" size={18} /><span>Cerrar sesión</span>
          </button>
        </div>
      </header>

      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <p className="sidebar-heading">Consultorio</p>
        <nav className="side-nav" aria-label="Navegación principal">
          {NAV_ITEMS.filter((item) => allowedPages.includes(item.id)).map((item) => (
            <button key={item.id} className={`nav-link ${page === item.id ? 'active' : ''}`} type="button" onClick={() => navigate(item.id)} title={item.label}>
              <Icon name={item.icon} size={20} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="storage-card">
          <div className="storage-icon"><Icon name="receipt" size={22} /></div>
          <div><strong>Datos en vivo</strong><small>Información del consultorio</small></div>
          <div className="storage-summary">
            <span>{data.pacientes.filter((patient) => patient.activo).length} pacientes activos</span>
            <span>{data.slots.filter((slot) => slot.estado).length} horarios disponibles</span>
          </div>
        </div>
        <div className="version-pill">v5.1.0</div>
      </aside>

      <main className="workspace">
        <div className="breadcrumb-bar">
          <strong>{currentPage.label}</strong>
          <div className="breadcrumbs"><Icon name="home" size={15} /><span>›</span><span>{currentPage.label}</span></div>
        </div>

        <section className={`content-card page-${page}`}>
          {page === 'inicio' ? (
            <>
              <Dashboard user={user} data={data} onNavigate={navigate} />
              {error && <div className="alert alert-error page-alert dashboard-alert" role="alert"><Icon name="alert" size={18} /><span>{error}</span><button type="button" className="alert-close" aria-label="Cerrar aviso" onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}
            </>
          ) : (
            <>
              <div className="content-heading">
                <div>
                  <h1>{pageInfo.title || currentPage.label}</h1>
                </div>
                <div className="heading-actions">
                  {canEdit && page === 'terapeutas' ? (
                    <>
                      <button className="secondary-button" type="button" onClick={() => openNew('slots')}><Icon name="clock" size={16} />Agregar Horario</button>
                      <button className="primary-button" type="button" onClick={() => openNew('usuarios')}><Icon name="people" size={16} />Registrar Usuario</button>
                    </>
                  ) : canEdit && pageInfo.create ? (
                    <button className="primary-button" type="button" onClick={() => openNew(pageInfo.resource)}><Icon name={page === 'citas' ? 'calendar' : 'plus'} size={17} />{pageInfo.create}</button>
                  ) : null}
                  {page !== 'facturacion' && <button className="secondary-button home-button" type="button" onClick={() => navigate('inicio')}>← Inicio</button>}
                </div>
              </div>
              {error && <div className="alert alert-error page-alert" role="alert"><Icon name="alert" size={18} /><span>{error}</span><button type="button" className="alert-close" aria-label="Cerrar aviso" onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}
              {page === 'pacientes' && (
                <div className="table-toolbar">
                  <label className="search-control patient-search">
                    <Icon name="search" size={18} />
                    <input aria-label="Buscar pacientes" placeholder="Buscar paciente por nombre, apellidos, código o teléfono..." value={search} onChange={(event) => setSearch(event.target.value)} />
                  </label>
                </div>
              )}
              {['pacientes', 'servicios', 'terapeutas'].includes(page) && (
                <h2 className="table-section-title">{page === 'pacientes' ? 'Pacientes activos' : page === 'servicios' ? 'Servicios activos' : 'Catálogo de Terapeutas'}</h2>
              )}
              {((page === 'pagos' || page === 'facturacion') && !visibleRows.length) ? (
                <div className="empty-copy">
                  {page === 'pagos' ? 'No hay pagos registrados.' : 'No hay pagos con facturación requerida.'}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr>{pageInfo.columns.map((column) => <th key={column.label}>{column.label}</th>)}{showActions && <th className="actions-heading">Acciones</th>}</tr></thead>
                    <tbody>
                      {visibleRows.map((row) => (
                        <tr key={row[pageInfo.key]}>
                          {pageInfo.columns.map((column) => (
                            <td key={column.label}>
                              {page === 'citas' && column.label === 'Estado' && canEdit && row.estado !== 'CANCELADA'
                                ? <select aria-label={`Cambiar estado de cita ${row.idCita}`} className={`inline-status-select ${row.estado.toLowerCase()}`} value={row.estado} onChange={(event) => changeAppointmentStatus(row.idCita, event.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                                : column.render(row)}
                            </td>
                          ))}
                          {showActions && (
                            <td className="row-actions">
                              <button className="row-icon-button" type="button" title="Editar" aria-label="Editar" onClick={() => setModal({ resource: pageInfo.resource, id: row[pageInfo.key], record: row })}><Icon name="edit" size={17} /></button>
                              <button className="row-icon-button danger" type="button" title="Dar de baja" aria-label="Dar de baja" onClick={() => deleteRecord(pageInfo.resource, row[pageInfo.key])}><Icon name="trash" size={17} /></button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {!visibleRows.length && <tr><td className="empty-state" colSpan={pageInfo.columns.length + (showActions ? 1 : 0)}>{loading ? 'Cargando información…' : search ? 'No hay resultados para la búsqueda.' : 'No hay registros para mostrar.'}</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
              {['pacientes', 'servicios', 'terapeutas'].includes(page) && (
                <section className="inactive-patients-section" aria-labelledby="inactive-records-title">
                  <div className="inactive-section-heading">
                    <h2 id="inactive-records-title">{page === 'pacientes' ? 'Pacientes inactivos' : page === 'servicios' ? 'Servicios dados de baja' : 'Terapeutas dados de baja'}</h2>
                    <span>{inactiveRows.length} {page === 'servicios' ? (inactiveRows.length === 1 ? 'servicio' : 'servicios') : page === 'terapeutas' ? (inactiveRows.length === 1 ? 'terapeuta' : 'terapeutas') : (inactiveRows.length === 1 ? 'paciente' : 'pacientes')}</span>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr>{pageInfo.columns.map((column) => <th key={column.label}>{column.label}</th>)}{canEdit && <th className="actions-heading">Acciones</th>}</tr></thead>
                      <tbody>
                        {inactiveRows.map((row) => (
                          <tr key={row[pageInfo.key]}>
                            {pageInfo.columns.map((column) => <td key={column.label}>{column.render(row)}</td>)}
                            {canEdit && (
                              <td className="row-actions">
                                {page === 'pacientes'
                                  ? <button className="restore-button" type="button" onClick={() => restorePatient(row.idPaciente)}><Icon name="restore" size={16} /><span>Reactivar</span></button>
                                  : <button className="row-icon-button restore-icon" type="button" title="Reactivar" aria-label="Reactivar" onClick={() => restoreRecord(pageInfo.resource, row[pageInfo.key])}><Icon name="restore" size={17} /></button>}
                              </td>
                            )}
                          </tr>
                        ))}
                        {!inactiveRows.length && <tr><td className="empty-state" colSpan={pageInfo.columns.length + (canEdit ? 1 : 0)}>{page === 'pacientes' ? 'No hay pacientes inactivos.' : page === 'servicios' ? 'No hay servicios dados de baja.' : 'No hay terapeutas dados de baja.'}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              {page === 'terapeutas' && (
                <section className="inactive-patients-section slots-section" aria-labelledby="slots-title">
                  <div className="inactive-section-heading"><h2 id="slots-title">Horarios de Disponibilidad Registrados</h2><span>{data.slots.length} horarios</span></div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Código</th><th>Fecha</th><th>Hora de Inicio</th><th>Hora de Fin</th><th>Terapeuta</th><th>Estado</th>{canEdit && <th>Acciones</th>}</tr></thead>
                      <tbody>
                        {data.slots.map((slot) => (
                          <tr key={slot.idSlot}>
                            <td>H-{slot.idSlot}</td><td>{dateISO(slot.fecha)}</td><td>{timeLabel(slot.inicio)}</td><td>{timeLabel(slot.fin)}</td><td>{displayName(slot.terapeuta)}</td>
                            <td><StatusBadge tone={slot.estado ? 'success' : 'muted'}>{slot.estado ? 'DISPONIBLE' : 'OCUPADO'}</StatusBadge></td>
                            {canEdit && <td className="row-actions"><button className="row-icon-button" type="button" title="Editar horario" aria-label="Editar horario" onClick={() => setModal({ resource: 'slots', id: slot.idSlot, record: slot })}><Icon name="edit" size={17} /></button><button className="row-icon-button danger" type="button" title="Eliminar horario" aria-label="Eliminar horario" onClick={() => deleteRecord('slots', slot.idSlot)}><Icon name="trash" size={17} /></button></td>}
                          </tr>
                        ))}
                        {!data.slots.length && <tr><td className="empty-state" colSpan={canEdit ? 7 : 6}>No hay horarios registrados.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </section>
        <footer className="footer"><span>© Consultorio Eli Ruiz & Cía.</span><span>Administración de consultorio</span></footer>
      </main>
      {modal && <RecordModal modal={modal} data={data} error={error} onClose={() => setModal(null)} onSubmit={saveRecord} />}
    </div>
  )
}

function Dashboard({ user, data, onNavigate }) {
  const cards = [
    { page: 'citas', label: 'Citas', icon: 'calendar', count: data.citas.length },
    { page: 'pacientes', label: 'Pacientes', icon: 'people', count: data.pacientes.filter((patient) => patient.activo).length },
    { page: 'servicios', label: 'Servicios', icon: 'heart', count: data.servicios.filter((service) => service.activo).length },
    { page: 'pagos', label: 'Pagos', icon: 'wallet', count: data.pagos.length },
    { page: 'facturacion', label: 'Facturación', icon: 'receipt', count: data.pagos.filter((payment) => payment.facturacion).length },
    { page: 'terapeutas', label: 'Terapeutas', icon: 'therapist', count: data.terapeutas.filter((therapist) => therapist.activo).length },
  ].filter((card) => ALLOWED_PAGES[user.rol]?.includes(card.page))

  return (
    <>
      <div className="content-heading dashboard-title"><h1>Inicio</h1></div>
      <div className="dashboard-body">
        <div className="welcome-line"><strong>USUARIO: {user.nombreUsuario}</strong><StatusBadge tone="role-badge">{user.rol.toUpperCase()}</StatusBadge></div>
        <div className="dashboard-grid">
          {cards.map((card) => (
            <button className="dashboard-link" type="button" key={card.page} onClick={() => onNavigate(card.page)}>
              <Icon name={card.icon} size={22} /><span>{card.label}</span><small>{card.count}</small>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function getPageInfo(page, data) {
  const therapistName = (row) => fullName(row.terapeuta)
  const appointmentSlot = (row) => row.slotdisponibilidad
  const base = {
    inicio: { rows: [], columns: [], searchLabel: '' },
    pacientes: {
      title: 'Catálogo de Pacientes', resource: 'pacientes', key: 'idPaciente', rows: data.pacientes, create: 'Nuevo Paciente', actions: true, searchLabel: 'pacientes',
      columns: [
        { label: 'Código', render: (row) => `P-${row.idPaciente}` },
        { label: 'Nombre(s)', render: (row) => row.nombre },
        { label: 'Apellido Paterno', render: (row) => row.aPaterno },
        { label: 'Apellido Materno', render: (row) => row.aMaterno },
        { label: 'Edad', render: (row) => row.edad },
        { label: 'Teléfono', render: (row) => row.contactoTelefonico },
      ],
    },
    terapeutas: {
      title: 'Terapeutas y Disponibilidad', resource: 'terapeutas', key: 'idTerapeuta', rows: data.terapeutas, create: 'Registrar Usuario', actions: true, searchLabel: 'terapeutas', slots: data.slots,
      columns: [
        { label: 'Código', render: (row) => `T-${row.idTerapeuta}` },
        { label: 'Nombre(s)', render: (row) => row.nombre },
        { label: 'Apellido Paterno', render: (row) => row.aPaterno },
        { label: 'Apellido Materno', render: (row) => row.aMaterno },
        { label: 'Especialidad', render: (row) => row.especialidad },
        { label: 'Teléfono', render: (row) => row.contactoTelefonico },
        { label: 'Usuario', render: (row) => row.usuario?.nombreUsuario || '—' },
      ],
    },
    servicios: {
      title: 'Catálogo de Servicios', resource: 'servicios', key: 'idServicio', rows: data.servicios, create: 'Nuevo Servicio', actions: true, searchLabel: 'servicios',
      columns: [
        { label: 'Código', render: (row) => `S-${row.idServicio}` },
        { label: 'Nombre del Servicio', render: (row) => row.nombre },
        { label: 'Descripción', render: (row) => row.descripcion || '—' },
        { label: 'Estado', render: (row) => <StatusBadge tone={row.activo ? 'success' : 'muted'}>{row.activo ? 'Activo' : 'Inactivo'}</StatusBadge> },
      ],
    },
    citas: {
      title: 'Gestión y Agendamiento de Citas', resource: 'citas', key: 'idCita', rows: data.citas, create: 'Agendar Cita', actions: false, searchLabel: 'citas',
      columns: [
        { label: 'Código', render: (row) => `C-${row.idCita}` },
        { label: 'Fecha', render: (row) => dateISO(appointmentSlot(row)?.fecha) },
        { label: 'Hora', render: (row) => timeLabel(appointmentSlot(row)?.inicio) },
        { label: 'Paciente', render: (row) => fullName(row.paciente) },
        { label: 'Terapeuta', render: (row) => therapistName(appointmentSlot(row) || {}) },
        { label: 'Servicio', render: (row) => row.servicio?.nombre || '—' },
        { label: 'Sesión', render: (row) => row.esPrimeraSesion ? 'PRIMERA VEZ' : 'SUBSECUENTE' },
        { label: 'Estado', render: (row) => <StatusBadge>{row.estado}</StatusBadge> },
      ],
    },
    pagos: {
      title: 'Registro de Pagos', resource: 'pagos', key: 'idPago', rows: data.pagos, create: 'Registrar Pago', actions: true, searchLabel: 'pagos',
      columns: [
        { label: 'Código', render: (row) => `P-${row.idPago}` },
        { label: 'Fecha', render: (row) => dateISO(row.fecha) },
        { label: 'Paciente', render: (row) => fullName(row.cita?.paciente) },
        { label: 'Servicio', render: (row) => row.cita?.servicio?.nombre || '—' },
        { label: 'Método', render: (row) => row.metodo },
        { label: 'Facturación', render: (row) => row.facturacion ? 'Sí' : 'No' },
      ],
    },
    facturacion: {
      title: 'Facturación', resource: 'pagos', key: 'idPago', rows: data.pagos.filter((payment) => payment.facturacion), actions: false, searchLabel: 'facturas',
      columns: [
        { label: 'Código de Pago', render: (row) => `P-${row.idPago}` },
        { label: 'Fecha', render: (row) => dateISO(row.fecha) },
        { label: 'Paciente', render: (row) => fullName(row.cita?.paciente) },
        { label: 'Servicio', render: (row) => row.cita?.servicio?.nombre || '—' },
        { label: 'Nombre de Facturación', render: (row) => row.cita?.paciente?.nombreFacturacion || 'PÚBLICO GENERAL' },
        { label: 'Correo de Facturación', render: (row) => row.cita?.paciente?.correoFacturacion || '—' },
      ],
    },
  }
  return base[page] || base.inicio
}

function RecordModal({ modal, data, error, onClose, onSubmit }) {
  const { resource, record, id } = modal
  const patientFields = [
    { name: 'nombre', label: 'Nombre(s)', placeholder: 'Nombre(s) *', hideLabel: true, required: true, maxLength: 30, value: record?.nombre },
    { name: 'aPaterno', label: 'Apellido Paterno', placeholder: 'Apellido Paterno *', hideLabel: true, required: true, maxLength: 30, value: record?.aPaterno },
    { name: 'aMaterno', label: 'Apellido Materno', placeholder: 'Apellido Materno *', hideLabel: true, required: true, maxLength: 30, value: record?.aMaterno },
    { name: 'edad', label: 'Edad', placeholder: 'Edad *', hideLabel: true, type: 'number', min: 0, max: 17, required: true, value: record?.edad },
    { name: 'contactoTelefonico', label: 'Teléfono', placeholder: 'Teléfono *', hideLabel: true, type: 'tel', inputMode: 'numeric', pattern: '[0-9]{10}', maxLength: 10, required: true, value: record?.contactoTelefonico },
    { name: 'idTerapeuta', label: 'Terapeuta', placeholder: 'Terapeuta *', hideLabel: true, type: 'select', required: true, value: record?.idTerapeuta, options: data.terapeutas.filter((therapist) => therapist.activo).map((therapist) => ({ value: therapist.idTerapeuta, label: displayName(therapist) })) },
    { name: 'requiereFactura', label: '¿Requiere factura?', type: 'checkbox', value: record?.requiereFactura },
    { name: 'nombreFacturacion', label: 'Nombre de facturación', placeholder: 'Nombre de facturación', hideLabel: true, maxLength: 50, value: record?.requiereFactura ? record.nombreFacturacion : 'PÚBLICO GENERAL', disabledWhen: (form) => !form.requiereFactura, requiredWhen: (form) => form.requiereFactura },
    { name: 'correoFacturacion', label: 'Correo de facturación', placeholder: 'Correo de facturación', hideLabel: true, type: 'email', maxLength: 60, value: record?.requiereFactura ? record.correoFacturacion : 'publico.general@clinica.com', disabledWhen: (form) => !form.requiereFactura, requiredWhen: (form) => form.requiereFactura },
  ]
  const fieldsByResource = {
    pacientes: patientFields,
    terapeutas: [
      { name: 'nombre', label: 'Nombre(s)', required: true, maxLength: 60, value: record?.nombre },
      { name: 'aPaterno', label: 'Apellido Paterno', required: true, maxLength: 60, value: record?.aPaterno },
      { name: 'aMaterno', label: 'Apellido Materno', required: true, maxLength: 60, value: record?.aMaterno },
      { name: 'contactoTelefonico', label: 'Teléfono', type: 'tel', inputMode: 'numeric', pattern: '[0-9]{10}', maxLength: 10, required: true, value: record?.contactoTelefonico },
      { name: 'especialidad', label: 'Especialidad', required: true, maxLength: 30, value: record?.especialidad },
    ],
    usuarios: [
      { name: 'rol', label: 'Rol del Usuario', type: 'select', controlled: true, value: 'terapeuta', options: [{ value: 'terapeuta', label: 'TERAPEUTA' }, { value: 'recepcionista', label: 'RECEPCIONISTA' }] },
      { name: 'nombre', label: 'Nombre(s)', placeholder: 'Nombre(s) *', required: true, maxLength: 60 },
      { name: 'aPaterno', label: 'Apellido Paterno', placeholder: 'Apellido Paterno *', required: true, maxLength: 60 },
      { name: 'aMaterno', label: 'Apellido Materno', placeholder: 'Apellido Materno *', required: true, maxLength: 60 },
      { name: 'contactoTelefonico', label: 'Teléfono', placeholder: 'Teléfono *', required: true, type: 'tel', inputMode: 'numeric', pattern: '[0-9]{10}', maxLength: 10 },
      { name: 'especialidad', label: 'Especialidad', placeholder: 'Especialidad *', required: true, maxLength: 30, when: (form) => form.rol === 'terapeuta' },
      { name: 'contrasena', label: 'Contraseña', placeholder: 'Contraseña *', required: true, type: 'password', autoComplete: 'new-password', className: 'user-password-field' },
    ],
    servicios: [
      { name: 'nombre', label: 'Nombre del Servicio', placeholder: 'Nombre del Servicio *', hideLabel: true, required: true, maxLength: 30, value: record?.nombre },
      { name: 'descripcion', label: 'Descripción Breve', placeholder: 'Descripción Breve', hideLabel: true, maxLength: 50, value: record?.descripcion },
      { name: 'activo', label: 'Servicio activo', type: 'checkbox', value: record ? record.activo : true, className: 'service-active-field' },
    ],
    slots: [
      { name: 'idTerapeuta', label: 'Terapeuta', type: 'select', required: true, value: record?.idTerapeuta, options: data.terapeutas.filter((therapist) => therapist.activo).map((therapist) => ({ value: therapist.idTerapeuta, label: displayName(therapist) })) },
      { name: 'fecha', label: 'Fecha', type: 'date', min: tomorrowDate(), required: true, value: record?.fecha?.slice(0, 10) },
      { name: 'inicio', label: 'Hora de Inicio', type: 'time', min: '00:00', max: '22:00', step: 3600, controlled: true, required: true, value: record ? timeLabel(record.inicio) : '' },
      { name: 'fin', label: 'Hora de Fin', type: 'time', computedValue: (form) => calculateEndTime(form.inicio), disabled: true },
    ],
    citas: [
      { name: 'idPaciente', label: 'Paciente', placeholder: 'Paciente *', hideLabel: true, type: 'select', required: true, value: record?.idPaciente, options: data.pacientes.filter((patient) => patient.activo).map((patient) => ({ value: patient.idPaciente, label: displayName(patient) })) },
      { name: 'idServicio', label: 'Servicio', placeholder: 'Servicio *', hideLabel: true, type: 'select', required: true, value: record?.idServicio, options: data.servicios.filter((service) => service.activo).map((service) => ({ value: service.idServicio, label: service.nombre })) },
      { name: 'idTerapeuta', label: 'Filtrar horarios por Terapeuta', placeholder: 'Filtrar horarios por Terapeuta', hideLabel: true, type: 'select', controlled: true, value: '', options: [{ value: '', label: 'Filtrar horarios por Terapeuta' }, ...data.terapeutas.filter((therapist) => therapist.activo).map((therapist) => ({ value: therapist.idTerapeuta, label: displayName(therapist) }))] },
      { name: 'idSlot', label: 'Horario Disponible', placeholder: 'Horario Disponible *', hideLabel: true, type: 'select', controlled: true, required: true, value: record?.idSlot, options: (form) => data.slots.filter((slot) => slot.estado && (!form.idTerapeuta || String(slot.idTerapeuta) === String(form.idTerapeuta))).map((slot) => ({ value: slot.idSlot, label: `${dateISO(slot.fecha)} ${timeLabel(slot.inicio)} - ${timeLabel(slot.fin)} · ${displayName(slot.terapeuta)}` })) },
      { name: 'esPrimeraSesion', label: 'Es primera sesión del paciente', type: 'checkbox', value: record?.esPrimeraSesion },
    ],
    pagos: [
      { name: 'idCita', label: 'Cita', type: 'select', required: true, value: record?.idCita, options: data.citas.filter((appointment) => appointment.estado !== 'CANCELADA').map((appointment) => ({ value: appointment.idCita, label: `C-${appointment.idCita} · ${displayName(appointment.paciente)} · ${appointment.servicio?.nombre || ''} · ${dateISO(appointment.slotdisponibilidad?.fecha)}` })) },
      { name: 'metodo', label: 'Método de pago', type: 'select', required: true, value: record?.metodo || '', options: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].map((method) => ({ value: method, label: method })) },
      { name: 'fecha', label: 'Fecha', type: 'date', value: record?.fecha?.slice(0, 10) || todayDate() },
      { name: 'facturacion', label: 'Solicitar facturación', type: 'checkbox', value: record?.facturacion },
    ],
  }
  const fields = fieldsByResource[resource] || []
  const [values, setValues] = useState(() => Object.fromEntries(fields.filter((field) => field.controlled || field.type === 'checkbox').map((field) => [field.name, field.type === 'checkbox' ? Boolean(field.value) : field.value ?? ''])))

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const isEditing = Boolean(id)
  const titles = {
    pacientes: isEditing ? 'Editar Paciente' : 'Registrar Nuevo Paciente',
    terapeutas: 'Editar Terapeuta',
    usuarios: 'Registrar Nuevo Usuario del Sistema',
    servicios: isEditing ? 'Editar Servicio' : 'Registrar Nuevo Servicio',
    slots: 'Agregar Horario Disponible',
    citas: 'Agendar Nueva Cita',
    pagos: isEditing ? 'Editar Pago' : 'Registrar Nuevo Pago',
  }
  const submitLabels = {
    pacientes: isEditing ? 'Guardar Cambios' : 'Registrar',
    terapeutas: 'Guardar Cambios',
    usuarios: 'Guardar Usuario',
    servicios: 'Guardar',
    slots: 'Guardar Horario',
    citas: 'Agendar Cita',
    pagos: isEditing ? 'Guardar Cambios' : 'Registrar Pago',
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`record-modal ${resource}-modal`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading"><h2 id="modal-title">{titles[resource] || 'Registro'}</h2></div>
        <form onSubmit={onSubmit}>
          {error && <div className="alert alert-error modal-alert" role="alert"><Icon name="alert" size={18} /><span>{error}</span></div>}
          <div className={`modal-fields ${resource}-form-fields`}>
            {fields.map((field) => {
              if (field.when && !field.when(values)) return null
              const options = typeof field.options === 'function' ? field.options(values) : field.options
              const disabled = field.disabledWhen ? field.disabledWhen(values) : Boolean(field.disabled)
              const required = field.requiredWhen ? field.requiredWhen(values) : Boolean(field.required)
              const value = field.computedValue ? field.computedValue(values) : values[field.name] ?? field.value ?? ''
              const fieldClass = `field-${field.name} ${field.className || ''}`
              if (field.type === 'checkbox') {
                return <label className={`checkbox-field ${fieldClass}`} key={field.name}><input name={field.name} type="checkbox" checked={values[field.name] || false} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.checked }))} /><span>{field.label}</span></label>
              }
              return (
                <Fragment key={field.name}>
                  <label className={`form-field ${fieldClass}`}>
                    <span className={field.hideLabel ? 'sr-only' : ''}>{field.label}{required && <i> *</i>}</span>
                    {field.type === 'select' ? (
                      <select
                        name={field.name}
                        value={field.controlled ? value : undefined}
                        defaultValue={!field.controlled ? field.value ?? '' : undefined}
                        required={required}
                        disabled={disabled}
                        onChange={field.controlled ? (event) => setValues((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                          ...(field.name === 'idTerapeuta' && resource === 'citas' ? { idSlot: '' } : {}),
                        })) : undefined}
                      >
                        {!field.options?.some?.((option) => String(option.value) === String(field.value)) && <option value="" disabled>{field.placeholder || 'Selecciona una opción'}</option>}
                        {(options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    ) : (
                      <input
                        name={field.name}
                        type={field.type || 'text'}
                        placeholder={field.placeholder}
                        value={field.controlled || field.computedValue ? value : undefined}
                        defaultValue={!field.controlled && !field.computedValue ? field.value ?? '' : undefined}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        maxLength={field.maxLength}
                        pattern={field.pattern}
                        inputMode={field.inputMode}
                        autoComplete={field.autoComplete}
                        required={required}
                        disabled={disabled}
                        onChange={field.controlled ? (event) => setValues((current) => ({ ...current, [field.name]: event.target.value })) : undefined}
                      />
                    )}
                  </label>
                  {resource === 'citas' && field.name === 'idSlot' && <p className="form-hint citas-slot-hint">Solo se muestran horarios disponibles para evitar duplicados.</p>}
                </Fragment>
              )
            })}
          </div>
          {resource === 'usuarios' && <p className="form-hint">El usuario se creará automáticamente como {values.rol?.toUpperCase()} + PRIMER NOMBRE (en mayúsculas).</p>}
          {resource === 'slots' && <p className="form-hint">Cada horario dura una hora y debe registrarse desde mañana. La hora máxima de inicio es 22:00.</p>}
          <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">{submitLabels[resource] || 'Guardar'}</button></div>
        </form>
      </section>
    </div>
  )
}

function calculateEndTime(start) {
  if (!start) return ''
  const [hour, minute] = start.split(':').map(Number)
  return `${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function tomorrowDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return localDateValue(date)
}

function todayDate() {
  return localDateValue(new Date())
}

function localDateValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default App
