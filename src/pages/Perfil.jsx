import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { obtenerPerfil, actualizarPerfil } from '../services/api'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './Perfil.css'

export default function Perfil() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    email: '',
    telefono: '',
    empresa: '',
    profesion: '',
    especialidad: '',
    cedula: '',
    ubicacion: '',
    sitioWeb: '',
    biografia: '',
  })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    async function cargar() {
      try {
        const { data } = await obtenerPerfil()
        setForm(data)
      } catch (err) {
        setError('Error al cargar perfil')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleGuardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    setExito('')
    try {
      const { data } = await actualizarPerfil(form)
      setForm(data)
      setExito('Perfil actualizado correctamente')
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar perfil')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '14px' }}>
      <div className="loader-ring" />
      <p style={{ color: 'var(--muted)' }}>Cargando perfil...</p>
    </div>
  )

  return (
    <div className="perfil-page">
      <div className="perfil-header">
        <button className="btn-ghost back-btn" onClick={() => navigate('/')}>
          <i className="bi bi-arrow-left" /> Volver
        </button>
        <div>
          <h1>Perfil Completo</h1>
          <p>Completa tu información profesional</p>
        </div>
      </div>

      <div className="perfil-container">
        <form className="perfil-form card" onSubmit={handleGuardar}>
          {/* Sección 1: Datos personales */}
          <div className="form-section">
            <h2><i className="bi bi-person" /> Datos Personales</h2>
            <div className="field">
              <label>Nombre(s)</label>
              <input
                type="text"
                name="nombres"
                value={form.nombres}
                onChange={handleChange}
                disabled
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label>Apellido Paterno</label>
                <input
                  type="text"
                  name="apellidoPaterno"
                  value={form.apellidoPaterno}
                  onChange={handleChange}
                  disabled
                />
              </div>
              <div className="field">
                <label>Apellido Materno</label>
                <input
                  type="text"
                  name="apellidoMaterno"
                  value={form.apellidoMaterno}
                  onChange={handleChange}
                  disabled
                />
              </div>
            </div>
            <div className="field">
              <label>Correo</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                disabled
              />
            </div>
            <div className="field">
              <label>Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="+52 1234567890"
              />
            </div>
            <div className="field">
              <label>Ubicación</label>
              <input
                type="text"
                name="ubicacion"
                value={form.ubicacion}
                onChange={handleChange}
                placeholder="Ciudad, País"
              />
            </div>
          </div>

          {/* Sección 2: Información profesional */}
          <div className="form-section">
            <h2><i className="bi bi-briefcase" /> Información Profesional</h2>
            <div className="field">
              <label>Profesión</label>
              <input
                type="text"
                name="profesion"
                value={form.profesion}
                onChange={handleChange}
                placeholder="Ej: Psicólogo, Médico, Abogado"
              />
            </div>
            <div className="field">
              <label>Especialidad</label>
              <input
                type="text"
                name="especialidad"
                value={form.especialidad}
                onChange={handleChange}
                placeholder="Ej: Psicología Clínica, Pediatría"
              />
            </div>
            <div className="field">
              <label>Número de Cédula / Licencia</label>
              <input
                type="text"
                name="cedula"
                value={form.cedula}
                onChange={handleChange}
                placeholder="Ej: 1234567890"
              />
            </div>
            <div className="field">
              <label>Empresa / Institución</label>
              <input
                type="text"
                name="empresa"
                value={form.empresa}
                onChange={handleChange}
                placeholder="Nombre de la institución"
              />
            </div>
            <div className="field">
              <label>Sitio Web</label>
              <input
                type="url"
                name="sitioWeb"
                value={form.sitioWeb}
                onChange={handleChange}
                placeholder="https://ejemplo.com"
              />
            </div>
            <div className="field">
              <label>Biografía</label>
              <textarea
                name="biografia"
                value={form.biografia}
                onChange={handleChange}
                placeholder="Cuéntanos sobre ti..."
                rows="4"
              />
            </div>
          </div>

          {error && <div className="perfil-error">{error}</div>}
          {exito && <div className="perfil-exito">{exito}</div>}

          <button
            className="btn-primary"
            type="submit"
            disabled={guardando}
            style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }}
          >
            {guardando ? (
              <><span className="spinner" /> Guardando...</>
            ) : (
              <><i className="bi bi-check-circle" /> Guardar cambios</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
