import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './TiempoReal.css'

const DURACION_MAXIMA = 30 * 60 // 30 minutos en segundos

export default function TiempoReal() {
  const [estado,     setEstado]     = useState('idle') // idle | conectando | grabando | guardando
  const [segmentos,  setSegmentos]  = useState([])
  const [parcial,    setParcial]    = useState('')
  const [tiempo,     setTiempo]     = useState(0)
  const [idTrans,    setIdTrans]    = useState(null)
  const [error,      setError]      = useState('')

  const wsRef         = useRef(null)
  const mediaRef      = useRef(null)
  const timerRef      = useRef(null)
  const bottomRef     = useRef(null)
  const navigate      = useNavigate()

  useEffect(() => {
    return () => { detener(true) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segmentos, parcial])

  async function iniciar() {
    setEstado('conectando')
    setError('')
    setSegmentos([])
    setParcial('')
    setTiempo(0)

    const token = localStorage.getItem('token')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const ws = new WebSocket(`wss://transcriptionspsicbef-production.up.railway.app/ws/live?token=${token}`)
      ws.onopen = () => {
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            e.data.arrayBuffer().then(buf => ws.send(buf))
          }
        }
        recorder.start(250)
        mediaRef.current = { stream, recorder }
        setEstado('grabando')
        timerRef.current = setInterval(() => {
          setTiempo(t => {
            const nuevoTiempo = t + 1
            if (nuevoTiempo >= DURACION_MAXIMA) {
              // Detener automáticamente al alcanzar 30 minutos
              detener(false)
            }
            return nuevoTiempo
          })
        }, 1000)
      }

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.tipo === 'inicio')    setIdTrans(msg.transcripcionId)
        if (msg.tipo === 'parcial')   setParcial(msg.texto)
        if (msg.tipo === 'segmento') {
          setSegmentos(s => [...s, msg])
          setParcial('')
        }
        if (msg.tipo === 'error') setError(msg.mensaje)
      }

      ws.onerror = () => setError('Error de conexión con el servidor')

      wsRef.current = ws
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Permiso de micrófono denegado. Actívalo en la configuración del navegador.')
      } else {
        setError('No se pudo acceder al micrófono: ' + err.message)
      }
      setEstado('idle')
    }
  }

  function detener(silencioso = false) {
    if (mediaRef.current) {
      mediaRef.current.recorder?.stop()
      mediaRef.current.stream.getTracks().forEach(t => t.stop())
      mediaRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    clearInterval(timerRef.current)
    if (!silencioso) setEstado('guardando')

    setTimeout(() => {
      if (!silencioso && idTrans) navigate(`/t/${idTrans}`)
      else if (!silencioso) setEstado('idle')
    }, 1500)
  }

  function formatTiempo(s) {
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
  }

  const colores = ['var(--accent)', 'var(--accent2)', 'var(--warn)', '#ff9d5a', '#c45aff']

  return (
    <div className="realtime-page">
      <div className="rt-header">
        <h1>Micrófono en vivo</h1>
        <p>Transcripción en tiempo real con identificación de locutores</p>
      </div>

      {/* Visualizador / Control */}
      <div className="rt-control card">
        {estado === 'grabando' && (
          <div className="wave-viz">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="wave-bar" style={{ animationDelay: `${(i * 0.07) % 0.8}s` }} />
            ))}
          </div>
        )}

        {estado === 'idle' && <div className="mic-idle">🎙</div>}
        {estado === 'conectando' && <div className="loader-ring" />}
        {estado === 'guardando' && <div className="loader-ring" style={{ borderTopColor: 'var(--accent2)' }} />}

        <div className="rt-timer">{formatTiempo(tiempo)}</div>

        <div className="rt-status">
          {estado === 'idle'       && 'Listo para grabar'}
          {estado === 'conectando' && 'Conectando con el servidor...'}
          {estado === 'grabando'   && (
            <>
              Grabando — habla con claridad
              {tiempo > DURACION_MAXIMA - 120 && (
                <div style={{ color: '#ff6b5a', marginTop: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  ⚠ Límite de 30 minutos próximo
                </div>
              )}
            </>
          )}
          {estado === 'guardando'  && 'Guardando transcripción...'}
        </div>

        {error && <div className="rt-error">{error}</div>}

        <div className="rt-btns">
          {(estado === 'idle' || error) && (
            <button className="btn-primary btn-big" onClick={iniciar}>
              <span className="rec-dot" /> Iniciar grabación
            </button>
          )}
          {estado === 'grabando' && (
            <button className="btn-stop" onClick={() => detener(false)}>
              <span className="stop-sq" /> Detener y guardar
            </button>
          )}
        </div>
      </div>

      {/* Transcripción en vivo */}
      {(segmentos.length > 0 || parcial) && (
        <div className="rt-transcript card">
          <div className="rt-trans-header">
            <span className="rt-trans-title">Transcripción en vivo</span>
            <span className="badge badge-green">{segmentos.length} segmentos</span>
          </div>
          <div className="rt-segments">
            {segmentos.map((seg, i) => (
              <div key={i} className="rt-seg">
                <span className="seg-speaker" style={{ color: colores[seg.locutor?.charCodeAt(0) % colores.length] }}>
                  Locutor {seg.locutor}
                </span>
                <p className="seg-text">{seg.texto}</p>
              </div>
            ))}
            {parcial && (
              <div className="rt-seg rt-parcial">
                <span className="seg-speaker" style={{ color: 'var(--muted)' }}>•••</span>
                <p className="seg-text">{parcial}</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  )
}
