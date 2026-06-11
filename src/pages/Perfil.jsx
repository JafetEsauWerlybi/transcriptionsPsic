import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { obtenerPerfil, actualizarPerfil } from '../services/api'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './Perfil.css'

export default function Perfil() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '',
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
  const [fixeando, setFixeando] = useState(false)
  const [limpiando, setLimpiando] = useState(false)

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

  async function handleFixUsuarios() {
    setFixeando(true)
    try {
      const response = await fetch('https://transcriptionspsicbef-production.up.railway.app/api/auth/fix-usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      setExito(data.mensaje || '✅ Usuarios arreglados')
      setTimeout(() => setExito(''), 3000)
    } catch (err) {
      setError('Error al arreglar usuarios')
    } finally {
      setFixeando(false)
    }
  }

  async function handleLimpiarAntiguos() {
    if (!confirm('¿Eliminar usuarios antiguos (sin usuarioId)?')) return
    setLimpiando(true)
    try {
      const response = await fetch('https://transcriptionspsicbef-production.up.railway.app/api/auth/limpiar-usuarios-antiguos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      setExito(data.mensaje || '✅ Documentos antiguos eliminados')
      setTimeout(() => setExito(''), 3000)
    } catch (err) {
      setError('Error al limpiar documentos')
    } finally {
      setLimpiando(false)
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
              <label>Nombre Completo</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Tu nombre completo"
              />
            </div>
            <div className="field">
              <label>Correo</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                disabled
                style={{ opacity: 0.6 }}
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

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              type="submit"
              disabled={guardando}
              style={{ flex: 1, minWidth: '150px', justifyContent: 'center' }}
            >
              {guardando ? (
                <><span className="spinner" /> Guardando...</>
              ) : (
                <><i className="bi bi-check-circle" /> Guardar cambios</>
              )}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={handleFixUsuarios}
              disabled={fixeando}
              title="Arreglar usuarios (agregar usuarioId)"
              style={{ minWidth: '120px', justifyContent: 'center' }}
            >
              {fixeando ? (
                <><span className="spinner" /> Arreglando...</>
              ) : (
                <><i className="bi bi-wrench" /> Fix</>
              )}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={handleLimpiarAntiguos}
              disabled={limpiando}
              title="Eliminar documentos antiguos duplicados"
              style={{ minWidth: '140px', justifyContent: 'center' }}
            >
              {limpiando ? (
                <><span className="spinner" /> Limpiando...</>
              ) : (
                <><i className="bi bi-trash" /> Limpiar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
