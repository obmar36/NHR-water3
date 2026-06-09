// MotorDiagram.jsx — themeable orthographic pump-motor line diagram.
// One reusable <MotorDiagram theme="..." units={[...]}/> rendered in several styles.

const SCHEMATIC_THEMES = {
  blueprint: {
    name: '藍圖 Blueprint', en: 'Cyan technical drawing',
    bg: 'radial-gradient(120% 120% at 50% 0%, #0d2244 0%, #08152c 60%, #060f22 100%)',
    grid: 'rgba(40,110,190,.18)', gridStep: 26,
    stroke: '#41a6ff', dim: '#1f5b9c', accent: '#7cd4ff', hot: '#ff6b6b',
    label: '#cfe6ff', text: '#6fa8dc', sw: 1.05, glow: true, hud: true, room: true, mono: true,
  },
  control: {
    name: '控制室 Control-Room', en: 'NHR dashboard-native',
    bg: '#0B1220',
    grid: 'rgba(31,42,68,.55)', gridStep: 28,
    stroke: '#9AA7BD', dim: '#33415c', accent: '#22D3EE', hot: '#EF4444',
    label: '#E6ECF5', text: '#9AA7BD', sw: 1.5, glow: false, room: true, panel: true, chips: true, animated: true,
  },
  neon: {
    name: '霓虹 HUD · 科技展', en: 'Glow + flowing particles',
    bg: 'radial-gradient(130% 110% at 50% 10%, #08203a 0%, #040a1a 55%, #02060f 100%)',
    grid: 'rgba(34,211,238,.10)', gridStep: 30,
    stroke: '#22D3EE', dim: '#15616f', accent: '#84CC16', hot: '#ff4d6d',
    label: '#dffbff', text: '#5fd6e6', sw: 1.5, glow: true, animated: true, particles: true,
  },
  pid: {
    name: 'P&ID 工程線圖', en: 'ISA symbols · minimal',
    bg: '#0c0f15',
    grid: 'rgba(40,46,58,.5)', gridStep: 24,
    stroke: '#d3dbe6', dim: '#5b6472', accent: '#E40613', hot: '#E40613',
    label: '#eef2f7', text: '#8b95a4', sw: 1.25, glow: false, pid: true, mono: true,
  },
  glass: {
    name: '玻璃霓虹卡 Glass', en: 'Carded · frosted depth',
    bg: 'radial-gradient(120% 120% at 50% 0%, #15213a 0%, #0a1322 60%, #070d18 100%)',
    grid: 'rgba(60,90,130,.10)', gridStep: 30,
    stroke: '#b7c6dc', dim: '#48597a', accent: '#22D3EE', hot: '#F59E0B',
    label: '#eaf2fc', text: '#9fb0c8', sw: 1.35, glow: true, card: true, chips: true, animated: true,
  },
};

const STATUS_COLOR = { run: '#22C55E', standby: '#22D3EE', warn: '#F59E0B', fault: '#EF4444' };

// ---- small shape helpers (return SVG fragments) -----------------------------
function Bolts({ cx, cy, r, n = 8, rb = 1.6, color }) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(<circle key={i} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={rb} fill={color} stroke="none" />);
  }
  return <g>{out}</g>;
}

// flange on a horizontal pipe: two short verticals + bolt dots
function HFlange({ x, cy, ph, t, color }) {
  const c = color || t.stroke;
  return (
    <g stroke={c} strokeWidth={t.sw} fill="none">
      <line x1={x} y1={cy - ph - 5} x2={x} y2={cy + ph + 5} />
      <line x1={x + 6} y1={cy - ph - 5} x2={x + 6} y2={cy + ph + 5} />
      <circle cx={x + 3} cy={cy - ph - 3} r={1.5} fill={c} stroke="none" />
      <circle cx={x + 3} cy={cy + ph + 3} r={1.5} fill={c} stroke="none" />
    </g>
  );
}

function Handwheel({ cx, cy, r, t, color }) {
  const c = color || t.stroke;
  return (
    <g stroke={c} strokeWidth={t.sw} fill="none">
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={r * 0.32} />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} />
      <line x1={cx - r * 0.7} y1={cy - r * 0.7} x2={cx + r * 0.7} y2={cy + r * 0.7} />
      <line x1={cx - r * 0.7} y1={cy + r * 0.7} x2={cx + r * 0.7} y2={cy - r * 0.7} />
    </g>
  );
}

function Gauge({ cx, cy, r, t, color }) {
  const c = color || t.accent;
  return (
    <g stroke={c} strokeWidth={t.sw} fill="none">
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={r * 0.12} fill={c} stroke="none" />
      <line x1={cx} y1={cy} x2={cx + r * 0.62} y2={cy - r * 0.5} strokeWidth={t.sw * 0.9} />
      {[-0.8, -0.4, 0, 0.4, 0.8].map((k, i) => (
        <line key={i} x1={cx + Math.cos(Math.PI * (1.5 + k)) * r * 0.78} y1={cy + Math.sin(Math.PI * (1.5 + k)) * r * 0.78}
          x2={cx + Math.cos(Math.PI * (1.5 + k)) * r} y2={cy + Math.sin(Math.PI * (1.5 + k)) * r} strokeWidth={t.sw * 0.7} />
      ))}
    </g>
  );
}

// One pump+motor skid drawn in a local ~720x210 box, baseplate near y=190.
function PumpMotorUnit({ t, status = 'run', animated }) {
  const sc = STATUS_COLOR[status] || t.stroke;
  const cy = 116;        // shaft centerline
  const ph = 11;         // pipe half-height
  const S = { stroke: t.stroke, strokeWidth: t.sw, fill: 'none', strokeLinejoin: 'round', strokeLinecap: 'round' };
  const Sdim = { stroke: t.dim, strokeWidth: t.sw, fill: 'none' };
  const fanSpin = animated && (status === 'run' || status === 'warn');
  return (
    <g>
      {/* ===== skid baseplate ===== */}
      <rect x={92} y={186} width={604} height={16} rx={2} {...Sdim} />
      <line x1={92} y1={190} x2={696} y2={190} {...Sdim} />
      {[150, 300, 470, 640].map((x, i) => <rect key={i} x={x} y={202} width={20} height={7} {...Sdim} />)}

      {/* ===== suction pipe (axial, into pump eye) ===== */}
      <line x1={6} y1={cy - ph} x2={158} y2={cy - ph} {...S} />
      <line x1={6} y1={cy + ph} x2={158} y2={cy + ph} {...S} />
      <HFlange x={64} cy={cy} ph={ph} t={t} />
      <HFlange x={126} cy={cy} ph={ph} t={t} />
      <ellipse cx={158} cy={cy} rx={5} ry={22} {...S} />

      {/* ===== end-suction centrifugal pump ===== */}
      <circle cx={200} cy={cy} r={46} {...S} />
      <circle cx={203} cy={cy + 2} r={30} {...Sdim} />
      <circle cx={200} cy={cy} r={15} {...Sdim} strokeDasharray="3 3" />
      <Bolts cx={200} cy={cy} r={46} n={14} rb={1.4} color={t.dim} />
      <path d={`M184 150 L180 186 L220 186 L216 150`} {...Sdim} />

      {/* discharge nozzle + riser + gate valve + gauge */}
      <line x1={188} y1={cy - 44} x2={188} y2={40} {...S} />
      <line x1={212} y1={cy - 45} x2={212} y2={40} {...S} />
      <line x1={188} y1={40} x2={212} y2={40} {...S} />
      <HFlange x={185} cy={56} ph={0} t={t} />
      <Handwheel cx={200} cy={64} r={18} t={t} />
      <Gauge cx={244} cy={48} r={13} t={t} />
      <line x1={212} y1={58} x2={233} y2={52} {...Sdim} />

      {/* ===== bearing frame + coupling guard ===== */}
      <path d={`M246 ${cy - 16} L274 ${cy - 16} L274 ${cy + 16} L246 ${cy + 16}`} {...S} />
      {[252, 260, 268].map((x, i) => <line key={i} x1={x} y1={cy - 16} x2={x} y2={cy + 16} {...Sdim} />)}
      <path d={`M250 ${cy + 16} L250 186 L272 186 L272 ${cy + 16}`} {...Sdim} />
      <line x1={274} y1={cy} x2={312} y2={cy} {...S} />
      <rect x={278} y={cy - 17} width={30} height={34} rx={3} {...S} />
      {[285, 293, 301].map((x, i) => <line key={i} x1={x} y1={cy - 17} x2={x} y2={cy + 17} {...Sdim} />)}

      {/* ===== TEFC electric motor ===== */}
      {/* drive-end bearing bracket */}
      <path d={`M300 74 L312 74 L312 158 L300 158 Z`} {...S} />
      <line x1={306} y1={74} x2={306} y2={158} {...Sdim} />
      {/* main finned frame */}
      <rect x={312} y={62} width={254} height={108} rx={9} {...S} />
      <line x1={312} y1={76} x2={566} y2={76} {...Sdim} />
      <line x1={312} y1={156} x2={566} y2={156} {...Sdim} />
      <g opacity={0.7}>
        {Array.from({ length: 25 }).map((_, i) => (
          <line key={i} x1={322 + i * 9.5} y1={78} x2={322 + i * 9.5} y2={154} {...Sdim} />
        ))}
      </g>
      {/* conduit / terminal box */}
      <path d={`M356 62 L356 40 Q356 36 360 36 L428 36 Q432 36 432 40 L432 62`} {...S} />
      <line x1={356} y1={48} x2={432} y2={48} {...Sdim} />
      <line x1={374} y1={62} x2={374} y2={70} {...S} />
      <line x1={414} y1={62} x2={414} y2={70} {...S} />
      {/* lifting eye */}
      <path d={`M470 62 Q470 50 480 50 Q490 50 490 62`} {...S} />
      <circle cx={480} cy={53} r={3.6} {...Sdim} />
      {/* non-drive-end fan cowl (domed) */}
      <path d={`M566 72 L592 72 Q606 72 606 ${cy} Q606 160 592 160 L566 160`} {...S} />
      <circle cx={583} cy={cy} r={17} {...Sdim} className={fanSpin ? 'md-spin' : ''} />
      {fanSpin && <g className="md-spin">
        {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1={583} y1={cy} x2={583 + 15 * Math.cos(i * Math.PI / 3)} y2={cy + 15 * Math.sin(i * Math.PI / 3)} stroke={t.dim} strokeWidth={t.sw} />)}
      </g>}
      {/* cast feet */}
      {[336, 512].map((fx, i) => (
        <g key={i}>
          <path d={`M${fx} 170 L${fx - 8} 186 L${fx + 46} 186 L${fx + 38} 170 Z`} {...Sdim} />
          <circle cx={fx + 19} cy={181} r={2.4} {...Sdim} />
        </g>
      ))}

      {/* status node on the pump */}
      <circle cx={200} cy={cy} r={6} fill={sc} stroke="none" className={animated && status !== 'standby' ? 'md-pulse' : ''} />
      {t.glow && <circle cx={200} cy={cy} r={6} fill="none" stroke={sc} strokeWidth="1" opacity=".5" />}
    </g>
  );
}

function HudPanel({ t, units }) {
  const tx = (s) => ({ fill: t.text, fontFamily: t.mono ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: 12, ...s });
  return (
    <g>
      {/* System overview card */}
      <g transform="translate(0,0)">
        <rect x={0} y={0} width={250} height={232} rx={10} fill="rgba(10,30,60,.35)" stroke={t.dim} strokeWidth={t.sw} />
        <text x={18} y={28} style={tx({ fill: t.label, fontWeight: 700, letterSpacing: 1 })}>SYSTEM OVERVIEW</text>
        {/* mini schematic */}
        <g stroke={t.stroke} strokeWidth={t.sw} fill="none" transform="translate(18,42)">
          <line x1={6} y1={26} x2={206} y2={26} />
          {[40, 100, 160].map((x, i) => (<g key={i}><rect x={x} y={14} width={20} height={24} rx={2} /><circle cx={x + 10} cy={8} r={5} /></g>))}
        </g>
        {units.map((u, i) => (
          <g key={i} transform={`translate(18,${110 + i * 26})`}>
            <text x={0} y={0} style={tx()}>{('PUMP 0' + (i + 1))}</text>
            <line x1={70} y1={-4} x2={150} y2={-4} stroke={t.dim} strokeWidth={t.sw} strokeDasharray="2 3" />
            <circle cx={168} cy={-4} r={4} fill={STATUS_COLOR[u.status]} stroke="none" />
            <text x={184} y={0} style={tx({ fill: t.label, fontWeight: 700 })}>{u.status === 'run' ? 'OK' : u.status === 'standby' ? 'STBY' : u.status === 'warn' ? 'WARN' : 'FAULT'}</text>
          </g>
        ))}
        <line x1={18} y1={202} x2={232} y2={202} stroke={t.dim} strokeWidth={t.sw} />
        <text x={18} y={222} style={tx()}>SYSTEM STATUS</text>
        <text x={232} y={222} textAnchor="end" style={tx({ fill: t.accent, fontWeight: 700 })}>ONLINE</text>
      </g>
      {/* Performance card */}
      <g transform="translate(0,252)">
        <rect x={0} y={0} width={250} height={150} rx={10} fill="rgba(10,30,60,.35)" stroke={t.dim} strokeWidth={t.sw} />
        <text x={18} y={26} style={tx({ fill: t.label, fontWeight: 700, letterSpacing: 1 })}>PERFORMANCE</text>
        <path d="M18 78 q12 -26 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" stroke={t.accent} strokeWidth={t.sw} fill="none" />
        {[0, 1, 2, 3].map(i => <line key={i} x1={18} y1={104 + i * 11} x2={120} y2={104 + i * 11} stroke={t.dim} strokeWidth={t.sw} strokeDasharray="2 3" />)}
        <circle cx={206} cy={112} r={24} stroke={t.dim} strokeWidth="4" fill="none" />
        <circle cx={206} cy={112} r={24} stroke={t.accent} strokeWidth="4" fill="none" strokeDasharray={`${2 * Math.PI * 24 * 0.98} ${2 * Math.PI * 24}`} transform="rotate(-90 206 112)" strokeLinecap="round" />
        <text x={206} y={116} textAnchor="middle" style={tx({ fill: t.label, fontWeight: 700, fontSize: 13 })}>98%</text>
      </g>
      {/* IoT connectivity card */}
      <g transform="translate(0,418)">
        <rect x={0} y={0} width={250} height={196} rx={10} fill="rgba(10,30,60,.35)" stroke={t.dim} strokeWidth={t.sw} />
        <text x={18} y={26} style={tx({ fill: t.label, fontWeight: 700, letterSpacing: 1 })}>IOT CONNECTIVITY</text>
        <g stroke={t.stroke} strokeWidth={t.sw} fill="none" transform="translate(18,40)">
          <path d="M14 26 a10 10 0 0 1 1 -20 a13 13 0 0 1 24 4 a9 9 0 0 1 -3 18 z" />
          <path d="M48 8 a14 14 0 0 1 4 10" /><path d="M52 2 a20 20 0 0 1 6 16" />
        </g>
        {[['SENSORS', 'ACTIVE'], ['VIBRATION', 'NORMAL'], ['PRESSURE', 'NORMAL'], ['FLOW', 'NORMAL'], ['TEMP.', 'NORMAL']].map((r, i) => (
          <g key={i} transform={`translate(18,${108 + i * 17})`}>
            <text x={0} y={0} style={tx()}>{r[0]}</text>
            <line x1={86} y1={-4} x2={150} y2={-4} stroke={t.dim} strokeWidth={t.sw} strokeDasharray="2 3" />
            <text x={232} y={0} textAnchor="end" style={tx({ fill: i === 0 ? t.accent : t.text, fontWeight: 700 })}>{r[1]}</text>
          </g>
        ))}
      </g>
    </g>
  );
}

function MotorDiagram({ theme = 'blueprint', units, title = '配水加壓機組', animated: animProp }) {
  const t = SCHEMATIC_THEMES[theme] || SCHEMATIC_THEMES.blueprint;
  const list = units || [{ status: 'run' }, { status: 'run' }, { status: 'warn' }];
  const animated = animProp != null ? animProp : t.animated;
  const VW = t.hud ? 1320 : 1040;
  const VH = 760;
  const gx = 70, gy = 70;           // diagram origin
  const unitH = 200, gap = 18;
  const gridId = 'mdg-' + theme;
  const blurId = 'mdb-' + theme;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id={gridId} width={t.gridStep} height={t.gridStep} patternUnits="userSpaceOnUse">
          <path d={`M ${t.gridStep} 0 L 0 0 0 ${t.gridStep}`} fill="none" stroke={t.grid} strokeWidth="1" />
        </pattern>
        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={theme === 'neon' ? 2.2 : 1.1} result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={'mdsh-' + theme} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* background */}
      <rect x="0" y="0" width={VW} height={VH} fill={theme === 'control' ? '#0B1220' : (theme === 'pid' ? '#0c0f15' : '#08152c')} />
      <rect x="0" y="0" width={VW} height={VH} fill={`url(#${gridId})`} />

      {/* room enclosure */}
      {t.room && (
        <g stroke={t.dim} strokeWidth={t.sw} fill="none" opacity=".8">
          <rect x={30} y={36} width={(t.hud ? 900 : VW - 60)} height={VH - 72} rx={6} />
          <line x1={30} y1={60} x2={t.hud ? 930 : VW - 30} y2={60} strokeDasharray="2 6" opacity=".5" />
        </g>
      )}

      {/* inlet / outlet manifolds */}
      <g style={{ filter: t.glow ? `url(#${blurId})` : 'none' }}>
        {/* left suction manifold (清水池) */}
        <line x1={56} y1={gy + 30} x2={56} y2={gy + 30 + (list.length - 1) * (unitH + gap) + 60} stroke={t.stroke} strokeWidth={t.sw * 1.6} />
        {/* right discharge manifold (配水) */}
        <line x1={(t.hud ? 880 : VW - 70)} y1={gy + 4} x2={(t.hud ? 880 : VW - 70)} y2={gy + 30 + (list.length - 1) * (unitH + gap) + 30} stroke={t.stroke} strokeWidth={t.sw * 1.6} />

        {list.map((u, i) => {
          const oy = gy + i * (unitH + gap);
          const dischX = gx + 210, topY = oy + 40;
          return (
            <g key={i}>
              {/* glass card backing */}
              {t.card && (
                <g style={{ filter: `url(#mdsh-${theme})` }}>
                  <rect x={gx - 28} y={oy + 6} width={690} height={208} rx={16}
                    fill="rgba(170,200,235,.06)" stroke={`${t.accent}44`} strokeWidth="1" />
                  <line x1={gx - 16} y1={oy + 8} x2={gx + 650} y2={oy + 8} stroke="rgba(255,255,255,.14)" strokeWidth="1" />
                </g>
              )}
              {/* discharge run to right manifold */}
              <line x1={gx + 210} y1={oy + 40} x2={(t.hud ? 880 : VW - 70)} y2={oy + 40}
                stroke={t.stroke} strokeWidth={t.sw}
                className={animated ? 'md-flow' : ''} strokeDasharray={animated ? '8 7' : undefined} />
              <g transform={`translate(${gx},${oy})`}>
                <PumpMotorUnit t={t} status={u.status || 'run'} animated={animated} />
              </g>
            </g>
          );
        })}
        {/* suction feeders */}
        {list.map((u, i) => {
          const oy = gy + i * (unitH + gap);
          return <line key={i} x1={56} y1={oy + 116} x2={gx + 6} y2={oy + 116} stroke={t.stroke} strokeWidth={t.sw}
            className={animated ? 'md-flow' : ''} strokeDasharray={animated ? '8 7' : undefined} />;
        })}
      </g>

      {/* flowing particles for neon */}
      {t.particles && list.map((u, i) => {
        const oy = gy + i * (unitH + gap);
        return (
          <circle key={i} r="3.2" fill={t.accent}>
            <animateMotion dur={`${2.4 + i * 0.3}s`} repeatCount="indefinite"
              path={`M56 ${oy + 116} L${gx + 6} ${oy + 116}`} />
          </circle>
        );
      })}

      {/* endpoint labels */}
      <g fontFamily={t.mono ? 'var(--font-mono)' : 'var(--font-sans)'}>
        <text x={56} y={gy + 18} textAnchor="middle" fontSize="15" fontWeight="700" fill={t.label}>清水池</text>
        <text x={56} y={VH - 30} textAnchor="middle" fontSize="11" fill={t.text}>CLEAR WELL</text>
        <text x={(t.hud ? 880 : VW - 70)} y={gy - 8} textAnchor="middle" fontSize="15" fontWeight="700" fill={t.label}>配水加壓</text>
        {list.map((u, i) => {
          const oy = gy + i * (unitH + gap);
          return (
            <g key={i}>
              <text x={gx + 410} y={oy + 200} textAnchor="middle" fontSize="13" fontWeight="700" fill={t.label}>{`P-30${i + 1}`}</text>
              <text x={gx + 540} y={oy + 200} textAnchor="middle" fontSize="11" fill={t.text}>{`配水加壓泵 #${i + 1}`}</text>
              {t.chips && (
                <g transform={`translate(${gx + 6},${oy + 30})`}>
                  <rect x={0} y={-14} width={64} height={20} rx={4} fill={`${STATUS_COLOR[u.status || 'run']}22`} stroke="none" />
                  <text x={32} y={0} textAnchor="middle" fontSize="11" fontWeight="700" fill={STATUS_COLOR[u.status || 'run']}>
                    {(u.status === 'warn' ? '警告' : u.status === 'standby' ? '備援' : u.status === 'fault' ? '故障' : '運轉')}
                  </text>
                </g>
              )}
              {t.pid && (
                <g>
                  <line x1={gx + 210} y1={oy + 116} x2={gx + 210} y2={oy + 232} stroke={t.dim} strokeWidth={t.sw} strokeDasharray="3 3" />
                  <circle cx={gx + 210} cy={oy + 246} r={16} fill="none" stroke={t.stroke} strokeWidth={t.sw} />
                  <line x1={gx + 194} y1={oy + 246} x2={gx + 226} y2={oy + 246} stroke={t.stroke} strokeWidth={t.sw} />
                  <text x={gx + 210} y={oy + 243} textAnchor="middle" fontSize="8" fill={t.text}>PI</text>
                  <text x={gx + 210} y={oy + 254} textAnchor="middle" fontSize="8" fill={t.text}>30{i + 1}</text>
                </g>
              )}
            </g>
          );
        })}
      </g>

      {/* HUD side panel (blueprint) */}
      {t.hud && <g transform="translate(1040,70)"><HudPanel t={t} units={list.map((u, i) => ({ status: u.status || 'run' }))} /></g>}

      {/* title plate */}
      <g fontFamily={t.mono ? 'var(--font-mono)' : 'var(--font-sans)'}>
        <text x={30} y={VH - 14} fontSize="12" fill={t.text} letterSpacing="1">{title} · CLEAR WELL → DISTRIBUTION PUMPING</text>
      </g>
    </svg>
  );
}

Object.assign(window, { MotorDiagram, SCHEMATIC_THEMES, STATUS_COLOR, PumpMotorUnit, Bolts, HFlange, Handwheel, SchematicGauge: Gauge });
