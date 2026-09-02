import { isIP } from 'node:net'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': statusCode === 200 ? 'public, max-age=300, s-maxage=1800' : 'no-store', 'x-content-type-options': 'nosniff' },
  body: JSON.stringify(body),
})

const fetchJson = async (url, headers = {}) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, { headers: { accept: 'application/json', ...headers }, signal: controller.signal, redirect: 'follow' })
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`)
    return await response.json()
  } finally { clearTimeout(timer) }
}

const cleanDomain = (value) => {
  const raw = value.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/\.$/, '')
  try {
    const domain = new URL(`http://${raw}`).hostname
    if (domain.length > 253 || !domain.includes('.') || !domain.split('.').every((label) => /^(?!-)[a-z0-9-]{1,63}(?<!-)$/.test(label))) return null
    return domain
  } catch { return null }
}

const eventDate = (rdap, action) => rdap?.events?.find((event) => event.eventAction === action)?.eventDate || null
const entityName = (entity) => {
  const values = entity?.vcardArray?.[1] || []
  const org = values.find((item) => item[0] === 'org')?.[3]
  const name = values.find((item) => item[0] === 'fn')?.[3]
  return Array.isArray(org) ? org.join(' ') : org || name || entity?.handle || null
}
const findEntity = (rdap, role) => rdap?.entities?.find((entity) => entity.roles?.includes(role))
const dnsLookup = async (domain, type) => {
  const data = await fetchJson(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, { accept: 'application/dns-json' })
  return (data.Answer || []).filter((item) => item.type === (type === 'A' ? 1 : 28)).map((item) => item.data)
}
const geoLookup = async (ip) => {
  try {
    const data = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`)
    return data.success === false ? null : data
  } catch { return null }
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'รองรับเฉพาะการค้นหาแบบ GET' })
  const supplied = (event.queryStringParameters?.q || '').trim()
  if (!supplied || supplied.length > 300) return json(400, { error: 'กรุณากรอก Domain name หรือ IP Address ที่ถูกต้อง' })
  const ipVersion = isIP(supplied)
  const domain = ipVersion ? null : cleanDomain(supplied)
  if (!ipVersion && !domain) return json(400, { error: 'รูปแบบ Domain name หรือ IP Address ไม่ถูกต้อง' })
  const type = ipVersion ? 'ip' : 'domain'
  const canonical = ipVersion ? supplied : domain

  try {
    let resolvedIps = []
    if (type === 'domain') {
      const dnsResults = await Promise.allSettled([dnsLookup(canonical, 'A'), dnsLookup(canonical, 'AAAA')])
      resolvedIps = [...new Set(dnsResults.flatMap((item) => item.status === 'fulfilled' ? item.value : []))].slice(0, 12)
    }
    const geoTarget = type === 'ip' ? canonical : resolvedIps[0]
    const [rdapResult, geoResult] = await Promise.allSettled([
      fetchJson(`https://rdap.org/${type === 'ip' ? 'ip' : 'domain'}/${encodeURIComponent(canonical)}`),
      geoTarget ? geoLookup(geoTarget) : Promise.resolve(null),
    ])
    const rdap = rdapResult.status === 'fulfilled' ? rdapResult.value : null
    const geo = geoResult.status === 'fulfilled' ? geoResult.value : null
    if (!rdap && !geo && resolvedIps.length === 0) return json(502, { error: 'ไม่พบข้อมูลจากผู้ให้บริการภายนอกในขณะนี้ กรุณาลองใหม่อีกครั้ง' })
    const registrant = findEntity(rdap, 'registrant')
    const registrar = findEntity(rdap, 'registrar')
    const networkOwner = findEntity(rdap, 'administrative') || findEntity(rdap, 'technical') || rdap?.entities?.[0]
    const owner = type === 'domain' ? entityName(registrant) || null : geo?.connection?.org || geo?.connection?.isp || entityName(networkOwner) || rdap?.name || null
    return json(200, {
      query: supplied, type, canonical, resolvedIps, owner,
      registrar: type === 'domain' ? entityName(registrar) : null,
      country: geo?.country || rdap?.country || null,
      city: geo?.city || null,
      asn: geo?.connection?.asn ? `AS${geo.connection.asn}` : null,
      network: geo?.connection?.isp || geo?.connection?.org || rdap?.name || null,
      range: rdap?.startAddress && rdap?.endAddress ? `${rdap.startAddress} — ${rdap.endAddress}` : null,
      nameservers: (rdap?.nameservers || []).map((item) => item.ldhName).filter(Boolean).slice(0, 12),
      status: rdap?.status || [],
      registeredAt: eventDate(rdap, 'registration'), updatedAt: eventDate(rdap, 'last changed'), expiresAt: eventDate(rdap, 'expiration'),
      signals: { proxy: Boolean(geo?.security?.proxy), tor: Boolean(geo?.security?.tor), hosting: Boolean(geo?.security?.hosting), mobile: Boolean(geo?.connection?.mobile) },
      sources: ['RDAP.org', 'Cloudflare DNS', 'IPWhois', 'Local blacklist'],
    })
  } catch { return json(502, { error: 'ผู้ให้บริการข้อมูลไม่ตอบกลับ กรุณาลองใหม่ในอีกสักครู่' }) }
}
