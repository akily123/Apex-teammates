import type { PlayerStats } from '@shared/types'

function fmt(n: number): string {
  return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toLocaleString()
}

export default function StatsCard({ stats }: { stats: PlayerStats }): JSX.Element {
  const o = stats.overview
  return (
    <div className="card stats-card">
      <div className="stats-head">
        <div className="stats-title">
          <div className="name">{stats.username}</div>
          <div className="sub">
            {stats.level > 0 && <span className="badge">Lv.{stats.level}</span>}
            {stats.rank && (
              <span className="badge rank">
                {stats.rank.tier}
                {stats.rank.division ? ` ${stats.rank.division}` : ''}
              </span>
            )}
            <span className="platform">{stats.platform}</span>
          </div>
        </div>
      </div>

      {stats.privateProfile || !o ? (
        <div className="empty">该玩家资料设为隐私，或查无此人。提示：PC 玩家请填 Origin(EA) 账号名，而不是 Steam 名。</div>
      ) : (
        <>
          <div className="grid">
            <div className="cell">
              <span className="k">K/D</span>
              <span className="v">{o.kd.toFixed(2)}</span>
            </div>
            <div className="cell">
              <span className="k">击杀</span>
              <span className="v">{fmt(o.kills)}</span>
            </div>
            <div className="cell">
              <span className="k">场均伤害</span>
              <span className="v">{o.matches > 0 ? fmt(Math.round(o.damage / o.matches)) : '—'}</span>
            </div>
            <div className="cell">
              <span className="k">胜场</span>
              <span className="v">{fmt(o.wins)}</span>
            </div>
            <div className="cell">
              <span className="k">总伤害</span>
              <span className="v">{fmt(o.damage)}</span>
            </div>
            <div className="cell">
              <span className="k">对局</span>
              <span className="v">{fmt(o.matches)}</span>
            </div>
          </div>

          {stats.legends.length > 0 && (
            <div className="legends">
              <div className="section-title">常用英雄</div>
              {stats.legends.slice(0, 5).map((l) => (
                <div className="legend-row" key={l.name}>
                  <span className="legend-name">{l.name}</span>
                  <span className="legend-kills">{fmt(l.kills)} 击杀</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
