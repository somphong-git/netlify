import { useState } from 'react'
import type { FormEvent } from 'react'
import threatsRaw from '../data/threats.txt?raw'

type LookupResult = {
  query: string
  type: 'domain' | 'ip'
  canonical: string
  resolvedIps: string[]
  owner: string | null
  registrar: string | null
  country: string | null
  city: string | null
  asn: string | null
  network: string | null
  range: string | null
  nameservers: string[]
  status: string[]
  registeredAt: string | null
  updatedAt: string | null
  expiresAt: string | null
  signals: { proxy: boolean; tor: boolean; hosting: boolean; mobile: boolean }
  sources: string[]
}

const blacklist = new Set(threatsRaw.split('\n').map((line) => line.trim()).filter(Boolean))
const examples = ['8.8.8.8', 'cloudflare.com', '185.220.101.47']
const formatDate = (value: string | null) => {
  if (!value) return 'ไม่พบข้อมูล'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(date)
}
const show = (value: string | null | undefined) => value || 'ไม่พบข้อมูล'

export default function ThreatDashboard() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const runLookup = async (value: string) => {
    const clean = value.trim()
    if (!clean) {
      setError('กรุณากรอก Domain name หรือ IP Address')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch(`/.netlify/functions/lookup?q=${encodeURIComponent(clean)}`)
      const payload = await response.json() as LookupResult & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'ไม่สามารถตรวจสอบข้อมูลได้')
      setResult(payload)
      window.setTimeout(() => document.getElementById('lookup-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runLookup(query)
  }

  const flagged = result ? [result.canonical, ...result.resolvedIps].some((ip) => blacklist.has(ip)) : false
  const suspiciousSignals = result ? [result.signals.proxy, result.signals.tor].filter(Boolean).length : 0

  const copySummary = async () => {
    if (!result) return
    const summary = [
      `WHOIS WEIRD — ${result.canonical}`,
      `ประเภท: ${result.type === 'domain' ? 'Domain' : 'IP Address'}`,
      `เจ้าของ/องค์กร: ${show(result.owner)}`,
      `เครือข่าย: ${show(result.asn)} ${show(result.network)}`,
      `ประเทศ: ${show(result.country)}`,
      `Blacklist: ${flagged ? 'พบในรายการ' : 'ไม่พบในรายการภายใน'}`,
    ].join('\n')
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="เมนูหลัก">
        <a className="brand" href="/" aria-label="Whois Weird หน้าแรก"><span className="brand-mark" aria-hidden="true">W</span><span>WHOIS WEIRD</span></a>
        <span className="status-pill"><span className="status-dot" />ระบบพร้อมใช้งาน</span>
      </nav>

      <section className="lookup-hero">
        <div className="eyebrow"><span>NETWORK INTELLIGENCE</span><span className="eyebrow-line" /></div>
        <h1>รู้จักทุกปลายทาง<br /><span>ก่อนที่คุณจะเชื่อมต่อ</span></h1>
        <p className="hero-copy">ตรวจสอบเจ้าของ ที่ตั้ง เครือข่าย และสถานะบัญชีดำของ Domain หรือ IP Address จากจุดเดียว</p>
        <form className="lookup-form" onSubmit={handleSubmit}>
          <label htmlFor="lookup-query">Domain name หรือ IP address</label>
          <div className="lookup-row">
            <div className="input-wrap">
              <span className="prompt-mark" aria-hidden="true">›_</span>
              <input id="lookup-query" name="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="example.com หรือ 8.8.8.8" autoComplete="off" spellCheck="false" aria-describedby={error ? 'lookup-error' : undefined} />
            </div>
            <button type="submit" disabled={loading}>{loading ? <><span className="spinner" />กำลังค้นหา</> : <>ตรวจสอบ <span aria-hidden="true">→</span></>}</button>
          </div>
          <div className="examples" aria-label="ตัวอย่างสำหรับค้นหา">
            <span>ลองค้นหา</span>
            {examples.map((example) => <button key={example} type="button" onClick={() => { setQuery(example); void runLookup(example) }}>{example}</button>)}
          </div>
          {error && <p className="form-error" id="lookup-error" role="alert"><span aria-hidden="true">!</span>{error}</p>}
        </form>
      </section>

      {result ? (
        <section className="result-section" id="lookup-result" aria-live="polite">
          <div className="result-heading">
            <div><span className="section-label">LOOKUP RESULT / {result.type.toUpperCase()}</span><h2>{result.canonical}</h2>{result.type === 'domain' && result.resolvedIps.length > 0 && <p>ชี้ไปที่ {result.resolvedIps.join(' · ')}</p>}</div>
            <button className="copy-button" type="button" onClick={() => void copySummary()}>{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกสรุป'}</button>
          </div>
          <div className={`verdict ${flagged || suspiciousSignals ? 'verdict-warn' : 'verdict-clear'}`}>
            <span className="verdict-icon" aria-hidden="true">{flagged || suspiciousSignals ? '!' : '✓'}</span>
            <div><strong>{flagged ? 'พบในรายการ IP ที่เฝ้าระวัง' : suspiciousSignals ? 'พบสัญญาณที่ควรตรวจสอบเพิ่ม' : 'ไม่พบในรายการเฝ้าระวังภายใน'}</strong><p>{flagged ? 'ควรหลีกเลี่ยงการเชื่อมต่อจนกว่าจะตรวจสอบแหล่งข้อมูลเพิ่มเติม' : 'ผลนี้ไม่ใช่การรับรองความปลอดภัย ควรพิจารณาร่วมกับบริบทอื่นเสมอ'}</p></div>
            <span className="verdict-tag">{flagged || suspiciousSignals ? 'REVIEW' : 'NO MATCH'}</span>
          </div>
          <div className="detail-grid">
            <article className="detail-card"><span className="card-kicker">IDENTITY</span><dl><div><dt>เจ้าของ / องค์กร</dt><dd>{show(result.owner)}</dd></div><div><dt>Registrar</dt><dd>{show(result.registrar)}</dd></div><div><dt>ประเทศ</dt><dd>{[result.city, result.country].filter(Boolean).join(', ') || 'ไม่พบข้อมูล'}</dd></div></dl></article>
            <article className="detail-card"><span className="card-kicker">NETWORK</span><dl><div><dt>ASN</dt><dd className="mono">{show(result.asn)}</dd></div><div><dt>ชื่อเครือข่าย</dt><dd>{show(result.network)}</dd></div><div><dt>ช่วง IP</dt><dd className="mono small-value">{show(result.range)}</dd></div></dl></article>
            <article className="detail-card"><span className="card-kicker">REGISTRATION</span><dl><div><dt>จดทะเบียน</dt><dd>{formatDate(result.registeredAt)}</dd></div><div><dt>อัปเดตล่าสุด</dt><dd>{formatDate(result.updatedAt)}</dd></div><div><dt>วันหมดอายุ</dt><dd>{formatDate(result.expiresAt)}</dd></div></dl></article>
          </div>
          <div className="lower-grid">
            <article className="wide-card"><div className="wide-card-head"><span className="card-kicker">DNS / NAMESERVERS</span><span>{result.nameservers.length || result.resolvedIps.length} RECORDS</span></div><div className="chip-list">{(result.nameservers.length ? result.nameservers : result.resolvedIps).length ? (result.nameservers.length ? result.nameservers : result.resolvedIps).map((item) => <span key={item}>{item}</span>) : <p>ไม่พบข้อมูลรายการนี้</p>}</div></article>
            <article className="wide-card signal-card"><div className="wide-card-head"><span className="card-kicker">SIGNALS</span><span>LIVE</span></div><div className="signal-rows"><span>Proxy <b data-on={result.signals.proxy}>{result.signals.proxy ? 'DETECTED' : 'NO'}</b></span><span>Tor <b data-on={result.signals.tor}>{result.signals.tor ? 'DETECTED' : 'NO'}</b></span><span>Hosting <b data-on={result.signals.hosting}>{result.signals.hosting ? 'YES' : 'NO'}</b></span><span>Mobile <b data-on={result.signals.mobile}>{result.signals.mobile ? 'YES' : 'NO'}</b></span></div></article>
          </div>
          <p className="source-note">แหล่งข้อมูล: {result.sources.join(', ')} · ข้อมูล WHOIS/RDAP บางส่วนอาจถูกปกปิดเพื่อความเป็นส่วนตัว</p>
        </section>
      ) : (
        <section className="signal-grid" aria-label="ข้อมูลที่ระบบตรวจสอบ">
          <article><span className="signal-index">01</span><h2>WHOIS &amp; RDAP</h2><p>เจ้าของโดเมน ผู้ให้บริการ และวันหมดอายุ</p></article>
          <article><span className="signal-index">02</span><h2>NETWORK</h2><p>ASN องค์กร ประเทศ และโครงข่ายต้นทาง</p></article>
          <article><span className="signal-index">03</span><h2>REPUTATION</h2><p>ตรวจเทียบรายการ IP ที่มีพฤติกรรมน่าสงสัย</p></article>
        </section>
      )}
      <footer className="site-footer"><span>ข้อมูลใช้เพื่อการตรวจสอบเบื้องต้น</span><span>WHOIS WEIRD / 2026</span></footer>
    </main>
  )
}
