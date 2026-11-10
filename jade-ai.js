(() => {
  'use strict';

  // ---------- Banco de imagens (Wikimedia Commons, licenças livres) ----------
  // Para trocar uma imagem: mude só o "file" (nome exato do arquivo no Commons).
  const COMMONS = name => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(name) + '?width=1400';
  const PAGE = name => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(name.replaceAll(' ', '_'));
  const VISUALS = [
    { id: 'ecg_normal', type: 'ECG', label: 'ECG de 12 derivações normal (ritmo sinusal)', file: 'Normal 12 lead EKG.jpg' },
    { id: 'ecg_fa', type: 'ECG', label: 'ECG: fibrilação atrial', file: 'Afib ecg (CardioNetworks ECGpedia).jpg' },
    { id: 'ecg_flutter', type: 'ECG', label: 'ECG: flutter atrial', file: 'AtrialFlutter12.JPG' },
    { id: 'ecg_iam_inferior', type: 'ECG', label: 'ECG: IAM com supra de ST de parede inferior (traçado gerado em simulador)', file: '12 lead generated inferior MI.JPG' },
    { id: 'ecg_iam_anterior', type: 'ECG', label: 'ECG: IAM com supra de ST de parede anterior (traçado gerado em simulador)', file: '12 lead generated anterior MI.JPG' },
    { id: 'ecg_bavt', type: 'ECG', label: 'ECG: bloqueio atrioventricular total (3º grau)', file: 'CompleteHeartBlock.jpg' },
    { id: 'rx_normal', type: 'Raio-X', label: 'Radiografia de tórax PA normal', file: 'Normal posteroanterior (PA) chest radiograph (X-ray).jpg' },
    { id: 'rx_pneumonia', type: 'Raio-X', label: 'Radiografia de tórax: pneumonia lobar (consolidação)', file: 'X-ray of lobar pneumonia.jpg' },
    { id: 'rx_pneumotorax', type: 'Raio-X', label: 'Radiografia de tórax: pneumotórax', file: 'Pneumothorax CXR.jpg' },
    { id: 'rx_derrame', type: 'Raio-X', label: 'Radiografia de tórax: derrame pleural', file: 'Pleural effusion.jpg' },
    { id: 'rx_tb', type: 'Raio-X', label: 'Radiografia de tórax: tuberculose pulmonar', file: 'Tuberculosis-x-ray-1.jpg' },
    { id: 'rx_dpoc', type: 'Raio-X', label: 'Radiografia de tórax: DPOC com hiperinsuflação', file: 'COPD.JPG' },
    { id: 'rx_edema', type: 'Raio-X', label: 'Radiografia de tórax: edema agudo de pulmão / insuficiência cardíaca', file: 'AP portable CXR of a patient in acute pulmonary oedema.jpg' },
  ];
  const byId = Object.fromEntries(VISUALS.map(v => [v.id, v]));

  // ---------- Painel ----------
  const panel = document.createElement('section'); panel.id = 'jadeAI'; panel.className = 'panel';
  panel.innerHTML = `<div class="ai-head"><h2>Jade · Assistente de OSCE</h2><span class="ai-badge" id="aiBadge">Verificando conexão</span></div>
  <p class="muted">Converse livremente, pratique com um examinador e receba uma avaliação baseada no que você demonstrou. Peça ECG, raio-X ou espirometria durante o atendimento.</p>
  <p id="aiCase" class="small"></p>
  <div class="ai-controls"><label>Modo <select id="aiMode"><option value="patient">Paciente simulado</option><option value="examiner">Examinador</option><option value="tutor">Tutor de estudo</option></select></label><button id="aiBegin">Começar conversa</button></div>
  <div class="ai-log" id="aiLog" role="log" aria-live="polite"></div>
  <label for="aiText">Sua pergunta ou resposta</label><textarea id="aiText" maxlength="6000" placeholder="Ex.: Olá, sou Ana, estudante de medicina. Como você se chama e o que está sentindo?"></textarea>
  <div class="ai-controls"><button class="primary" id="aiSend">Enviar</button><button id="aiGrade">Encerrar e corrigir com IA</button><button id="aiReset">Limpar conversa</button></div>
  <details><summary>Imagem ou ECG para discutir</summary><p class="small muted">Envie somente imagens de estudo sem identificação de pacientes. Ao enviar uma mensagem, a imagem anexada será encaminhada à IA. A interpretação é de treino e pode conter erros.</p><input id="aiImage" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Anexar exame"><div id="aiAttachmentPreview"></div><button id="aiRemoveImage">Remover anexo</button><div id="aiECG"></div></details>
  <p id="aiStatus" class="small" role="status"></p><div id="aiReview"></div>
  <details id="aiBank"><summary>Banco de imagens (conferir)</summary><p class="small muted">Imagens reais do Wikimedia Commons com licença livre, usadas pela Jade quando você pede ECG ou raio-X. Confira se cada uma corresponde à legenda; se alguma estiver errada ou não abrir, me avise para trocar.</p><div id="aiBankList" class="ai-bank"></div></details>
  <details><summary>Conexão do assistente</summary><p class="small">O acesso da IA é configurado no servidor. Nunca coloque a chave da API da Anthropic aqui. A senha abaixo é apenas a senha de acesso ao seu assistente.</p><label>Endereço do servidor <input id="aiEndpoint" type="url" placeholder="https://osce-jade.seu-usuario.workers.dev"></label><label> Senha de acesso <input id="aiPassword" type="password" autocomplete="off"></label><button id="aiConnect">Verificar conexão</button></details>`;
  document.getElementById('station').append(panel);

  const style = document.createElement('style');
  style.textContent = `.ai-visual{margin:10px 0 4px;padding:10px;border:1px solid #dce7ec;border-radius:12px;background:#fff;white-space:normal}
  .ai-visual figcaption{font-size:12px;color:#4d6670;margin-top:6px}.ai-visual figcaption a{color:#126b80}
  .ai-visual img{display:block;width:100%;height:auto;border-radius:8px;background:#111;cursor:zoom-in}
  .ai-visual h4{margin:0 0 6px;font-size:14px}.spiro-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
  .spiro-charts svg{width:100%;height:auto;background:#fbfdfd;border:1px solid #e3edf0;border-radius:8px}
  .spiro-table{overflow-x:auto;margin-top:8px}.spiro-table table{border-collapse:collapse;width:100%;font-size:12px;font-variant-numeric:tabular-nums}
  .spiro-table th,.spiro-table td{border-bottom:1px solid #e3edf0;padding:5px 6px;text-align:right;white-space:nowrap}.spiro-table th:first-child,.spiro-table td:first-child{text-align:left}
  .spiro-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#4d6670;margin-top:6px}.spiro-legend span::before{content:"";display:inline-block;width:18px;height:0;border-top:3px solid var(--c);vertical-align:middle;margin-right:5px}.spiro-legend .dash::before{border-top-style:dashed}
  .ai-bank{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.ai-bank figure{margin:0;padding:6px;border:1px solid #dce7ec;border-radius:10px;background:#fff}.ai-bank img{width:100%;height:110px;object-fit:cover;border-radius:6px;background:#111}.ai-bank figcaption{font-size:11px;margin-top:4px}
  .ai-img-error{padding:14px;border-radius:8px;background:#fff4f2;color:#8a2b1e;font-size:13px}`;
  document.head.append(style);

  const el = id => document.getElementById(id);
  let messages = [], attachment = null, busy = false, generation = 0, controller = null;
  try { el('aiEndpoint').value = localStorage.getItem('jade-ai-endpoint') || ''; } catch (e) {}

  function base() {
    const v = el('aiEndpoint').value.trim();
    if (!v) return '';
    let u;
    try { u = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v); } catch (e) { throw Error('Endereço do servidor inválido. Ex.: https://osce-jade.seu-usuario.workers.dev'); }
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))) throw Error('Use HTTPS para o servidor.');
    return u.origin;
  }
  function headers() { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + el('aiPassword').value }; }
  function status(text) { el('aiStatus').textContent = text; }
  async function readJson(r) { const t = await r.text(); try { return JSON.parse(t); } catch (e) { throw Error(r.ok ? 'Resposta inesperada do servidor.' : 'Servidor respondeu com erro ' + r.status + '. Confira o endereço.'); } }

  // ---------- Marcadores da IA ----------
  const TAG = /\[\[\s*(IMAGEM|ESPIROMETRIA)\b([^\]]*)\]\]/gi;
  function parseTags(text) {
    const visuals = [];
    const clean = text.replace(TAG, (_, kind, args) => {
      kind = kind.toUpperCase();
      if (kind === 'IMAGEM') { const id = args.trim().split(/\s+/)[0]; if (byId[id]) visuals.push({ kind: 'img', item: byId[id] }); }
      else { const p = {}; args.replace(/([a-z_]+)\s*=\s*([\d.,]+)/gi, (m, k, v) => { p[k.toLowerCase()] = parseFloat(v.replace(',', '.')); }); if (p.cvf && p.vef1) visuals.push({ kind: 'spiro', data: p }); }
      return '';
    }).replace(/\n{3,}/g, '\n\n').trim();
    return { clean, visuals };
  }

  function imageFigure(item, small) {
    const fig = document.createElement('figure'); fig.className = small ? '' : 'ai-visual';
    if (!small) { const h = document.createElement('h4'); h.textContent = item.type === 'ECG' ? 'Eletrocardiograma' : 'Radiografia de tórax'; fig.append(h); }
    const img = document.createElement('img'); img.loading = 'lazy'; img.src = COMMONS(item.file);
    img.alt = small ? item.label : (item.type === 'ECG' ? 'ECG solicitado' : 'Radiografia de tórax solicitada');
    img.onerror = () => { const d = document.createElement('div'); d.className = 'ai-img-error'; d.textContent = 'Não foi possível carregar esta imagem (' + item.id + '). Peça à Jade a descrição do exame.'; img.replaceWith(d); };
    img.onclick = () => window.open(COMMONS(item.file).replace('?width=1400', ''), '_blank', 'noopener');
    const cap = document.createElement('figcaption');
    const a = document.createElement('a'); a.href = PAGE(item.file); a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Wikimedia Commons';
    cap.append(small ? item.label + ' · ' : 'Imagem real de estudo · autor e licença em ', a);
    fig.append(img, cap);
    return fig;
  }

  // ---------- Espirometria ----------
  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs, parent) { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; }
  function loop(cvf, vef1) {
    const ratio = Math.min(0.97, Math.max(0.2, vef1 / cvf));
    const pef = vef1 * 2.4, pif = pef * 0.75, vp = 0.1 * cvf;
    const k = ratio >= 0.7 ? 1 : 1 + (0.7 - ratio) * 7;
    const pts = [];
    for (let i = 0; i <= 120; i++) { const v = cvf * i / 120; const f = v <= vp ? pef * Math.sin(Math.PI / 2 * v / vp) : pef * Math.pow((cvf - v) / (cvf - vp), k); pts.push([v, f]); }
    for (let i = 120; i >= 0; i--) { const v = cvf * i / 120; pts.push([v, -pif * Math.sin(Math.PI * v / cvf)]); }
    return { pts, pef };
  }
  function vt(cvf, vef1) { const ratio = Math.min(0.97, Math.max(0.2, vef1 / cvf)); const tau = -1 / Math.log(1 - ratio); const pts = []; for (let i = 0; i <= 120; i++) { const t = 6 * i / 120; pts.push([t, cvf * (1 - Math.exp(-t / tau))]); } return pts; }
  function chart(title, xLabel, yLabel, series, xMax, yMin, yMax, xStep, yStep) {
    const W = 320, H = 240, L = 40, R = 10, T = 26, B = 34;
    const sx = x => L + (x / xMax) * (W - L - R), sy = y => T + (yMax - y) / (yMax - yMin) * (H - T - B);
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': title });
    svgEl('text', { x: L, y: 16, 'font-size': 12, 'font-weight': 700, fill: '#14323d' }, svg).textContent = title;
    for (let x = 0; x <= xMax + 1e-9; x += xStep) { svgEl('line', { x1: sx(x), x2: sx(x), y1: T, y2: H - B, stroke: '#e3edf0' }, svg); svgEl('text', { x: sx(x), y: H - B + 14, 'font-size': 10, 'text-anchor': 'middle', fill: '#56707a' }, svg).textContent = +x.toFixed(1); }
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) { svgEl('line', { x1: L, x2: W - R, y1: sy(y), y2: sy(y), stroke: y === 0 ? '#9fb6be' : '#e3edf0' }, svg); svgEl('text', { x: L - 5, y: sy(y) + 3, 'font-size': 10, 'text-anchor': 'end', fill: '#56707a' }, svg).textContent = +y.toFixed(1); }
    svgEl('text', { x: (L + W - R) / 2, y: H - 4, 'font-size': 10, 'text-anchor': 'middle', fill: '#56707a' }, svg).textContent = xLabel;
    svgEl('text', { x: 10, y: (T + H - B) / 2, 'font-size': 10, 'text-anchor': 'middle', fill: '#56707a', transform: `rotate(-90 10 ${(T + H - B) / 2})` }, svg).textContent = yLabel;
    for (const s of series) svgEl('path', { d: s.pts.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join(' '), fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-dasharray': s.dash ? '5 4' : 'none' }, svg);
    return svg;
  }
  function spirometry(p) {
    const fig = document.createElement('figure'); fig.className = 'ai-visual';
    const h = document.createElement('h4'); h.textContent = 'Espirometria'; fig.append(h);
    const sets = [];
    if (p.cvf_prev && p.vef1_prev) sets.push({ name: 'Previsto', cvf: p.cvf_prev, vef1: p.vef1_prev, color: '#9aa9ae', dash: true });
    sets.push({ name: 'Pré-BD', cvf: p.cvf, vef1: p.vef1, color: '#16839a' });
    if (p.pos_cvf && p.pos_vef1) sets.push({ name: 'Pós-BD', cvf: p.pos_cvf, vef1: p.pos_vef1, color: '#d9622b' });
    const loops = sets.map(s => ({ ...s, ...loop(s.cvf, s.vef1) }));
    const maxV = Math.max(...sets.map(s => s.cvf)), maxF = Math.max(...loops.map(l => l.pef));
    const xMax = Math.ceil(maxV + 0.5), yMax = Math.ceil(maxF + 1), yMin = -Math.ceil(maxF * 0.75 + 1);
    const charts = document.createElement('div'); charts.className = 'spiro-charts';
    charts.append(chart('Fluxo × volume', 'Volume (L)', 'Fluxo (L/s)', loops, xMax, yMin, yMax, 1, 2));
    charts.append(chart('Volume × tempo', 'Tempo (s)', 'Volume (L)', sets.map(s => ({ ...s, pts: vt(s.cvf, s.vef1) })), 6, 0, xMax, 1, 1));
    fig.append(charts);
    const legend = document.createElement('div'); legend.className = 'spiro-legend';
    for (const s of sets) { const sp = document.createElement('span'); sp.style.setProperty('--c', s.color); if (s.dash) sp.className = 'dash'; sp.textContent = s.name; legend.append(sp); }
    fig.append(legend);
    const pct = (v, ref) => ref ? Math.round(v / ref * 100) + '%' : '–';
    const fmt = v => v == null || isNaN(v) ? '–' : v.toFixed(2).replace('.', ',');
    const rows = [
      ['CVF (L)', p.cvf_prev, p.cvf, p.pos_cvf],
      ['VEF1 (L)', p.vef1_prev, p.vef1, p.pos_vef1],
    ];
    let html = '<table><thead><tr><th>Parâmetro</th><th>Previsto</th><th>Pré-BD</th><th>% prev.</th>' + (p.pos_cvf ? '<th>Pós-BD</th><th>% prev.</th><th>Variação</th>' : '') + '</tr></thead><tbody>';
    for (const [n, pr, pre, pos] of rows) {
      html += `<tr><td>${n}</td><td>${fmt(pr)}</td><td>${fmt(pre)}</td><td>${pct(pre, pr)}</td>`;
      if (p.pos_cvf) { const d = pos - pre; html += `<td>${fmt(pos)}</td><td>${pct(pos, pr)}</td><td>${d >= 0 ? '+' : ''}${Math.round(d * 1000)} mL (${d >= 0 ? '+' : ''}${Math.round(d / pre * 100)}%)</td>`; }
      html += '</tr>';
    }
    const r = (a, b) => a && b ? (a / b).toFixed(2).replace('.', ',') : '–';
    html += `<tr><td>VEF1/CVF</td><td>${r(p.vef1_prev, p.cvf_prev)}</td><td>${r(p.vef1, p.cvf)}</td><td></td>${p.pos_cvf ? `<td>${r(p.pos_vef1, p.pos_cvf)}</td><td></td><td></td>` : ''}</tr></tbody></table>`;
    const t = document.createElement('div'); t.className = 'spiro-table'; t.innerHTML = html; fig.append(t);
    const cap = document.createElement('figcaption');
    cap.textContent = 'Curvas ilustrativas geradas a partir dos valores. Referências usuais: obstrução se VEF1/CVF < 0,70 (GOLD) ou < LIN; resposta ao broncodilatador classicamente ≥ 200 mL e ≥ 12% no VEF1 ou CVF (ATS/ERS 2022: > 10% do previsto).';
    fig.append(cap);
    return fig;
  }

  function bubble(role, text) {
    const d = document.createElement('div'); d.className = 'ai-message ' + role;
    const label = document.createElement('small'); label.textContent = role === 'user' ? 'Você' : 'Jade · ' + el('aiMode').selectedOptions[0].textContent;
    d.append(label);
    if (role === 'assistant') {
      const { clean, visuals } = parseTags(text);
      if (clean) d.append(document.createTextNode(clean));
      for (const v of visuals) d.append(v.kind === 'img' ? imageFigure(v.item) : spirometry(v.data));
    } else d.append(document.createTextNode(text));
    el('aiLog').append(d); el('aiLog').scrollTop = el('aiLog').scrollHeight;
  }

  function lock(value) { busy = value; ['aiSend', 'aiBegin', 'aiGrade', 'aiMode', 'aiImage', 'aiRemoveImage'].forEach(id => el(id).disabled = value); }
  function reset() { generation++; controller?.abort(); controller = null; messages = []; attachment = null; el('aiImage').value = ''; el('aiAttachmentPreview').replaceChildren(); el('aiLog').replaceChildren(); el('aiReview').replaceChildren(); lock(false); status('Conversa nova. Escolha um modo e comece quando quiser.'); }
  function rubrics() { return window.osceItems || []; }

  async function check() {
    try {
      const root = base();
      if (!root) { el('aiBadge').textContent = 'IA desconectada'; status('Abra "Conexão do assistente" e informe o endereço do servidor e a senha.'); return; }
      const r = await fetch(root + '/api/health', { headers: headers(), signal: AbortSignal.timeout(10000) });
      const data = await readJson(r);
      if (!r.ok) throw Error(data.error || 'Não foi possível conectar.');
      el('aiBadge').textContent = data.ready ? 'IA disponível' : 'IA aguardando ativação';
      status(data.ready ? 'Conexão pronta.' : 'A interface está pronta. Falta configurar a chave e a senha no servidor.');
      try { localStorage.setItem('jade-ai-endpoint', el('aiEndpoint').value.trim()); } catch (e) {}
    } catch (e) { el('aiBadge').textContent = 'IA desconectada'; status(e.message === 'Failed to fetch' || e.message === 'Load failed' ? 'Servidor indisponível. Os exercícios originais continuam funcionando.' : e.message); }
  }

  function review(data) {
    const box = el('aiReview'); box.replaceChildren();
    const title = document.createElement('h3'); title.textContent = 'Avaliação de treino pela IA';
    const score = document.createElement('div'); score.className = 'ai-score'; score.textContent = data.score.toFixed(1) + ' / 10';
    box.append(title, score);
    for (const item of data.checklist) {
      const row = document.createElement('div'); row.className = 'ai-row';
      const heading = document.createElement('strong'); heading.textContent = ({ done: '✓ Realizado', partial: '◐ Parcial', missing: '○ Não demonstrado' })[item.status] + ' · ' + item.label;
      const evidence = document.createElement('p'); evidence.textContent = item.evidence;
      row.append(heading, evidence); box.append(row);
    }
    const note = document.createElement('p'); note.className = 'small muted'; note.textContent = 'Pesos iguais: realizado = 1, parcial = 0,5, não demonstrado = 0. A IA avalia apenas o registro; ações físicas precisam ser verbalizadas. Nota de treino, não avaliação oficial.';
    box.append(note); box.scrollIntoView({ behavior: 'smooth' });
  }

  async function send(action = 'chat', preset = '') {
    if (busy || !active) return;
    const text = preset || el('aiText').value.trim();
    if (action === 'chat' && !text) { status('Digite uma pergunta ou resposta.'); return; }
    if (messages.length >= 80) { status('Limite de conversa atingido. Encerre a avaliação ou reinicie.'); if (action !== 'grade') return; }
    let root; try { root = base(); } catch (e) { status(e.message); return; }
    if (!root) { status('Configure o servidor em "Conexão do assistente" para ativar a IA.'); return; }
    const token = generation; controller = new AbortController(); const timer = setTimeout(() => controller?.abort(), 90000);
    lock(true); status(action === 'grade' ? 'Avaliando as evidências do atendimento…' : 'Jade está respondendo…');
    const pending = action === 'chat' ? { role: 'user', text, image: attachment } : null;
    try {
      const history = pending ? [...messages, pending] : messages;
      const observations = [...visited].map(i => 'Pergunta realizada no simulador: ' + active.answers[i][0] + ' / resposta: ' + active.answers[i][1]).concat([...requested].map(i => 'Exame solicitado: ' + active.exams[i][0] + ' / resultado: ' + active.exams[i][1]));
      const r = await fetch(root + '/api/osce', { method: 'POST', headers: headers(), signal: controller.signal, body: JSON.stringify({
        caseId: active.id,
        caseData: { name: active.name, area: active.area, patient: active.patient, chief: active.chief, answers: active.answers, exams: active.exams, points: active.points, answer: active.answer },
        visuals: VISUALS.map(v => ({ id: v.id, label: v.label })),
        mode: el('aiMode').value, action, messages: history,
        diagnosis: el('diagnosis').value, management: el('management').value, observations, criteria: rubrics(),
      }) });
      const data = await readJson(r);
      if (!r.ok) throw Error(data.error || 'Não foi possível obter resposta.');
      if (token !== generation) return;
      if (pending) { messages.push(pending); bubble('user', text + (attachment ? '\n[Imagem de estudo anexada]' : '')); el('aiText').value = ''; attachment = null; el('aiImage').value = ''; el('aiAttachmentPreview').replaceChildren(); }
      messages.push({ role: 'assistant', text: data.message }); bubble('assistant', data.message);
      if (action === 'grade') review(data);
      status('Resposta recebida.'); el('aiBadge').textContent = 'IA conectada';
    } catch (e) { if (token === generation) status(e.name === 'AbortError' ? 'A resposta demorou demais. Você pode tentar novamente.' : e.message); }
    finally { clearTimeout(timer); if (token === generation) lock(false); }
  }

  // Galeria para conferência
  el('aiBank').addEventListener('toggle', () => { if (el('aiBank').open && !el('aiBankList').childElementCount) VISUALS.forEach(v => el('aiBankList').append(imageFigure(v, true))); });

  el('aiSend').onclick = () => send(); el('aiBegin').onclick = () => send('chat', 'Inicie a estação no modo selecionado.'); el('aiGrade').onclick = () => send('grade'); el('aiConnect').onclick = check; el('aiReset').onclick = reset; el('aiMode').onchange = reset;
  el('aiText').onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } };
  el('aiRemoveImage').onclick = () => { attachment = null; el('aiImage').value = ''; el('aiAttachmentPreview').replaceChildren(); };
  el('aiImage').onchange = async () => { const f = el('aiImage').files[0]; if (!f) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 3 * 1024 * 1024) { status('Escolha PNG, JPEG ou WebP de até 3 MB.'); el('aiImage').value = ''; return; } const epoch = generation; const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(f); }); if (epoch !== generation) return; attachment = data; const img = document.createElement('img'); img.src = data; img.alt = 'Imagem de estudo anexada'; el('aiAttachmentPreview').replaceChildren(img); };

  const oldStart = window.start;
  window.start = function (id) {
    oldStart(id); reset(); el('aiCase').textContent = 'Estação: ' + active.name; el('aiECG').replaceChildren();
    if (id === 'fa') { const p = document.createElement('p'); p.textContent = 'Exercício visual: tira de ritmo esquemática de FA. Ilustração didática, sem calibração e sem valor de ECG diagnóstico de 12 derivações.'; el('aiECG').append(p); const svg = svgEl('svg', { viewBox: '0 0 720 150', role: 'img', 'aria-label': 'Tira de ritmo esquemática: intervalos RR irregulares e ausência de ondas P organizadas' }); svgEl('rect', { width: 720, height: 150, fill: '#fff5f5' }, svg); let d = 'M 0 85'; const beats = [40, 132, 197, 306, 380, 459, 568, 633, 695]; for (let x = 1; x < 720; x++) { let y = 85 + 2 * Math.sin(x * 1.7) + Math.sin(x * .47); for (const b of beats) { const t = x - b; if (t >= -5 && t < 0) y += t + 6; if (t >= 0 && t < 3) y -= t * 22; if (t >= 3 && t < 6) y -= 66 - (t - 3) * 27; if (t >= 6 && t < 10) y += 15 - (t - 6) * 3.75; if (t > 20 && t < 43) y -= 10 * Math.sin((t - 20) / 23 * Math.PI); } d += ' L ' + x + ' ' + y.toFixed(1); } svgEl('path', { d, fill: 'none', stroke: '#183e4e', 'stroke-width': '1.7' }, svg); el('aiECG').append(svg); }
    check();
  };
})();
