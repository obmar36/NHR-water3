// stationData2.jsx — operations layer: model-grounded recommendations, AI Q&A, RBAC.
// 所有建議皆出自真實節能模型（現場曲線 + 選泵窮舉 + TOU + 驗證），非虛構單泵感測值。

// ---- operator recommendations / proactive guidance -------------------------
// kind: 'dispatch' 帶 cfg(可套用之機組頻率配置) ; 'note' 僅提示/確認。
const GUIDANCE = [
  {
    id: 'R-NIGHT', level: 'info', dev: '機組調度', t: '夜間', status: '待處理', kind: 'dispatch',
    title: '夜間調度 · 改用 100HP 雙機、停 150HP',
    short: '夜間改用 100HP 雙機更省電',
    brief: '夜間水量約 8,000 CMD，用 P3 + P4（100HP）就夠，可停 P2（150HP）。',
    detail: '夜間需求約 8,000 CMD，以 100HP 組（P3@57 主底 + P4@51 輔助）承接即足；可停日間保底之 150HP_P2。100HP 在現場狀況下健康、效率約 70%，遠高於已衰退的 150HP（約 54%）。',
    action: '切換夜間調度', cfg: { P3_100HP: 57, P4_100HP: 51 }, save: 39, savekw: 82,
    steps: ['停 150HP_P2，保留 100HP_P3@57Hz 為夜間主底', '100HP_P4@51Hz 依配水池水位輔助投入', '確認配水池回升速度足夠；不足時 P3 可提升至 60Hz'],
  },
  {
    id: 'R-RULE', level: 'info', dev: 'P2 / P1', t: '法則', status: '待處理', kind: 'dispatch',
    title: '確定性節能法則 · 以 P2@55 取代 P1@60',
    short: '日間用 P2 取代 P1 更省電',
    brief: '同樣出水量，P2@55Hz 比 P1@60Hz 少用約 15% 的電。',
    detail: '相近出水量下，P2@55Hz（約 3,797 CMD）較 P1@60Hz（約 4,430 CMD）少約 15% 輸入功率；且 P1 現場已衰退（−2,539 CMD vs 出廠）。日間高流量一律以 P2 保底、P1 列備用。',
    action: '套用 P2@55Hz 保底', cfg: { P2_150HP: 55, P3_100HP: 57, P4_100HP: 51 }, save: 15, savekw: 14,
    steps: ['日間以 150HP_P2@55Hz 保底，不啟用已衰退之 P1', '再依需求疊加 100HP_P3 / P4', '需求跨過 2,600 CMD 時 150HP 才考慮，並優先選 P2'],
  },
  {
    id: 'R-P2HZ', level: 'warn', dev: 'P3_100HP', t: '待確認', status: '待確認', kind: 'note',
    title: '夜間 P3 頻率 57 / 60Hz 版本待定版',
    detail: '報告控制邏輯與 P3 峰值效率點皆為 57Hz（SEC 0.387、效率 70.2%），平台暫定 57Hz；惟時段配置圖另出現 60Hz 保底版本。57Hz 較省電，但補水不足時需升 60Hz。',
    action: '向廠商／現場確認後定版', save: 0, savekw: 0,
    steps: ['以 57Hz 為暫定主底頻率試運轉', '監測配水池夜間回升速度', '回升不足時允許升至 60Hz；定版前並記錄兩版差異'],
  },
  {
    id: 'R-BILL', level: 'info', dev: '計費端', t: '策略', status: '待處理', kind: 'note',
    title: '計費端再優化 · 對齊台電半尖峰',
    detail: '本站作業習慣「尖峰」(早 07:30–14:00＋晚 17:00–22:30) ≠ 台電計費尖峰（僅 16:00–22:00）。將日間用電對齊計費半尖峰、避開 16–22 時尖峰電價（9.39 元/度），可在不增設備下再降電費。',
    action: '檢視 16–22 時負載配置', save: 0, savekw: 0,
    steps: ['盤點 16:00–22:00 之必要運轉台數', '可遞延之充水動作移至 22:00 後半尖峰', '估算移轉度數 × (9.39−5.85) 之每月節費'],
  },
  {
    id: 'R-DRIFT', level: 'info', dev: '站級', t: '監測', status: '監測中', kind: 'note',
    title: '站級健康 · 單位電耗趨勢正常',
    detail: '近期每日單位電耗 7 日中位數約 0.41 kWh/m³（站內監控錶口徑），低於 0.42 良好門檻。若回升至 0.42 以上代表效能退化、回到 0.47 視為退回改善前，屆時應重新巡檢選泵策略。',
    action: '維持監測', save: 0, savekw: 0,
    steps: ['以 7 日中位數而非單日值判讀', '剔除 04/01 抓表起點假影樣本', '回升至 0.42 觸發退化提醒'],
  },
  {
    id: 'R-METER', level: 'warn', dev: '計量', t: '待釐清', status: '待釐清', kind: 'note',
    title: '雙錶基準不一致 · 站內監控錶 ＞ 台電帳單',
    detail: '站內監控錶用電高於台電帳單（4月 122,509 vs 97,360；5月 112,610 vs 91,280），單位電耗基準差約 0.09。可能為錶計範圍、CT/PT 倍率、結算週期或擷取口徑差異，原因待釐清；前端並列雙基準、不混用。',
    action: '釐清 CT/PT 與結算口徑', save: 0, savekw: 0,
    steps: ['核對站內監控錶之 CT/PT 倍率設定', '比對結算週期與抄表時點', '釐清後再做雙錶校正係數'],
  },
];
const GUIDE_LEVELS = { crit: { zh: '嚴重', c: '#EF4444' }, warn: { zh: '待確認', c: '#F59E0B' }, info: { zh: '建議', c: '#22D3EE' } };

// ---- AI assistant: suggestion chips + canned answers (real numbers) ---------
const CHAT_SUGGEST = ['哪一台最該停、哪一台最該開？', '夜間 P3 要用 57 還是 60Hz？', '5 月到底省了多少？', '為什麼不直接套相似定律？', '單泵效率為什麼是「推估」？'];
const CHAT_CANNED = {
  '哪一台最該停、哪一台最該開？': {
    a: '夜間應「停 150HP、開 100HP」：100HP（P3/P4）現場效率約 70%，遠高於已衰退的 150HP（約 54%）。日間高流量才以 P2@55Hz 保底、P1 列備用。同馬力擇優以效率交叉點為界：150HP@2,600、100HP@3,400 CMD。',
    src: [{ doc: '4_效率交叉與選泵', loc: '交叉點/選泵法則' }, { doc: '3_現場效能曲線', loc: 'P1–P4 40–60Hz' }],
  },
  '夜間 P3 要用 57 還是 60Hz？': {
    a: '平台暫定 57Hz：與報告控制邏輯及 P3 峰值效率點一致（57Hz：SEC 0.387、泵效率 70.2%），較 60Hz 省電。但時段配置圖另有 60Hz 保底版本，且配水池夜間補水不足時允許升至 60Hz。57/60Hz 差異尚待向廠商／現場確認後定版。',
    src: [{ doc: '0_說明', loc: '資料限制 ⚠' }, { doc: '6_控制邏輯', loc: '改善後角色' }],
  },
  '5 月到底省了多少？': {
    a: '以台電帳單口徑：單位電耗由 4 月 0.383 降至 5 月 0.343 kWh/m³（5/5 啟動優化），降幅約 10%，且 5 月出水量反增至 266,230 m³。模型預測改善幅度約 9.8%（基準 0.444→加權 0.400），與帳單方向一致。注意：模型值、台電帳單、站內監控錶屬不同量測口徑，絕對值不可直接混用。',
    src: [{ doc: '8_月度彙總與驗證', loc: '3–5月' }, { doc: '7_每日統計', loc: 'SEC 趨勢' }],
  },
  '為什麼不直接套相似定律？': {
    a: '相似定律「功率 ∝ 轉速³」的前提是無靜揚程。本站靜揚程高（約 80 m）且 150HP 已水機衰退，直接套用會「高估」節能。因此本模型改採 40–60Hz 現場實測曲線查表／內插，得到的 kW 與單位電耗更貼近真實。',
    src: [{ doc: '0_說明', loc: '關鍵假設' }, { doc: '6_數據分析方法', loc: '方法論' }],
  },
  '單泵效率為什麼是「推估」？': {
    a: '目前無單泵獨立流量計與電表，僅有 300/400mm 管線流量、台電總帳單與單一站內監控錶。因此各泵的出水量／用電／單位電耗是「由頻率＋現場曲線推估」，非實測；軸承溫度、振動則完全無來源，標示「需取得」。裝單泵電表可升級至功率層診斷，再加流量＋壓力可做效率層劣化診斷。',
    src: [{ doc: '10_資料來源與版本', loc: '三層資料架構' }, { doc: 'README', loc: '兩條鐵則' }],
  },
};
function aiAnswer(q) {
  if (CHAT_CANNED[q]) return CHAT_CANNED[q];
  const key = Object.keys(CHAT_CANNED).find(k => q && (q.includes(k.slice(0, 4)) || k.includes(q.slice(0, 4))));
  if (key) return CHAT_CANNED[key];
  return { a: '我可依此站真實資料回答：選泵與頻率（現場曲線）、月度節能驗證、電價/碳排試算、資料缺口與限制。請指定機組（P1–P4）、時段或需求水量。本平台只呈現真實資料格式內之數據，不做無依據之單泵實測陳述。', src: [{ doc: '節能模型 v1.0', loc: '正式版' }] };
}
window.aiAnswer = aiAnswer;

// ---- RBAC: permissions, roles, users, audit --------------------------------
const PERMISSIONS = ['檢視即時監控', '檢視節能分析', '操作 VFD 頻率', '套用建議調度', '確認 / 處理建議', '管理通知規則', '設定使用者權限', '匯出報表 / 資料'];
const ROLES = [
  { id: 'manager', name: '營運所主管', en: 'Manager', perms: [true, true, 'approve', true, true, true, true, true] },
  { id: 'engineer', name: '節能工程師', en: 'Engineer', perms: [true, true, 'approve', true, true, true, false, true] },
  { id: 'operator', name: '值班操作員', en: 'Operator', perms: [true, true, 'mfa', false, true, false, false, false] },
  { id: 'viewer', name: '檢視者 / 稽核', en: 'Auditor', perms: [true, true, false, false, false, false, false, true] },
];
const USERS = [
  { name: '主管', role: '營運所主管', roleId: 'manager', mfa: true, status: '線上', last: '今天 14:30' },
  { name: '節能工程師', role: '節能工程師', roleId: 'engineer', mfa: true, status: '線上', last: '今天 14:22' },
  { name: '值班員', role: '值班操作員', roleId: 'operator', mfa: true, status: '值班中', last: '今天 14:31' },
  { name: '夜班員', role: '值班操作員', roleId: 'operator', mfa: true, status: '離線', last: '今天 06:40' },
  { name: '稽核帳號', role: '檢視者', roleId: 'viewer', mfa: false, status: '離線', last: '2 天前' },
];
const AUDIT = [
  { t: '14:30', user: '節能工程師', act: '套用建議調度：日間 3 台並聯 P3@57 + P4@51 + P2@55', tone: 'ok' },
  { t: '14:05', user: '值班員', act: '確認建議 R-DRIFT（單位電耗趨勢正常）', tone: 'info' },
  { t: '11:00', user: '系統', act: '依排程切換 時段3：加開 100HP_P3@57Hz', tone: 'info' },
  { t: '09:14', user: '值班員', act: 'MFA 驗證 · 操作員登入', tone: 'info' },
  { t: '05/05 15:30', user: '主管', act: '核准優化策略上線（改善前 → 改善後）', tone: 'ok' },
  { t: '昨天 18:20', user: '主管', act: '調整通知規則：待確認事項改推 LINE 群組', tone: 'warn' },
];

Object.assign(window, { GUIDANCE, GUIDE_LEVELS, CHAT_SUGGEST, CHAT_CANNED, PERMISSIONS, ROLES, USERS, AUDIT });
