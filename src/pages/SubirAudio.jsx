import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { subirAudio, obtenerEstado } from '../services/api'
import './SubirAudio.css'

const FORMATOS = ['mp3', 'wav', 'm4a', 'webm', 'ogg']

export default function SubirAudio() {
  const [archivo,   setArchivo]   = useState(null)
  const [drag,      setDrag]      = useState(false)
  const [estado,    setEstado]    = useState('idle') // idle | subiendo | procesando | listo | error
  const [progreso,  setProgreso]  = useState(0)
  const [idTrans,   setIdTrans]   = useState(null)
  const [errorMsg,  setErrorMsg]  = useState('')
  const inputRef  = useRef()
  const navigate  = useNavigate()

  function seleccionar(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!FORMATOS.includes(ext)) {
      setErrorMsg(`Formato no soportado. Usa: ${FORMATOS.join(', ')}`)
      return
    }
    if (file.size > 300 * 1024 * 1024) {
      setErrorMsg('El archivo no debe superar 300 MB')
      return
    }
    setArchivo(file)
    setErrorMsg('')
  }

  function onDrop(e) {
    e.preventDefault()
    setDrag(false)
    seleccionar(e.dataTransfer.files[0])
  }

  async function handleSubir() {
    if (!archivo) return
    setEstado('subiendo')
    setProgreso(0)
    setErrorMsg('')

    const form = new FormData()
    form.append('audio', archivo)

    try {
      // Simular progreso de subida
      const intervalo = setInterval(() => {
        setProgreso(p => Math.min(p + 8, 90))
      }, 200)

      const { data } = await subirAudio(form)
      clearInterval(intervalo)
      setProgreso(100)
      setIdTrans(data.id)
      setEstado('procesando')

      // Polling del estado
      const poll = setInterval(async () => {
        try {
          const { data: est } = await obtenerEstado(data.id)
          if (est.estado === 'completado') {
            clearInterval(poll)
            setEstado('listo')
          } else if (est.estado === 'error') {
            clearInterval(poll)
            setEstado('error')
            setErrorMsg('AssemblyAI no pudo procesar el audio')
          }
        } catch { /* seguir polling */ }
      }, 3000)

    } catch (err) {
      setEstado('error')
      setErrorMsg(err.response?.data?.error || 'Error al subir el archivo')
    }
  }

  function formatBytes(b) {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="subir-page">
      <div className="subir-header">
        <h1>Subir audio</h1>
        <p>Sube un archivo de audio para transcribirlo con diarización de locutores</p>
      </div>

      {estado === 'idle' && (
        <>
          <div
            className={`dropzone ${drag ? 'drag-over' : ''} ${archivo ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => !archivo && inputRef.current.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.webm,.ogg,audio/*"
              style={{ display: 'none' }}
              onChange={(e) => seleccionar(e.target.files[0])}
            />
            {archivo ? (
              <div className="file-selected">
                <div className="file-icon">🎵</div>
                <div className="file-info">
                  <span className="file-name">{archivo.name}</span>
                  <span className="file-size">{formatBytes(archivo.size)}</span>
                </div>
                <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); setArchivo(null) }}>
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="drop-placeholder">
                <div className="drop-icon">📁</div>
                <p className="drop-text">Arrastra tu audio aquí</p>
                <p className="drop-sub">o haz clic para seleccionar</p>
                <p className="drop-formats">MP3 · WAV · M4A · WEBM · OGG — máx. 100 MB</p>
              </div>
            )}
          </div>

          {errorMsg && <div className="subir-error">{errorMsg}</div>}

          <button
            className="btn-primary"
            onClick={handleSubir}
            disabled={!archivo}
            style={{ marginTop: '20px' }}
          >
            Transcribir audio
          </button>
        </>
      )}

      {estado === 'subiendo' && (
        <div className="subir-progress card">
          <p className="prog-label">Subiendo archivo...</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progreso}%` }} />
          </div>
          <span className="prog-pct">{progreso}%</span>
        </div>
      )}

      {estado === 'procesando' && (
        <div className="subir-progress card">
          <div className="proc-anim">
            <span /><span /><span />
          </div>
          <p className="prog-label">AssemblyAI está transcribiendo tu audio</p>
          <p className="prog-sub">Esto puede tardar 1–2 minutos dependiendo de la duración</p>
        </div>
      )}

      {estado === 'listo' && (
        <div className="subir-success card">
          <div className="success-icon">✅</div>
          <h2>¡Transcripción lista!</h2>
          <p>Tu audio fue transcrito exitosamente con separación de locutores</p>
          <button className="btn-primary" onClick={() => navigate(`/t/${idTrans}`)}>
            Ver transcripción
          </button>
        </div>
      )}

      {estado === 'error' && (
        <div className="subir-err-box card">
          <div className="err-icon">❌</div>
          <h2>Algo salió mal</h2>
          <p>{errorMsg}</p>
          <button className="btn-ghost" onClick={() => { setEstado('idle'); setArchivo(null) }}>
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  )
}
