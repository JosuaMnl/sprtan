import { useEffect, useState } from 'react'
import type { Run } from '../../db/types'
import { Button } from '../../components/ui/primitives'
import { useUnit } from '../../settings/UnitContext'
import {
  renderRunShareCard,
  shareCardFilename,
  type ShareCardMode,
} from './shareCard'
import './run.css'

interface RunShareDialogProps {
  run: Run
  onClose: () => void
}

type Status = 'rendering' | 'ready' | 'error'

export function RunShareDialog({ run, onClose }: RunShareDialogProps) {
  const { unit } = useUnit()
  const [mode, setMode] = useState<ShareCardMode>('transparent')
  const [status, setStatus] = useState<Status>('rendering')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    setStatus('rendering')
    setBlob(null)
    setUrl(null)

    renderRunShareCard(run, unit, mode)
      .then((result) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(result)
        setBlob(result)
        setUrl(objectUrl)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [run, unit, mode])

  function handleDownload() {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = shareCardFilename(run, mode)
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function handleShare() {
    if (!blob) return
    const file = new File([blob], shareCardFilename(run, mode), { type: 'image/png' })
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean
    }
    if (!nav.canShare?.({ files: [file] }) || !navigator.share) {
      setMessage('Berbagi langsung tidak didukung — gunakan Unduh.')
      return
    }
    try {
      await navigator.share({
        files: [file],
        title: 'Lari Sprtan',
        text: 'ΜΟΛΩΝ ΛΑΒΕ — capaian lariku.',
      })
    } catch {
      // User dismissed the share sheet — no action needed.
    }
  }

  const canShare =
    typeof navigator !== 'undefined' &&
    'canShare' in navigator &&
    typeof navigator.share === 'function'

  const isTransparent = mode === 'transparent'

  return (
    <div
      className="share-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Bagikan capaian lari"
      onClick={onClose}
    >
      <div className="share-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="share-sheet__head">
          <span className="eyebrow">DROMOS</span>
          <h2 className="share-sheet__title">Bagikan Capaian</h2>
        </header>

        <div className="share-toggle" role="group" aria-label="Gaya kartu">
          <button
            type="button"
            className={`share-toggle__btn ${isTransparent ? 'is-active' : ''}`}
            aria-pressed={isTransparent}
            onClick={() => setMode('transparent')}
          >
            Transparan
          </button>
          <button
            type="button"
            className={`share-toggle__btn ${!isTransparent ? 'is-active' : ''}`}
            aria-pressed={!isTransparent}
            onClick={() => setMode('map')}
          >
            Dengan Peta
          </button>
        </div>

        <div className={`share-preview ${isTransparent ? 'share-preview--checker' : ''}`}>
          {status === 'rendering' && (
            <p className="share-preview__msg">Menyiapkan gambar…</p>
          )}
          {status === 'error' && (
            <p className="share-preview__msg">Gagal membuat gambar. Coba lagi.</p>
          )}
          {status === 'ready' && url && (
            <img className="share-preview__img" src={url} alt="Pratinjau kartu lari" />
          )}
        </div>

        <p className="share-hint">
          {isTransparent
            ? 'PNG transparan — tempel ke fotomu, lalu bagikan.'
            : 'Termasuk peta jalan (OpenStreetMap) — butuh koneksi.'}
        </p>
        {message && <p className="share-hint share-hint--warn">{message}</p>}

        <div className="share-actions">
          {canShare && (
            <Button onClick={handleShare} disabled={status !== 'ready'}>
              Bagikan
            </Button>
          )}
          <Button
            variant={canShare ? 'ghost' : 'primary'}
            onClick={handleDownload}
            disabled={status !== 'ready'}
          >
            Unduh
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}
