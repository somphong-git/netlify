import threatsRaw from '../data/threats.txt?raw'

// One IP per line in the plain-text source file.
const ips = threatsRaw
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

export default function ThreatDashboard() {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Threat Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          {ips.length} flagged {ips.length === 1 ? 'address' : 'addresses'} across monitored networks
        </p>
      </header>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[280px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-3 font-medium">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {ips.map((ip) => (
              <tr
                key={ip}
                className="border-b border-border/60 last:border-b-0 hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3 font-mono text-foreground">{ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
