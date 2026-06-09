// BlueprintBoard.jsx — interactive blueprint motor diagram.
// Running units first, standby moved to the end. Each unit shows a right-side live-data panel.

function BlueprintBoard({ motors, selectedId, onSelect, onAdd, onRemove, animated = true, canAdd = true }) {
  const t = window.SCHEMATIC_THEMES.blueprint;
  const SC = window.STATUS_COLOR;
  const gx = 70, gy = 60, unitH = 200, gap = 20;
  const VW = 1120;
  const leftX = 52, rightX = 1088;
  // display order: running/warn first, standby (備援) pushed to the end
  const dm = motors.map((m, i) => ({ m, i }))
    .sort((a, b) => ((a.m.status === 'standby' ? 1 : 0) - (b.m.status === 'standby' ? 1 : 0)) || (a.i - b.i))
    .map(x => x.m);
  const bodyH = dm.length * (unitH + gap);
  const addH = canAdd ? 92 : 16;
  const VH = gy + bodyH + addH + 30;
  const manifoldBot = gy + (dm.length - 1) * (unitH + gap) + 150;
  const fontMono = 'var(--font-mono)';

  // right-side live metric panel for one unit
  const livePanel = (m, oy, sel) => {
    const px = 786, pw = 276, py = oy + 50, ph = 140;
    const col = SC[m.status] || t.stroke;
    if (m.status === 'standby') {
      return (
        <g>
          <rect x={px} y={py} width={pw} height={ph} rx={9} fill="rgb(9,19,38)" filter="url(#bb-shadow)" stroke={t.dim} strokeWidth="1" strokeDasharray="5 4" opacity=".92" />
          <text x={px + pw / 2} y={py + ph / 2 - 4} textAnchor="middle" fontSize="13" fontWeight="700" fill={t.text} fontFamily={fontMono}>備援待命</text>
          <text x={px + pw / 2} y={py + ph / 2 + 15} textAnchor="middle" fontSize="10" fill={t.dim} fontFamily={fontMono}>{m.role} · 可隨時投入</text>
        </g>
      );
    }
    const metric = (mx, my, label, val, unit, vcol) => (
      <g>
        <text x={mx} y={my} fontSize="9.5" fill={t.text} fontFamily={fontMono}>{label}</text>
        <text x={mx} y={my + 19} fontSize="16.5" fontWeight="700" fill={vcol || t.label} fontFamily={fontMono}>{val}<tspan fontSize="9.5" fill={t.text} dx="2">{unit}</tspan></text>
      </g>
    );
    const c1 = px + 16, c2 = px + 148;
    return (
      <g>
        {/* opaque instrument card (with shadow) so the schematic does not bleed through */}
        <rect x={px} y={py} width={pw} height={ph} rx={9} fill="rgb(10,22,44)" filter="url(#bb-shadow)" stroke={sel ? t.accent : `${col}88`} strokeWidth={sel ? 1.5 : 1.1} />
        <circle cx={px + 14} cy={py + 16} r={3.2} fill={col} className="md-pulse" />
        <text x={px + 24} y={py + 20} fontSize="10.5" fontWeight="700" fill={t.accent} fontFamily={fontMono} letterSpacing="1">即時數據 LIVE</text>
        <text x={px + pw - 12} y={py + 20} textAnchor="end" fontSize="9.5" fill={t.text} fontFamily={fontMono}>{m.hp}HP · {m.pipe}</text>
        <line x1={px + 12} y1={py + 29} x2={px + pw - 12} y2={py + 29} stroke={t.dim} strokeWidth="1" opacity=".5" />
        {metric(c1, py + 46, '頻率', m.freq, 'Hz', t.accent)}
        {metric(c2, py + 46, '轉速', (m.rpm || 0).toLocaleString(), 'rpm')}
        {metric(c1, py + 84, '功率', (m.power_kw || 0).toLocaleString(), 'kW')}
        {metric(c2, py + 84, '出水量', (m.flow_cmd || 0).toLocaleString(), 'CMD')}
        {/* specific energy highlighted */}
        <rect x={px + 12} y={py + 106} width={pw - 24} height={24} rx={5} fill="rgba(34,197,94,.12)" stroke="rgba(34,197,94,.35)" strokeWidth="1" />
        <text x={c1} y={py + 122} fontSize="9.5" fill={t.text} fontFamily={fontMono}>單位電耗</text>
        <text x={px + pw - 18} y={py + 123} textAnchor="end" fontSize="14" fontWeight="700" fill="#22C55E" fontFamily={fontMono}>{m.sec_kwh_m3}<tspan fontSize="9" fill={t.text} dx="2">kWh/m³</tspan></text>
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: 'block' }} preserveAspectRatio="xMidYMin meet">
      <defs>
        <pattern id="bb-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M 26 0 L 0 0 0 26" fill="none" stroke={t.grid} strokeWidth="1" />
        </pattern>
        <filter id="bb-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.1" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="bb-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#03060e" floodOpacity="0.6" />
        </filter>
      </defs>

      <rect x="0" y="0" width={VW} height={VH} fill="#08152c" />
      <rect x="0" y="0" width={VW} height={VH} fill="url(#bb-grid)" />

      {/* enclosure */}
      <g stroke={t.dim} strokeWidth={t.sw} fill="none" opacity=".7">
        <rect x={24} y={28} width={VW - 48} height={VH - 56} rx={6} />
        <line x1={24} y1={52} x2={VW - 24} y2={52} strokeDasharray="2 6" opacity=".5" />
      </g>

      {/* selection highlight (behind machinery, no bounding box) */}
      {dm.map((m, i) => {
        if (m.id !== selectedId) return null;
        const oy = gy + i * (unitH + gap);
        return (
          <g key={m.id}>
            <rect x={30} y={oy + 4} width={VW - 60} height={unitH + 14} rx={12} fill="rgba(124,212,255,.07)" stroke="rgba(124,212,255,.22)" strokeWidth="1" />
            <rect x={30} y={oy + 4} width={4} height={unitH + 14} rx={2} fill={t.accent} />
          </g>
        );
      })}

      {/* manifolds + machinery (glow) */}
      <g style={{ filter: `url(#bb-glow)` }}>
        <line x1={leftX} y1={gy + 26} x2={leftX} y2={manifoldBot} stroke={t.stroke} strokeWidth={t.sw * 1.7} />
        <line x1={rightX} y1={gy} x2={rightX} y2={manifoldBot - 20} stroke={t.stroke} strokeWidth={t.sw * 1.7} />

        {dm.map((m, i) => {
          const oy = gy + i * (unitH + gap);
          return (
            <g key={m.id}>
              <line x1={gx + 200} y1={oy + 40} x2={rightX} y2={oy + 40} stroke={t.stroke} strokeWidth={t.sw}
                className={animated && m.status !== 'standby' ? 'md-flow' : ''} strokeDasharray={animated && m.status !== 'standby' ? '8 7' : undefined} opacity={m.status === 'standby' ? 0.4 : 1} />
              <line x1={leftX} y1={oy + 116} x2={gx + 6} y2={oy + 116} stroke={t.stroke} strokeWidth={t.sw}
                className={animated && m.status !== 'standby' ? 'md-flow' : ''} strokeDasharray={animated && m.status !== 'standby' ? '8 7' : undefined} opacity={m.status === 'standby' ? 0.4 : 1} />
              <g transform={`translate(${gx},${oy})`} opacity={m.status === 'standby' ? 0.4 : (m.id === selectedId ? 1 : 0.55)}>
                <window.PumpMotorUnit t={t} status={m.status} animated={animated} />
              </g>
            </g>
          );
        })}
      </g>

      {/* labels + live panel + click targets */}
      {dm.map((m, i) => {
        const oy = gy + i * (unitH + gap);
        const sel = m.id === selectedId;
        const col = SC[m.status] || t.stroke;
        const x0 = 36, x1 = 1072, y0 = oy + 8, y1 = oy + 214;
        return (
          <g key={m.id}>
            {/* tag + name */}
            <text x={gx + 320} y={oy + 198} textAnchor="middle" fontSize="13" fontWeight="700" fill={sel ? t.accent : t.label} fontFamily={fontMono}>{m.id}</text>
            <text x={gx + 470} y={oy + 198} textAnchor="middle" fontSize="11" fill={t.text}>{m.role}</text>
            <g transform={`translate(${gx + 4},${oy + 26})`}>
              <rect x={0} y={-14} width={66} height={20} rx={4} fill={`${col}22`} />
              <circle cx={11} cy={-4} r={3} fill={col} />
              <text x={38} y={0} textAnchor="middle" fontSize="11" fontWeight="700" fill={col} fontFamily={fontMono}>
                {m.status === 'warn' ? '警告' : m.status === 'standby' ? '備援' : m.status === 'fault' ? '故障' : '運轉'}
              </text>
            </g>

            {/* right-side live data panel */}
            {livePanel(m, oy, sel)}

            {/* click target */}
            <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="transparent" style={{ cursor: 'pointer' }}
              onClick={() => onSelect && onSelect(m.id)} />
          </g>
        );
      })}

      {/* endpoint labels */}
      <g fontFamily={fontMono}>
        <text x={leftX} y={gy + 12} textAnchor="middle" fontSize="14" fontWeight="700" fill={t.label}>清水池</text>
        <text x={leftX} y={manifoldBot + 18} textAnchor="middle" fontSize="10" fill={t.text}>CLEAR WELL</text>
        <text x={rightX} y={gy - 14} textAnchor="middle" fontSize="14" fontWeight="700" fill={t.label}>配水池</text>
        <text x={rightX} y={manifoldBot} textAnchor="middle" fontSize="10" fill={t.text}>DISTRIBUTION</text>
      </g>

      {/* add-motor tile */}
      {canAdd && (
        <g transform={`translate(0,${gy + bodyH - 4})`} style={{ cursor: 'pointer' }} onClick={() => onAdd && onAdd()}>
          <rect x={36} y={0} width={1048} height={72} rx={10} fill="rgba(65,166,255,.05)" stroke={t.stroke} strokeWidth="1.2" strokeDasharray="7 6" />
          <g transform="translate(540,36)" stroke={t.accent} strokeWidth="2" fill="none">
            <circle r={13} />
            <line x1={-6} y1={0} x2={6} y2={0} /><line x1={0} y1={-6} x2={0} y2={6} />
          </g>
          <text x={558} y={41} fontSize="14" fontWeight="700" fill={t.label} fontFamily={fontMono}>新增馬達機組</text>
        </g>
      )}
    </svg>
  );
}

window.BlueprintBoard = BlueprintBoard;
