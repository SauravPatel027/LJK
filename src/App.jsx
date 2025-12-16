import { useEffect, useMemo, useState } from 'react'
import './App.css'

const seedSubmissions = [
  {
    submissionId: 'bfcd74b0',
    farmerId: '89',
    productName: 'rajma',
    date: '03/12/2025',
    fpo: 'Jammu',
    status: 'Gsh',
    farmerName: 'Gshs',
    farmerVillage: 'Hshs',
    photo: '/Untitled spreadsheet_Images/bfcd74b0.photo.154320.jpg',
    villagePhoto: '/Untitled spreadsheet_Images/bfcd74b0.village.154320.jpg',
  },
]

const DATA_URL = import.meta.env.VITE_SUBMISSIONS_URL

const fallbackImage = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23112536"/><stop offset="100%" stop-color="%230a1b33"/></linearGradient></defs><rect width="640" height="360" rx="18" fill="url(#g)"/><rect x="24" y="24" width="592" height="312" rx="12" fill="none" stroke="%235dd4b6" stroke-width="4" stroke-dasharray="12 10"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="%23cfe8ff" font-family="Arial, sans-serif" font-size="26" font-weight="600">Image not available</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})()

const driveFromId = (value) => `https://lh3.googleusercontent.com/d/${value}=w1600`

const normalizePhotoValue = (value) => {
  if (!value) return ''
  const trimmed = String(value).trim()
  if (/^https?:\/\//i.test(trimmed)) {
    // Convert common Drive URLs to direct image URLs to avoid cookie blocking
    const driveUrlMatch =
      trimmed.match(/[?&]id=([-\w]{25,})/) || trimmed.match(/\/d\/([-\w]{25,})/)
    if (driveUrlMatch?.[1]) return driveFromId(driveUrlMatch[1])
    return trimmed
  }

  // If the value looks like a Drive file ID, build a viewable URL
  const driveIdMatch = trimmed.match(/[-\w]{25,}/)
  if (driveIdMatch && driveIdMatch[0].length >= 25) {
    return driveFromId(driveIdMatch[0])
  }

  // Treat as a public asset path (e.g. served from /public)
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

const normalizeRow = (row) => {
  const get = (...keys) =>
    keys.reduce((found, key) => found ?? row?.[key] ?? row?.[key.toLowerCase()], undefined)

  return {
    submissionId: get('submissionId', 'Submission ID', 'submission id') || '',
    farmerId: get('farmerId', 'Farmer ID', 'farmer id') || '',
    productName: get('productName', 'Product Name', 'product name') || '',
    date: get('date', 'Date') || '',
    fpo: get('fpo', 'FPO', 'fpo name') || '',
    status: get('status', 'Status') || '',
    farmerName: get('farmerName', 'Farmer Name', 'farmer name') || '',
    farmerVillage: get('farmerVillage', 'Farmer Village', 'farmer village') || '',
    photo: normalizePhotoValue(get('photo', 'Photo', 'photo url')),
    villagePhoto: normalizePhotoValue(get('villagePhoto', 'Village Photo', 'village photo')),
  }
}

function ImageBlock({ label, src }) {
  const [variantIndex, setVariantIndex] = useState(0)
  const [hasError, setHasError] = useState(false)

  const variants = useMemo(() => {
    if (!src) return []
    const list = []
    const trimmed = String(src).trim()
    const driveMatch =
      trimmed.match(/[?&]id=([-\w]{25,})/) || trimmed.match(/\/d\/([-\w]{25,})/)
    if (driveMatch?.[1]) {
      const fileId = driveMatch[1]
      // Prefer direct lh3, then Drive download/view as fallbacks
      list.push(`https://lh3.googleusercontent.com/d/${fileId}=w1600`)
      list.push(`https://drive.google.com/uc?export=download&id=${fileId}`)
      list.push(`https://drive.google.com/uc?export=view&id=${fileId}`)
    } else {
      list.push(trimmed)
    }
    return Array.from(new Set(list))
  }, [src])

  const shownSrc =
    !src || hasError
      ? fallbackImage
      : variants[variantIndex] || variants[0] || fallbackImage

  const activeUrl = variants[variantIndex] || variants[0]

  return (
    <div className="image-block">
      <div className="image-frame">
        <img
          src={shownSrc}
          alt={label}
          loading="eager"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => {
            if (variantIndex + 1 < variants.length) {
              setVariantIndex((prev) => prev + 1)
            } else {
              setHasError(true)
            }
          }}
        />
      </div>
      <div className="image-label">{label}</div>
      <button
        type="button"
        className="open-button"
        onClick={() => activeUrl && window.open(activeUrl, '_blank', 'noopener')}
        disabled={!activeUrl}
      >
        Open in new tab
      </button>
    </div>
  )
}

function App() {
  const [submissions, setSubmissions] = useState(seedSubmissions)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [statusMessage, setStatusMessage] = useState(
    'Enter a submission ID to see its details.',
  )
  const [loading, setLoading] = useState(Boolean(DATA_URL))
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    if (!DATA_URL) return

    const load = async () => {
      setLoading(true)
      setFetchError('')
      try {
        const response = await fetch(DATA_URL)
        if (!response.ok) {
          throw new Error(`Fetch failed with status ${response.status}`)
        }
        const payload = await response.json()
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.rows)
              ? payload.rows
              : []

        if (!rows.length) {
          throw new Error('No rows returned from the data source.')
        }

        setSubmissions(rows.map(normalizeRow))
      } catch (error) {
        console.error(error)
        setFetchError(error.message || 'Could not load data.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const sampleIds = useMemo(
    () => submissions.map((item) => item.submissionId),
    [submissions],
  )

  const handleLookup = (event) => {
    event.preventDefault()
    const cleaned = query.trim()

    if (!cleaned) {
      setSelected(null)
      setStatusMessage('Enter a submission ID to search.')
      return
    }

    const match = submissions.find(
      (row) => row.submissionId.toLowerCase() === cleaned.toLowerCase(),
    )

    if (match) {
      setSelected(match)
      setStatusMessage('')
    } else {
      setSelected(null)
      setStatusMessage(`No submission found for "${cleaned}".`)
    }
  }

  const detailRows =
    selected &&
    [
      { label: 'Submission ID', value: selected.submissionId },
      { label: 'Farmer ID', value: selected.farmerId || '—' },
      { label: 'Product Name', value: selected.productName || '—' },
      { label: 'Date', value: selected.date || '—' },
      { label: 'FPO', value: selected.fpo || '—' },
      { label: 'Status', value: selected.status || '—' },
      { label: 'Farmer Name', value: selected.farmerName || '—' },
      { label: 'Farmer Village', value: selected.farmerVillage || '—' },
    ]

  return (
    <div className="app-shell">
      <section className="panel">
        <form className="search-form" onSubmit={handleLookup}>
          <label htmlFor="submissionId">Submission ID</label>
          <div className="input-row">
            <input
              id="submissionId"
              name="submissionId"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. bfcd74b0"
              autoComplete="off"
            />
            <button type="submit">Show details</button>
          </div>
          <p className="helper">
            Tip: match the value exactly as it appears in the sheet. IDs are
            case-insensitive here.
          </p>
          {sampleIds.length > 0 && (
            <div className="chips">
              <span className="chip-label">Try:</span>
              {sampleIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="chip"
                  onClick={() => setQuery(id)}
                >
                  {id}
                </button>
              ))}
            </div>
          )}
        </form>
      </section>

      <section className="result-area">
        {loading ? (
          <div className="empty-state">
            <h3>Loading rows…</h3>
            <p>Fetching the latest submissions from your sheet.</p>
          </div>
        ) : selected ? (
          <>
            <div className="result-card">
              <div className="result-head">
                <div>
                  <p className="eyebrow">Result</p>
                  <h2>Submission {selected.submissionId}</h2>
                </div>
                <div className="pill">{selected.status || 'Pending'}</div>
              </div>
              <div className="details-grid">
                {detailRows.map((row) => (
                  <div key={row.label} className="detail-item">
                    <p className="detail-label">{row.label}</p>
                    <p className="detail-value">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="image-grid">
              <ImageBlock label="Photo" src={selected.photo} />
              <ImageBlock label="Village Photo" src={selected.villagePhoto} />
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h3>No submission selected</h3>
            <p>{fetchError || statusMessage}</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
