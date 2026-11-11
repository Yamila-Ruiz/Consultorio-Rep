import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

export default function GestionConsultorio() {
    const [vista, setVista] = useState('pacientes');
    const [pacientes, setPacientes] = useState([]);
    const [terapeutas, setTerapeutas] = useState([]);

    // Formulario de Paciente
    const [formPaciente, setFormPaciente] = useState({
        idPaciente: null,
        nombre: '',
        aPaterno: '',
        aMaterno: '',
        edad: '',
        contactoTelefonico: '',
        nombreFacturacion: '',
        correoFacturacion: '',
        idTerapeuta: ''
    });

    // Formulario de Terapeuta
    const [formTerapeuta, setFormTerapeuta] = useState({
        nombreCompleto: '',
        contactoTelefonico: '',
        especialidad: ''
    });

    useEffect(() => {
        cargarPacientes();
        cargarTerapeutas();
    }, []);

    const cargarPacientes = async () => {
        try {
            const res = await fetch(`${API_URL}/pacientes`);
            const data = await res.json();
            setPacientes(data);
        } catch (error) {
            console.error('Error al cargar pacientes:', error);
        }
    };

    const cargarTerapeutas = async () => {
        try {
            const res = await fetch(`${API_URL}/terapeutas`);
            const data = await res.json();
            setTerapeutas(data);
        } catch (error) {
            console.error('Error al cargar terapeutas:', error);
        }
    };

    const guardarPaciente = async (e) => {
        e.preventDefault();
        const esEdicion = !!formPaciente.idPaciente;
        const url = esEdicion
            ? `${API_URL}/pacientes/${formPaciente.idPaciente}`
            : `${API_URL}/pacientes`;

        const method = esEdicion ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formPaciente)
        });

        cargarPacientes();
        setVista('pacientes');
        limpiarFormPaciente();
    };

    const guardarTerapeuta = async (e) => {
        e.preventDefault();
        await fetch(`${API_URL}/terapeutas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formTerapeuta)
        });

        cargarTerapeutas();
        setVista('terapeutas');
        setFormTerapeuta({ nombreCompleto: '', contactoTelefonico: '', especialidad: '' });
    };

    const prepararEdicion = (paciente) => {
        setFormPaciente({
            idPaciente: paciente.idPaciente,
            nombre: paciente.nombre,
            aPaterno: paciente.aPaterno,
            aMaterno: paciente.aMaterno,
            edad: paciente.edad,
            contactoTelefonico: paciente.contactoTelefonico,
            nombreFacturacion: paciente.nombreFacturacion || '',
            correoFacturacion: paciente.correoFacturacion || '',
            idTerapeuta: paciente.idTerapeuta
        });
        setVista('editar-paciente');
    };

    const limpiarFormPaciente = () => {
        setFormPaciente({
            idPaciente: null,
            nombre: '',
            aPaterno: '',
            aMaterno: '',
            edad: '',
            contactoTelefonico: '',
            nombreFacturacion: '',
            correoFacturacion: '',
            idTerapeuta: ''
        });
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Consultorio - Panel de Gestión</h1>

            <nav style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button onClick={() => setVista('pacientes')}>Pacientes</button>
                <button onClick={() => setVista('terapeutas')}>Terapeutas</button>
            </nav>

            <hr />

            {/* VISTA: PACIENTES */}
            {vista === 'pacientes' && (
                <div>
                    <h2>Listado de Pacientes</h2>
                    <button onClick={() => { limpiarFormPaciente(); setVista('nuevo-paciente'); }}>
                        + Registrar Paciente
                    </button>
                    <table border="1" cellPadding="8" style={{ marginTop: '15px', width: '100%' }}>
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre Completo</th>
                            <th>Edad</th>
                            <th>Teléfono</th>
                            <th>Terapeuta Asignado</th>
                            <th>Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {pacientes.map((p) => (
                            <tr key={p.idPaciente}>
                                <td>{p.idPaciente}</td>
                                <td>{`${p.nombre} ${p.aPaterno} ${p.aMaterno}`}</td>
                                <td>{p.edad}</td>
                                <td>{p.contactoTelefonico}</td>
                                <td>{p.terapeuta ? p.terapeuta.nombreCompleto : 'Sin asignar'}</td>
                                <td>
                                    <button onClick={() => prepararEdicion(p)}>Editar / Reasignar</button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* VISTA: TERAPEUTAS */}
            {vista === 'terapeutas' && (
                <div>
                    <h2>Listado de Terapeutas</h2>
                    <button onClick={() => setVista('nuevo-terapeuta')}>+ Registrar Terapeuta</button>
                    <table border="1" cellPadding="8" style={{ marginTop: '15px', width: '100%' }}>
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Especialidad</th>
                        </tr>
                        </thead>
                        <tbody>
                        {terapeutas.map((t) => (
                            <tr key={t.idTerapeuta}>
                                <td>{t.idTerapeuta}</td>
                                <td>{t.nombreCompleto}</td>
                                <td>{t.contactoTelefonico}</td>
                                <td>{t.especialidad}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* FORMULARIO PACIENTE */}
            {(vista === 'nuevo-paciente' || vista === 'editar-paciente') && (
                <div>
                    <h2>{vista === 'editar-paciente' ? 'Actualizar Paciente' : 'Registrar Paciente'}</h2>
                    <form onSubmit={guardarPaciente} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
                        <input
                            type="text"
                            placeholder="Nombre"
                            value={formPaciente.nombre}
                            onChange={(e) => setFormPaciente({ ...formPaciente, nombre: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Apellido Paterno"
                            value={formPaciente.aPaterno}
                            onChange={(e) => setFormPaciente({ ...formPaciente, aPaterno: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Apellido Materno"
                            value={formPaciente.aMaterno}
                            onChange={(e) => setFormPaciente({ ...formPaciente, aMaterno: e.target.value })}
                            required
                        />
                        <input
                            type="number"
                            placeholder="Edad"
                            value={formPaciente.edad}
                            onChange={(e) => setFormPaciente({ ...formPaciente, edad: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Teléfono"
                            value={formPaciente.contactoTelefonico}
                            onChange={(e) => setFormPaciente({ ...formPaciente, contactoTelefonico: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Nombre a Facturar"
                            value={formPaciente.nombreFacturacion}
                            onChange={(e) => setFormPaciente({ ...formPaciente, nombreFacturacion: e.target.value })}
                        />
                        <input
                            type="email"
                            placeholder="Correo Facturación"
                            value={formPaciente.correoFacturacion}
                            onChange={(e) => setFormPaciente({ ...formPaciente, correoFacturacion: e.target.value })}
                        />

                        <label><strong>Asignar Terapeuta:</strong></label>
                        <select
                            value={formPaciente.idTerapeuta}
                            onChange={(e) => setFormPaciente({ ...formPaciente, idTerapeuta: e.target.value })}
                            required
                        >
                            <option value="">Seleccione un terapeuta</option>
                            {terapeutas.map((t) => (
                                <option key={t.idTerapeuta} value={t.idTerapeuta}>
                                    {t.nombreCompleto} - ({t.especialidad})
                                </option>
                            ))}
                        </select>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button type="submit">Guardar</button>
                            <button type="button" onClick={() => setVista('pacientes')}>Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            {/* FORMULARIO TERAPEUTA */}
            {vista === 'nuevo-terapeuta' && (
                <div>
                    <h2>Registrar Terapeuta</h2>
                    <form onSubmit={guardarTerapeuta} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
                        <input
                            type="text"
                            placeholder="Nombre Completo"
                            value={formTerapeuta.nombreCompleto}
                            onChange={(e) => setFormTerapeuta({ ...formTerapeuta, nombreCompleto: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Teléfono"
                            value={formTerapeuta.contactoTelefonico}
                            onChange={(e) => setFormTerapeuta({ ...formTerapeuta, contactoTelefonico: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Especialidad"
                            value={formTerapeuta.especialidad}
                            onChange={(e) => setFormTerapeuta({ ...formTerapeuta, especialidad: e.target.value })}
                            required
                        />

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button type="submit">Guardar</button>
                            <button type="button" onClick={() => setVista('terapeutas')}>Cancelar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}