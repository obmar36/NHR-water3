// stationData2.jsx — operations layer: model-grounded recommendations, AI Q&A, RBAC.
// 所有建議皆出自真實節能模型（現場曲線 + 選泵窮舉 + TOU + 驗證），非虛構單泵感測值。

// ---- operator recommendations / proactive guidance -------------------------
// kind: 'dispatch' 帶 cfg(可套用之機組頻率配置) ; 'note' 僅提示/確認。
const GUIDANCE = [
  {
    id: 'R-NIGHT', level: 'info', dev: '機組調度', t: '夜間', status: '待處理', kind: 'dispatch', win: '夜間 22:00–06:00', gen: '今日 18:05',
    title: '夜間調度 · 改用 100HP 雙機、停 150HP',
    short: '夜間改用 100HP 雙機更省電',
    brief: '夜間水量約 8,000 CMD，用 P1 + P2（100HP）就夠，可停 P3（150HP）。',
    detail: '夜間用水少（約 8,000 噸/日），開兩台 100HP（P1、P2）就夠用，可以把大台的 150HP（P3）停掉。100HP 目前狀況好、效率約 70%；150HP 已老化、效率只剩約 54%——讓省電的機組做事，自然更省。',
    action: '切換夜間調度', cfg: { P3_100HP: 57, P4_100HP: 51 }, save: 39, savekw: 82,
    steps: ['停掉 150HP（P3），改由 100HP 的 P1 當主力、頻率 57Hz', '100HP 的 P2 設 51Hz，水池水位低時再幫忙補水', '若水池回升太慢，P1 可暫時調到 60Hz'],
  },
  {
    id: 'R-RULE', level: 'info', dev: 'P3 / P4', t: '法則', status: '待處理', kind: 'dispatch', win: '日間 09:00–16:00', gen: '今日 08:30',
    title: '日間調度 · 用 P3 取代 P4 更省電',
    short: '日間用 P3 取代 P4 更省電',
    brief: '同樣出水量，P3@55Hz 比 P4@60Hz 少用約 15% 的電。',
    detail: '同樣的出水量，用 P3（55Hz）比用 P4（60Hz）少花約 15% 的電；而且 P4 已經老化，出水量比出廠少了快 2,540 噸/日。所以日間一律先用 P3，P4 只當備援。',
    action: '套用 P3@55Hz 保底', cfg: { P2_150HP: 55, P3_100HP: 57, P4_100HP: 51 }, save: 15, savekw: 14,
    steps: ['日間固定用 P3（55Hz）當主力，不開已老化的 P4', '水不夠時，再加開 100HP 的 P1、P2', '水量需求超過 2,600 噸/日才考慮 150HP，且優先選 P3'],
  },
  {
    id: 'R-P3HZ', level: 'warn', dev: 'P3_100HP', t: '待確認', status: '待確認', kind: 'note', win: '夜間時段（待定案）', gen: '5/20 待確認',
    title: '夜間 P1 要用 57 還是 60Hz？（待定案）',
    detail: '夜間 P1 的頻率還沒定案。57Hz 比較省電（也是 P1 效率最好的點：每噸水 0.387 度、效率 70.2%），但萬一水池補水太慢，就得拉到 60Hz。兩個版本的差異，建議跟廠商和現場確認後再定案。',
    action: '向廠商／現場確認後定版', save: 0, savekw: 0,
    steps: ['先用 57Hz 試運轉', '盯著夜間水池回升的速度', '補水不夠就允許升到 60Hz，並把兩種版本的差異記錄下來'],
  },
  {
    id: 'R-BILL', level: 'info', dev: '計費端', t: '策略', status: '待處理', kind: 'note', win: '尖峰 16:00–22:00', gen: '今日 08:30',
    title: '計費端再優化 · 對齊台電半尖峰',
    detail: '本站習慣講的「尖峰」（早 07:30–14:00、晚 17:00–22:30）跟台電真正算貴電價的尖峰（只有 16:00–22:00）不一樣。把日間用電盡量避開 16–22 點這段最貴的電（9.39 元/度），不用加任何設備就能再省電費。',
    action: '檢視 16–22 時負載配置', save: 0, savekw: 0,
    steps: ['先盤點 16:00–22:00 一定要開幾台', '可以晚點做的充水，移到 22:00 之後（電價較便宜）', '估算移走的度數 ×（9.39−5.85 元）＝每月可省的電費'],
  },
  {
    id: 'R-DRIFT', level: 'info', dev: '站級', t: '監測', status: '監測中', kind: 'note', win: '全天 · 持續監測', gen: '即時 · 每日更新',
    title: '站級健康 · 單位電耗趨勢正常',
    detail: '最近每天的「每噸水用電」7 天中位數約 0.41 度，低於 0.42 的良好門檻，代表運作正常。如果爬回 0.42 以上，就是效能開始退化的警訊；回到 0.47 就等於退回優化前，要重新檢視選泵策略。',
    action: '維持監測', save: 0, savekw: 0,
    steps: ['看 7 天中位數，不要被單天數字嚇到', '排除 04/01 抓表起點的異常值', '一旦回升到 0.42 就跳退化提醒'],
  },
  {
    id: 'R-METER', level: 'warn', dev: '計量', t: '待釐清', status: '待釐清', kind: 'note', win: '每月結算核對', gen: '5 月帳單後',
    title: '兩個電錶對不起來 · 站內錶比台電帳單高',
    detail: '兩個電錶數字對不起來：站內監控錶的用電一直比台電帳單高（4 月 122,509 vs 97,360；5 月 112,610 vs 91,280），每噸水用電的基準差約 0.09 度。可能是計算範圍、電錶倍率、結算週期或抓資料方式不同。原因釐清前，畫面會把兩個基準分開列、不混著看。',
    action: '釐清 CT/PT 與結算口徑', save: 0, savekw: 0,
    steps: ['核對站內監控錶的 CT/PT 倍率設定', '比對台電結算週期與抄表時間點', '釐清後再訂出兩錶的校正係數'],
  },
];
const GUIDE_LEVELS = { crit: { zh: '嚴重', c: '#EF4444' }, warn: { zh: '待確認', c: '#F59E0B' }, info: { zh: '建議', c: '#22D3EE' } };

// ---- AI assistant: suggestion chips + canned answers (real numbers) ---------
const CHAT_SUGGEST = ['哪一台最該停、哪一台最該開？', '夜間 P1 要用 57 還是 60Hz？', '5 月到底省了多少？', '為什麼不直接套相似定律？', '單泵效率為什麼是「推估」？'];
const CHAT_CANNED = {
  '哪一台最該停、哪一台最該開？': {
    a: '夜間就「停大台、開小台」：100HP（P1/P2）現在效率約 70%，比已經老化的 150HP（約 54%）省很多。白天水量大時才用 P3（55Hz）當主力、P4 當備援。同樣馬力要選哪台，看水量：到 2,600 噸/日換 150HP、到 3,400 噸/日換 100HP。',
    src: [{ doc: '4_效率交叉與選泵', loc: '交叉點/選泵法則' }, { doc: '3_現場效能曲線', loc: 'P1–P4 40–60Hz' }],
  },
  '夜間 P1 要用 57 還是 60Hz？': {
    a: '建議先用 57Hz——這是 P1 最省電、效率最好的點（每噸水 0.387 度、效率 70.2%），也跟報告的控制邏輯一致。只有在夜間水池補水不夠時才拉到 60Hz。兩版的最終定案還要跟廠商／現場確認。',
    src: [{ doc: '0_說明', loc: '資料限制 ⚠' }, { doc: '6_控制邏輯', loc: '改善後角色' }],
  },
  '5 月到底省了多少？': {
    a: '以台電帳單口徑：單位電耗由 4 月 0.383 降至 5 月 0.343 kWh/m³（5/5 啟動優化），降幅約 10%，且 5 月出水量反增至 266,230 m³。模型預測改善幅度約 9.8%（基準 0.444→加權 0.400），與帳單方向一致。注意：模型值、台電帳單、站內監控錶屬不同量測口徑，絕對值不可直接混用。',
    src: [{ doc: '8_月度彙總與驗證', loc: '3–5月' }, { doc: '7_每日統計', loc: 'SEC 趨勢' }],
  },
  '為什麼不直接套相似定律？': {
    a: '課本的「功率與轉速三次方成正比」只在沒有靜揚程時才準。本站要把水打高約 80 公尺（靜揚程大），加上 150HP 已老化，直接套公式會「高估」省電。所以我們改用每台泵 40–60Hz 的現場實測曲線，算出來的用電和每噸水電耗更接近真實。',
    src: [{ doc: '0_說明', loc: '關鍵假設' }, { doc: '6_數據分析方法', loc: '方法論' }],
  },
  '單泵效率為什麼是「推估」？': {
    a: '因為現在每台泵還沒有獨立的流量計和電表，只有管線總流量、台電總帳單和一支站內電錶。所以每台泵的出水量／用電／每噸水電耗，是「用頻率＋現場曲線算出來的」，不是直接量到的；軸承溫度、振動則完全沒有資料，標「需取得」。裝了單泵電表就能做功率層診斷，再加流量和壓力就能做效率劣化診斷。',
    src: [{ doc: '10_資料來源與版本', loc: '三層資料架構' }, { doc: 'README', loc: '兩條鐵則' }],
  },
};
function aiAnswer(q) {
  if (CHAT_CANNED[q]) return CHAT_CANNED[q];
  const key = Object.keys(CHAT_CANNED).find(k => q && (q.includes(k.slice(0, 4)) || k.includes(q.slice(0, 4))));
  if (key) return CHAT_CANNED[key];
  return { a: '我可以根據這個站的真實資料回答：怎麼選泵和頻率、這個月省了多少、電費和碳排試算、還有哪些資料還沒拿到。請指定機組（P1–P4）、時段或需求水量。沒有依據的單泵數字我不會亂編。', src: [{ doc: '節能模型 v1.0', loc: '正式版' }] };
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
  { t: '14:30', user: '節能工程師', act: '套用建議調度：日間 3 台並聯 P1@57 + P2@51 + P3@55', tone: 'ok' },
  { t: '14:05', user: '值班員', act: '確認建議 R-DRIFT（單位電耗趨勢正常）', tone: 'info' },
  { t: '11:00', user: '系統', act: '依排程切換 時段3：加開 100HP_P1@57Hz', tone: 'info' },
  { t: '09:14', user: '值班員', act: 'MFA 驗證 · 操作員登入', tone: 'info' },
  { t: '05/05 15:30', user: '主管', act: '核准優化策略上線（改善前 → 改善後）', tone: 'ok' },
  { t: '昨天 18:20', user: '主管', act: '調整通知規則：待確認事項改推 LINE 群組', tone: 'warn' },
];

// ---- operator suggestion feedback (回饋學習迴路) ---------------------------
// 操作員回報實際操作 / 更好的做法 → 系統偵測實際數據、判斷上次操作是否更佳。
const FEEDBACK_TYPES = [
  { id: 'adopt', label: '已採用建議', tone: '#22C55E' },
  { id: 'partial', label: '部分採用', tone: '#22D3EE' },
  { id: 'alt', label: '改用其他方式', tone: '#F59E0B' },
  { id: 'reject', label: '未採用', tone: '#9AA7BD' },
];
const FB_VERDICT = {
  improved: { zh: '達到更佳成效', c: '#22C55E', ic: '▲' },
  better_alt: { zh: '操作員方式更佳', c: '#84CC16', ic: '★' },
  flat: { zh: '與預期相當', c: '#22D3EE', ic: '≈' },
  worse: { zh: '未達預期', c: '#F59E0B', ic: '▼' },
  pending: { zh: '待數據比對', c: '#9AA7BD', ic: '…' },
};
// 已收集之回饋樣本（示範回饋學習迴路與系統判定）
const FEEDBACK_SEED = [
  {
    id: 'F-1042', recId: 'R-NIGHT', recTitle: '夜間調度 · 改用 100HP 雙機', user: '夜班員', t: '今天 06:38', type: 'adopt',
    text: '昨夜依建議停 150HP_P3、改 P1@57＋P2@51，配水池水位維持正常、補水足夠。',
    result: { verdict: 'improved', secBefore: 0.436, secAfter: 0.404, deltaPct: -7.3, note: '夜間單位電耗較前 7 日同時段下降，系統確認達到更佳成效。' },
  },
  {
    id: 'F-1039', recId: 'R-RULE', recTitle: '以 P3@55 取代 P4@60', user: '值班員', t: '昨天 10:12', type: 'alt',
    text: 'P3 改 55Hz 配水池回升偏慢，實際我改用 P3@57Hz 較穩，仍比 P4@60 省電。',
    result: { verdict: 'better_alt', secBefore: 0.452, secAfter: 0.421, deltaPct: -6.9, note: '操作員實際頻率（57Hz）仍優於原 P4@60 且補水更穩；已回饋模型微調建議頻率。' },
  },
  {
    id: 'F-1031', recId: 'R-BILL', recTitle: '對齊台電半尖峰', user: '節能工程師', t: '2 天前', type: 'partial',
    text: '部分充水動作已移至 22:00 後半尖峰，但晨峰仍有兩台重疊，待排程再優化。',
    result: { verdict: 'flat', secBefore: 0.414, secAfter: 0.412, deltaPct: -0.5, note: '變化幅度在量測雜訊範圍內，建議完成排程調整後再評估。' },
  },
];
const FEEDBACK_KEY = 'nhr_op_feedback_v1';
function loadFeedback() {
  try { const raw = localStorage.getItem(FEEDBACK_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return FEEDBACK_SEED.slice();
}
function saveFeedback(list) { try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list)); } catch (e) {} }
// 系統「偵測實際數據」並判定上次操作是否達到更佳成效
function evaluateFeedback(rec, typeId) {
  const base = 0.41 + (Math.random() - 0.5) * 0.018;
  if (typeId === 'reject') return { verdict: 'pending', secBefore: +base.toFixed(3), secAfter: null, deltaPct: null, note: '未採用本建議；待下次套用後，系統將自動比對實際單位電耗。' };
  const expect = rec && rec.save ? Math.min(rec.save / 100 * 0.4, 0.11) : 0.045;
  let frac;
  if (typeId === 'adopt') frac = expect * (0.8 + Math.random() * 0.45);
  else if (typeId === 'partial') frac = expect * (0.3 + Math.random() * 0.4);
  else frac = expect * (0.55 + Math.random() * 0.7); // alt
  const secBefore = +base.toFixed(3);
  const secAfter = +(base * (1 - frac)).toFixed(3);
  const deltaPct = +(-frac * 100).toFixed(1);
  let verdict, note;
  if (deltaPct <= -4) { verdict = typeId === 'alt' ? 'better_alt' : 'improved'; note = typeId === 'alt' ? '系統比對實際數據：操作員方式達到更佳成效，已納入模型回饋。' : '系統比對實際數據：單位電耗明顯下降，達到更佳成效。'; }
  else if (deltaPct <= -1.5) { verdict = 'improved'; note = '系統比對實際數據：單位電耗小幅下降，方向正確。'; }
  else if (deltaPct < 0) { verdict = 'flat'; note = '變化在量測雜訊範圍內，建議持續觀察數筆後再判定。'; }
  else { verdict = 'worse'; note = '未達預期，建議檢視現場條件或回到原配置。'; }
  return { verdict, secBefore, secAfter, deltaPct, note };
}
window.loadFeedback = loadFeedback; window.saveFeedback = saveFeedback; window.evaluateFeedback = evaluateFeedback;

// ---- change annotations on the SEC trend (異動標註) -------------------------
// 操作員依 AI 建議或自行調整後，於連續趨勢圖上標註「何時做了什麼更動」。
const CHANGE_KINDS = {
  milestone: { zh: '里程碑', c: '#22C55E' },
  ai: { zh: 'AI 建議調整', c: '#22D3EE' },
  manual: { zh: '人工調整', c: '#F59E0B' },
};
const CHANGE_SEED = [
  { id: 'C-0505', d: '05/05', kind: 'milestone', label: '優化上線', detail: '導入節能調度模型，全面改用現場曲線選泵。', who: '系統', params: [{ dev: 'P1', from: 60, to: 57, unit: 'Hz' }, { dev: 'P2', from: 60, to: 51, unit: 'Hz' }, { dev: '日間主底', from: 'P4@60', to: 'P3@55' }], sec: { before: 0.444, after: 0.405 } },
  { id: 'C-0522', d: '05/22', kind: 'manual', label: '夜間 P1 降頻', detail: '夜間主底 P1 補水正常，可降頻省電。', who: '夜班員', params: [{ dev: 'P1（夜間）', from: 60, to: 57, unit: 'Hz' }], sec: { before: 0.410, after: 0.393 } },
  { id: 'C-0610', d: '06/10', kind: 'ai', label: 'P3 取代 P4', detail: '套用 AI 建議：日間改用 P3 取代已衰退之 P4。', who: '李工程師', params: [{ dev: 'P4', from: '60Hz', to: '停用' }, { dev: 'P3', from: '停用', to: '55Hz' }], sec: { before: 0.444, after: 0.405 } },
];
const CHANGE_KEY = 'nhr_change_events_v1';
function loadChangeEvents() {
  try { const raw = localStorage.getItem(CHANGE_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return CHANGE_SEED.slice();
}
function saveChangeEvents(list) { try { localStorage.setItem(CHANGE_KEY, JSON.stringify(list)); } catch (e) {} }
function addChangeEvent(ev) {
  const list = loadChangeEvents();
  let d = ev.d;
  if (!d) { try { const s = window.dailySEC(); d = s[s.length - 1].d; } catch (e) { d = ''; } }
  const entry = { id: 'C-' + Date.now().toString().slice(-6), kind: ev.kind || 'manual', label: ev.label || '調整', detail: ev.detail || '', who: ev.who || '值班員', params: ev.params || [], sec: ev.sec || null, d };
  const next = [...list, entry];
  saveChangeEvents(next);
  try { window.dispatchEvent(new CustomEvent('nhr-change-added', { detail: entry })); } catch (e) {}
  return entry;
}
window.loadChangeEvents = loadChangeEvents; window.saveChangeEvents = saveChangeEvents; window.addChangeEvent = addChangeEvent;

Object.assign(window, { GUIDANCE, GUIDE_LEVELS, CHAT_SUGGEST, CHAT_CANNED, PERMISSIONS, ROLES, USERS, AUDIT, FEEDBACK_TYPES, FB_VERDICT, FEEDBACK_SEED, CHANGE_KINDS, CHANGE_SEED });
