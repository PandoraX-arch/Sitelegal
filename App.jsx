import { useState, useEffect, useRef, useCallback } from 'react'
import { CONFIG } from './config.js'

// ─── Fingerprinting ───────────────────────────────────────────────────────────
function getFingerprint() {
  const raw = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency ?? 0),
    String(navigator.deviceMemory ?? 0),
  ].join('||')

  let h = 0x811c9dc5
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'sv_vault_v1'

function loadVault() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveVault(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* storage full / private mode */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function generateId() {
  return Math.random().toString(36).slice(2, 9).toUpperCase()
}

// ─── Screens ──────────────────────────────────────────────────────────────────

// Screen: Password gate
function PasswordScreen({ onSuccess, onDenied, docId }) {
  const [value, setValue]       = useState('')
  const [show, setShow]         = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const inputRef                = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const attempt = useCallback(() => {
    if (!value.trim() || loading) return
    setLoading(true)
    setError('')

    // Tiny delay for UX drama
    setTimeout(() => {
      if (value.trim() === CONFIG.password) {
        onSuccess()
      } else {
        setError('Senha incorreta. Acesso negado.')
        setValue('')
        setLoading(false)
        inputRef.current?.focus()
      }
    }, 700)
  }, [value, loading, onSuccess])

  const handleKey = (e) => { if (e.key === 'Enter') attempt() }

  return (
    <div className="anim-fade-in">
      {/* Crest */}
      <div className="crest">
        <div className="crest-ring-wrap">
          <span className="crest-ring-pulse" />
          <div className="crest-ring">
            <span className="crest-icon">⬡</span>
          </div>
        </div>
        <div className="crest-line" />
      </div>

      {/* Title */}
      <p className="heading-eyebrow anim-fade-in anim-delay-1">Documento Sigiloso</p>
      <h1 className="heading-main anim-fade-in anim-delay-2">Acesso Restrito</h1>
      <p className="heading-sub anim-fade-in anim-delay-3">
        Digite a senha para revelar o conteúdo
      </p>

      <div className="divider anim-fade-in anim-delay-3">
        <span className="divider-diamond" />
      </div>

      {/* Input */}
      <div className="input-group anim-fade-in anim-delay-4">
        <label className="input-label" htmlFor="pwd">Senha de acesso</label>
        <div className="input-wrap">
          <input
            ref={inputRef}
            id="pwd"
            className={`input-field${error ? ' error' : ''}`}
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => { setValue(e.target.value); setError('') }}
            onKeyDown={handleKey}
            placeholder="••••••••"
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
          />
          <button
            className="input-toggle"
            onClick={() => setShow(s => !s)}
            tabIndex={-1}
            aria-label={show ? 'Ocultar' : 'Mostrar'}
          >
            {show ? '○' : '●'}
          </button>
        </div>
        <p className={`error-msg${error ? ' visible' : ''}`}>{error || ' '}</p>
      </div>

      <button
        className="btn anim-fade-in anim-delay-4"
        onClick={attempt}
        disabled={loading || !value.trim()}
      >
        {loading ? 'Verificando···' : 'Acessar Documento'}
      </button>

      {/* Counter dots */}
      <div className="counter-row anim-fade-in anim-delay-4">
        <span className="counter-label">Visualizações restantes</span>
      </div>
    </div>
  )
}

// Screen: Revealed message
function RevealedScreen({ views, onClose }) {
  const remaining = CONFIG.maxViews - views
  const pct       = (views / CONFIG.maxViews) * 100
  const isLast    = remaining === 0

  return (
    <div>
      <p className="revealed-eyebrow anim-fade-in">— Conteúdo Desbloqueado —</p>
      <div className="revealed-line anim-fade-in anim-delay-1" />

      <h2 className="revealed-title anim-fade-in anim-delay-1">{CONFIG.secretTitle}</h2>

      <p className="revealed-message anim-fade-in anim-delay-2">{CONFIG.secretMessage}</p>

      <p className="revealed-sender anim-fade-in anim-delay-3">
        — <span>{CONFIG.sender}</span>
      </p>

      {/* View progress bar */}
      <div className="views-bar-wrap anim-fade-in anim-delay-3">
        <div className="views-bar-label">
          <span>Visualizações utilizadas</span>
          <span>{views} / {CONFIG.maxViews}</span>
        </div>
        <div className="views-bar-track">
          <div className="views-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {isLast && (
        <p className="last-view-notice anim-fade-in anim-delay-4">
          ⚠ Esta foi sua última visualização permitida
        </p>
      )}

      <div className="divider" style={{ marginTop: '1.5rem' }}>
        <span className="divider-diamond" />
      </div>

      <button className="btn btn-ghost anim-fade-in anim-delay-4" onClick={onClose}>
        Fechar Documento
      </button>
    </div>
  )
}

// Screen: Access denied
function DeniedScreen({ reason, onReset }) {
  return (
    <div className="anim-fade-in">
      <div className="warning-icon">🔴</div>
      <p className="warning-stamp">Acesso Revogado</p>
      <h2 className="warning-title">Acesso Negado</h2>
      <p className="warning-desc">{reason}</p>

      <div className="divider">
        <span className="divider-diamond" />
      </div>

      <button className="btn btn-ghost" onClick={onReset}>
        ← Voltar
      </button>
    </div>
  )
}

// Screen: Entry log
function LogScreen({ log }) {
  return (
    <div className="anim-fade-in">
      <h2 className="log-title">Registro de Acessos</h2>
      <p className="log-subtitle">Histórico completo deste dispositivo</p>

      {log.length === 0 ? (
        <p className="log-empty">Nenhum acesso registrado ainda.</p>
      ) : (
        [...log].reverse().map((entry, i) => (
          <div className="log-entry anim-fade-in" key={entry.id}
               style={{ animationDelay: `${i * 0.07}s` }}>
            <span className="log-entry-num">#{log.length - i}</span>
            <div className="log-entry-info">
              <div className="log-entry-time">{formatDate(entry.ts)}</div>
              <div className="log-entry-detail">ID {entry.id} · FP {entry.fp}</div>
            </div>
            <span className={`log-entry-badge ${entry.status}`}>
              {entry.status === 'ok'   ? 'OK'     : ''}
              {entry.status === 'warn' ? 'AVISO'  : ''}
              {entry.status === 'deny' ? 'NEGADO' : ''}
            </span>
          </div>
        ))
      )}

      <p className="log-footer-note">
        Os registros são armazenados localmente neste dispositivo.<br />
        Não são enviados a nenhum servidor externo.
      </p>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,   setView]   = useState('password') // password | revealed | denied | log
  const [vault,  setVault]  = useState(null)
  const [docId]             = useState(() => generateId())
  const [deniedReason, setDeniedReason] = useState('')
  const [showLog, setShowLog] = useState(false)

  // Load vault on mount
  useEffect(() => {
    const v = loadVault()
    if (v) setVault(v)
  }, [])

  function handleSuccess() {
    const fp = getFingerprint()
    let v = loadVault()

    const now = new Date().toISOString()

    // First time ever
    if (!v) {
      v = {
        fp,
        views: 0,
        log: [],
      }
    }

    // Fingerprint mismatch → different device / sharing detected
    if (v.fp !== fp) {
      const entry = { id: generateId(), ts: now, fp: fp.slice(0, 6), status: 'deny' }
      v.log = [...(v.log || []), entry]
      saveVault(v)
      setVault(v)
      setDeniedReason(
        'Este link parece ter sido acessado de um dispositivo diferente. Por segurança, o acesso foi bloqueado.'
      )
      setView('denied')
      return
    }

    // Too many views
    if (v.views >= CONFIG.maxViews) {
      const entry = { id: generateId(), ts: now, fp: fp.slice(0, 6), status: 'deny' }
      v.log = [...(v.log || []), entry]
      saveVault(v)
      setVault(v)
      setDeniedReason(
        `O limite de ${CONFIG.maxViews} visualizações foi atingido. O documento não pode mais ser acessado.`
      )
      setView('denied')
      return
    }

    // Grant access
    v.views += 1
    const status = v.views >= CONFIG.maxViews ? 'warn' : 'ok'
    const entry  = { id: generateId(), ts: now, fp: fp.slice(0, 6), status }
    v.log = [...(v.log || []), entry]
    saveVault(v)
    setVault(v)
    setView('revealed')
  }

  function handleClose() {
    setView('password')
    setShowLog(false)
  }

  const currentVault = vault || { views: 0, log: [] }
  const isRevealed   = view === 'revealed'

  // Doc ID shown in header (deterministic from session)
  const headerDocId = `DOC-${docId}`

  return (
    <>
      {/* Top bar (only when not in revealed mode or log) */}
      {view !== 'revealed' && (
        <nav className="topbar">
          {view !== 'denied' && (
            <button
              className={`topbar-btn${showLog ? ' active' : ''}`}
              onClick={() => setShowLog(s => !s)}
            >
              {showLog ? 'Voltar' : 'Registro'}
            </button>
          )}
        </nav>
      )}

      <main className="app">
        <div className={`card card-corners-b card-reveal${isRevealed ? ' card-glow' : ''}`}>

          {/* Header strip */}
          <div className="card-header">
            <span className="card-header-label">Cofre Privado</span>
            <span className="card-header-id">{headerDocId}</span>
          </div>

          {/* Body */}
          <div className="card-body">
            {showLog && view !== 'revealed' && view !== 'denied'
              ? <LogScreen log={currentVault.log} />
              : view === 'password'
                ? <PasswordScreen
                    onSuccess={handleSuccess}
                    onDenied={() => {}}
                    docId={headerDocId}
                  />
                : view === 'revealed'
                  ? <RevealedScreen
                      views={currentVault.views}
                      onClose={handleClose}
                    />
                  : <DeniedScreen
                      reason={deniedReason}
                      onReset={() => { setView('password'); setShowLog(false) }}
                    />
            }
          </div>

          {/* Footer strip */}
          <div className="card-footer">
            <span className="card-footer-text">
              Visualizações: {currentVault.views}/{CONFIG.maxViews}
            </span>
            <span className="card-footer-text">
              {currentVault.views >= CONFIG.maxViews
                ? 'ESGOTADO'
                : `${CONFIG.maxViews - currentVault.views} restante${CONFIG.maxViews - currentVault.views !== 1 ? 's' : ''}`
              }
            </span>
          </div>
        </div>
      </main>
    </>
  )
}