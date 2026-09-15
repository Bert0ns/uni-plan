// State, UI Rendering, Search, and Event Handlers

let userNotesData = {};
let saveTimeout = null;
let modalMode = 'export';

const GROUP_TO_SECTION_MAP = {
  '#idGruppo5596': 'sec_2',
  '#idGruppo5597': 'sec_3',
  '#idGruppo5598': 'sec_5',
  '#idGruppo5599': 'sec_6',
  '#idGruppo5600': 'sec_7',
  '#idGruppo5601': 'sec_10',
  '#idGruppo5602': 'sec_11',
  '#idGruppo5603': 'sec_14',
  '#idGruppo5604': 'sec_4',
  '#idGruppo5605': 'sec_8',
  '#idGruppo5683': 'sec_9',
  '#idGruppo5758': 'sec_12',
  '#idGruppo5759': 'sec_13',
};

// --- CONCURRENT FILTER STATE ---
const filterState = {
  search: '',
  year: 'ALL',             // 'ALL' | '1' | '2'
  requirements: new Set(), // Set of strings: 'REQ_OBBLIGATORI', 'REQ_TABA', 'REQ_TABB', 'REQ_TABAB', 'REQ_INT1', 'REQ_LIMIT3_AI', 'REQ_LIMIT2', 'REQ_DOT_SOFTSKILLS'
  group: 'ALL',            // 'ALL' | specific section ID e.g. 'sec_0', 'sec_2'
  period: 'ALL',           // 'ALL' | '1° sem' | '2° sem' | 'annuale'
  status: 'ALL',           // 'ALL' | 'in_plan' | 'not_in_plan' | 'planned' | 'passed' | 'sovrannumero' | 'passed_bachelor' | 'interested' | 'excluded' | 'with_notes'
  cfu: 'ALL',              // 'ALL' | '5.0' | '10.0' | 'other'
  language: 'ALL'          // 'ALL' | 'en' | 'it'
};

const REQUIREMENT_LABELS = {
  'REQ_OBBLIGATORI': 'Obbligatori T2A',
  'REQ_TABA': 'Tabella A (≥45)',
  'REQ_TABB': 'Tabella B',
  'REQ_TABAB': 'Tabella A + B (≥55)',
  'REQ_INT1': 'INT1 (≥15)',
  'REQ_LIMIT3_AI': 'AI (Max 3)',
  'REQ_LIMIT2': 'Etica/Proj (Max 2)',
  'REQ_DOT_SOFTSKILLS': 'DOT/Soft (Max 1)'
};

const STATUS_LABELS = {
  'in_plan': 'Nel Mio Piano',
  'not_in_plan': 'Non nel Piano',
  'planned': 'Pianificati',
  'passed': 'Superati',
  'sovrannumero': 'In Sovrannumero',
  'passed_bachelor': 'Sostenuto al I Livello',
  'interested': 'In Valutazione',
  'excluded': 'Esclusi',
  'with_notes': 'Con Note'
};

const SECTION_NAMES_MAP = {
  'sec_0': '1° Anno',
  'sec_1': '2° Anno',
  'sec_2': 'Gruppo AUT',
  'sec_3': 'Gruppo BIO',
  'sec_4': 'Gruppo DOT',
  'sec_5': 'Gruppo INT1',
  'sec_6': 'Gruppo INT2',
  'sec_7': 'Gruppo MAT',
  'sec_8': 'Gruppo SOFT SKILLS',
  'sec_9': 'Gruppo TAB ENHANCE',
  'sec_10': 'Gruppo TABA',
  'sec_11': 'Gruppo TABB',
  'sec_12': 'Gruppo SWT - INF',
  'sec_13': 'Gruppo SWT - INTER',
  'sec_14': 'Gruppo TEL',
  'sec_extra': 'Insegnamenti Aggiuntivi'
};

// --- DATA PERSISTENCE ---
async function loadUserData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      userNotesData = JSON.parse(saved);
      return;
    }
  } catch (e) {
    console.error('Failed to load user notes from localStorage:', e);
  }

  // Fallback to pre-saved study plan if available
  try {
    const resp = await fetch('data/study-plan-state.json');
    if (resp.ok) {
      userNotesData = await resp.json();
      saveUserData();
    }
  } catch (e) {
    console.warn('Could not load data/study-plan-state.json default:', e);
    userNotesData = {};
  }
}

function saveUserData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userNotesData));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
  recalculateStats();
}

function sanitizeUrl(url) {
  if (!url) return '#';
  const clean = url.replace(/&amp;/g, '&');
  return escapeHtml(clean);
}

function jumpToChoiceGroup(url) {
  if (!url) return true;
  const hashIdx = url.indexOf('#');
  if (hashIdx === -1) return true;
  const hash = url.substring(hashIdx);
  const targetId = GROUP_TO_SECTION_MAP[hash];
  if (!targetId) return true;

  const sec = document.getElementById(targetId);
  if (sec) {
    if (sec.classList.contains('is-collapsed')) {
      sec.classList.remove('is-collapsed');
      const toggleText = sec.querySelector('.section-toggle-text');
      if (toggleText) toggleText.textContent = 'Comprimi';
    }
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sec.style.transition = 'box-shadow 0.3s ease';
    sec.style.boxShadow = '0 0 0 3px #0284c7';
    setTimeout(() => { sec.style.boxShadow = ''; }, 2000);
    return false;
  }
  return true;
}

// --- RENDER SECTIONS & TABLES ---
function renderTables() {
  const container = document.getElementById('tables-wrapper');
  if (!container) return;

  container.innerHTML = MANIFESTO_SECTIONS.map(sec => {
    const rowsHtml = sec.rows.map(row => {
      if (row.is_choice) {
        return `
        <tr id="${row.row_id}" class="choice-rule-row" data-code="--" data-sec="${sec.id}" data-name="${escapeHtml(row.name.toLowerCase())}" data-ssd="--" data-ssdsm="--" data-period="--" data-cfu="---" data-lang="other" data-is-int1="false" data-is-taba="false" data-is-tabb="false">
          <td class="center"><span style="color:var(--slate-400);">--</span></td>
          <td style="font-size:0.75rem; color:var(--slate-600);">--</td>
          <td style="font-size:0.75rem; color:var(--slate-600); font-weight:500;">--</td>
          <td class="course-title-cell"><a href="${sanitizeUrl(row.url)}" class="course-title-link" onclick="return jumpToChoiceGroup(this.getAttribute('href'))" target="_blank" rel="noopener">${escapeHtml(row.name)}</a></td>
          <td class="center">--</td>
          <td class="center" style="font-size:0.75rem; font-weight:500;">--</td>
          <td class="center" style="font-size:0.75rem; color:var(--slate-500);">--</td>
          <td class="center"><span class="period-badge period-annuale">--</span></td>
          <td class="center">---</td>
          <td class="center"><span style="font-weight:600; color:var(--slate-600);">${escapeHtml(row.cfu_grp)}</span></td>
          <td class="center" style="color:var(--slate-400); font-size:0.75rem;">Gruppo a scelta</td>
          <td style="color:var(--slate-400); font-size:0.75rem;">Regola di orientamento</td>
        </tr>`;
      }

      const userState = userNotesData[row.code] || {};
      const status = userState.status || 'none';
      const note = userState.note || '';

      const tags = [];
      if (row.is_obbligatorio) tags.push('<span class="tag-badge tag-obbligatorio" title="Insegnamento obbligatorio T2A">Obbligatorio T2A</span>');
      if (row.is_ai) tags.push('<span class="tag-badge tag-ai" title="Vincolo T2A: Max 3 corsi AI nel piano">Max 3 AI</span>');
      if (row.is_limit2) tags.push('<span class="tag-badge tag-limit2" title="Vincolo T2A: Max 2 corsi effettivi tra Etica, Progetto, Diritto, Robotics">Max 2 Etica/Proj/Dir</span>');
      if (row.is_dot || row.is_soft) tags.push('<span class="tag-badge tag-dot-soft" title="Vincolo T2A: Max 1 corso effettivo tra Tabelle DOT e Soft Skills">Max 1 DOT/Soft</span>');
      if (row.is_int1) tags.push('<span class="tag-badge tag-int1" title="Insegnamento valido per il requisito INT1 (minimo 15 CFU)">INT1</span>');
      if (row.is_taba) tags.push('<span class="tag-badge tag-taba" title="Insegnamento valido per Tabella A (minimo 45 CFU)">Tabella A</span>');
      if (row.is_tabb) tags.push('<span class="tag-badge tag-tabb" title="Insegnamento valido per Tabella B">Tabella B</span>');

      const periodClass = row.period.includes('1') ? 'period-1' : (row.period.includes('2') ? 'period-2' : 'period-annuale');
      const langAttr = row.lang.toLowerCase().includes('en') ? 'en' : (row.lang.toLowerCase().includes('it') ? 'it' : 'other');

      return `
      <tr id="${row.row_id}" class="row-${status}" data-code="${row.code}" data-sec="${sec.id}" data-name="${escapeHtml(row.name.toLowerCase())}" data-ssd="${escapeHtml(row.ssd.toLowerCase())}" data-ssdsm="${escapeHtml(row.ssdsm.toLowerCase())}" data-period="${escapeHtml(row.period)}" data-cfu="${row.cfu}" data-lang="${langAttr}" data-is-int1="${row.is_int1}" data-is-taba="${row.is_taba}" data-is-tabb="${row.is_tabb}" data-is-obbligatorio="${row.is_obbligatorio}" data-is-ai="${row.is_ai}" data-is-limit2="${row.is_limit2}" data-is-dot-soft="${row.is_dot || row.is_soft}">
        <td class="center"><span class="course-code" title="Clicca per copiare" onclick="copyText('${row.code}')">${row.code}</span></td>
        <td style="font-size:0.75rem; color:var(--slate-600);">${escapeHtml(row.ssdsm)}</td>
        <td style="font-size:0.75rem; color:var(--slate-600); font-weight:500;">${escapeHtml(row.ssd)}</td>
        <td class="course-title-cell">
          <a href="${sanitizeUrl(row.url)}" class="course-title-link" target="_blank" rel="noopener">${escapeHtml(row.name)}</a>
          ${tags.length ? `<div class="course-tags">${tags.join('')}</div>` : ''}
        </td>
        <td class="center"><span class="lang-flag">${escapeHtml(row.lang)}</span></td>
        <td class="center" style="font-size:0.75rem; font-weight:500;">${escapeHtml(row.sede)}</td>
        <td class="center" style="font-size:0.75rem; color:var(--slate-500);">${escapeHtml(row.tipo)}</td>
        <td class="center"><span class="period-badge ${periodClass}">${escapeHtml(row.period)}</span></td>
        <td class="center"><span class="cfu-badge">${escapeHtml(row.cfu)}</span></td>
        <td class="center"><span style="font-weight:600; color:var(--slate-600);">${escapeHtml(row.cfu_grp)}</span></td>
        <td>
          <select class="status-select val-${status}" data-code="${row.code}" onchange="updateCourseStatus('${row.code}', this.value, '${row.cfu}')">
            <option value="none" ${status === 'none' ? 'selected' : ''}>⚪ Non Selezionato</option>
            <option value="planned" ${status === 'planned' ? 'selected' : ''}>✅ Pianificato (Nel Piano)</option>
            <option value="passed" ${status === 'passed' ? 'selected' : ''}>🎓 Superato (Verbalizzato)</option>
            <option value="sovrannumero" ${status === 'sovrannumero' ? 'selected' : ''}>➕ In Sovrannumero (Extra)</option>
            <option value="passed_bachelor" ${status === 'passed_bachelor' ? 'selected' : ''}>🏛️ Sostenuto al I Livello</option>
            <option value="interested" ${status === 'interested' ? 'selected' : ''}>⭐ In Valutazione</option>
            <option value="excluded" ${status === 'excluded' ? 'selected' : ''}>❌ Escluso</option>
          </select>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <textarea class="user-note-input" data-code="${row.code}" placeholder="Aggiungi nota personale..." oninput="handleNoteInput('${row.code}', this.value)">${escapeHtml(note)}</textarea>
            <span class="note-saved-tick" id="tick-${row.code}">✓</span>
          </div>
        </td>
      </tr>`;
    }).join('');

    return `
    <div class="section-card" id="${sec.id}" data-section-index="${sec.index}">
      <div class="section-header" onclick="toggleSection('${sec.id}')" title="Clicca per comprimere o espandere questa tabella">
        <div class="section-title">
          <span>${escapeHtml(sec.title)}</span>
          <span class="section-badge">${escapeHtml(sec.badge)}</span>
          <span class="section-match-badge" id="match-badge-${sec.id}" style="display:none;"></span>
          <span class="section-plan-badge" id="plan-badge-${sec.id}" style="display:none;"></span>
        </div>
        <div class="section-toggle-btn">
          <span class="section-toggle-text">Comprimi</span>
          <svg class="section-toggle-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
      <div class="mobile-scroll-hint">
        <div style="display:flex; align-items:center; gap:0.4rem;">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
          </svg>
          <span>Scorri lateralmente per Periodo, CFU, Stato e Note</span>
        </div>
        <span>👉</span>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="center" style="width: 75px;">Codice</th>
              <th style="min-width: 110px;">SSD SM 639/24</th>
              <th style="min-width: 95px;">SSD</th>
              <th style="min-width: 280px;">Denominazione Insegnamento</th>
              <th class="center" style="width: 50px;">Lingua</th>
              <th class="center" style="width: 50px;">Sede</th>
              <th class="center" style="width: 45px;">Tipo</th>
              <th class="center" style="width: 85px;">Periodo</th>
              <th class="center" style="width: 55px;">CFU</th>
              <th class="center" style="width: 75px;">CFU Grp</th>
              <th style="min-width: 155px; background: #e0f2fe; color: #0369a1; border-bottom-color: #7dd3fc;">Stato / Decisione</th>
              <th style="min-width: 260px; background: #e0f2fe; color: #0369a1; border-bottom-color: #7dd3fc;">Note Personali</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>`;
  }).join('');
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- COLLAPSE / EXPAND SECTIONS ---
function toggleSection(secId) {
  const sec = document.getElementById(secId);
  if (!sec) return;
  const isCollapsed = sec.classList.toggle('is-collapsed');
  const toggleText = sec.querySelector('.section-toggle-text');
  if (toggleText) toggleText.textContent = isCollapsed ? 'Espandi' : 'Comprimi';
}

function collapseAllSections() {
  document.querySelectorAll('.section-card').forEach(sec => {
    sec.classList.add('is-collapsed');
    const toggleText = sec.querySelector('.section-toggle-text');
    if (toggleText) toggleText.textContent = 'Espandi';
  });
}

function expandAllSections() {
  document.querySelectorAll('.section-card').forEach(sec => {
    sec.classList.remove('is-collapsed');
    const toggleText = sec.querySelector('.section-toggle-text');
    if (toggleText) toggleText.textContent = 'Comprimi';
  });
}

function updateSectionPlanBadges() {
  document.querySelectorAll('.section-card').forEach(sec => {
    const secId = sec.id;
    const badgeEl = document.getElementById(`plan-badge-${secId}`);
    if (!badgeEl) return;

    let planCoursesCount = 0;
    let totalSectionCfu = 0;
    const seenCodes = new Set();

    sec.querySelectorAll('tbody tr').forEach(row => {
      const code = row.getAttribute('data-code');
      if (!code || code === '--' || seenCodes.has(code)) return;
      const userState = userNotesData[code] || {};
      const status = userState.status;
      if (['planned', 'passed', 'sovrannumero', 'passed_bachelor'].includes(status)) {
        planCoursesCount++;
        let cfu = parseFloat(userState.cfu) || parseFloat(row.getAttribute('data-cfu')) || 0;
        totalSectionCfu += cfu;
        seenCodes.add(code);
      }
    });

    if (planCoursesCount > 0) {
      badgeEl.textContent = `${planCoursesCount} nel piano (${totalSectionCfu.toFixed(0)} CFU)`;
      badgeEl.style.display = 'inline-flex';
    } else {
      badgeEl.style.display = 'none';
    }
  });
}

// --- COURSE STATUS AND NOTE INPUT HANDLERS ---
function updateCourseStatus(code, status, cfu) {
  if (!userNotesData[code]) userNotesData[code] = {};
  userNotesData[code].status = status;
  const parsedCfu = parseFloat(cfu);
  if (!isNaN(parsedCfu) && parsedCfu > 0) {
    userNotesData[code].cfu = parsedCfu;
  }
  saveUserData();

  // Sync across all rows sharing this course code
  document.querySelectorAll(`.status-select[data-code="${code}"]`).forEach(sel => {
    sel.value = status;
    sel.className = `status-select val-${status}`;
    const row = sel.closest('tr');
    if (row) {
      row.className = `row-${status}`;
    }
  });

  // Re-apply filters if status filter is active
  if (filterState.status !== 'ALL') {
    applyFilters();
  } else {
    updatePlanCountPill();
  }
}

function handleNoteInput(code, text) {
  if (!userNotesData[code]) userNotesData[code] = {};
  userNotesData[code].note = text;

  document.querySelectorAll(`.user-note-input[data-code="${code}"]`).forEach(txt => {
    if (txt.value !== text) txt.value = text;
  });

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveUserData();
    document.querySelectorAll(`.note-saved-tick#tick-${code}`).forEach(t => {
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 1500);
    });
    // If filtering by notes or active search query, refresh filters
    if (filterState.status === 'with_notes' || filterState.search.length > 0) {
      applyFilters();
    }
  }, 600);
}

// --- RECALCULATE STATS AND UPDATE DASHBOARD ---
function recalculateStats() {
  const state = evaluatePlanState(userNotesData);

  // Update header pill
  const statTotalEl = document.getElementById('stat-total-cfu');
  if (statTotalEl) statTotalEl.textContent = state.totalCombined.toFixed(1);

  const statSovrEl = document.getElementById('stat-sovrannumero-cfu');
  if (statSovrEl) statSovrEl.textContent = state.totalSovrannumeroCfu.toFixed(1);

  const statReqPill = document.getElementById('stat-req-pill');
  if (statReqPill) {
    if (state.validRulesCount === 8) {
      statReqPill.className = 'req-status-pill pill-ok';
      statReqPill.textContent = 'Piano T2A: 8/8 OK ✓';
    } else if (state.hasDirectViolation) {
      statReqPill.className = 'req-status-pill pill-error';
      statReqPill.textContent = `⚠️ Vincoli Violati (${state.validRulesCount}/8)`;
    } else {
      statReqPill.className = 'req-status-pill pill-pending';
      statReqPill.textContent = `Vincoli: ${state.validRulesCount}/8`;
    }
  }

  // REQ 1: INT1
  updateReqBox('int1', state.int1Cfu, 15, state.okInt1, `${state.int1Cfu.toFixed(1)} / min. 15 CFU`, state.okInt1 ? `✓ Valido (${state.int1Cfu.toFixed(1)} CFU)` : `Mancano ${(15 - state.int1Cfu).toFixed(1)} CFU`);

  // REQ 2: TABA
  updateReqBox('taba', state.tabaCfu, 45, state.okTaba, `${state.tabaCfu.toFixed(1)} / min. 45 CFU`, state.okTaba ? `✓ Valido (${state.tabaCfu.toFixed(1)} CFU)` : `Mancano ${(45 - state.tabaCfu).toFixed(1)} CFU`);

  // REQ 3: TABAB
  updateReqBox('tabab', state.tababCombined, 55, state.okTabab, `${state.tababCombined.toFixed(1)} / min. 55 CFU`, state.okTabab ? `✓ Valido (${state.tababCombined.toFixed(1)} CFU)` : `Mancano ${(55 - state.tababCombined).toFixed(1)} CFU`);
  const tababSub = document.getElementById('tabab-detail-text');
  if (tababSub) tababSub.textContent = `Tab A: ${state.tabaCfu.toFixed(1)} + Tab B: ${state.tabbCfu.toFixed(1)}`;

  // REQ 4: TOTAL
  updateReqBox('total', state.totalCombined, 120, state.okTotal, `${state.totalCombined.toFixed(1)} / 120 CFU`, state.okTotal ? `✓ ${state.totalCombined.toFixed(1)} CFU` : `Mancano ${(120 - state.totalCombined).toFixed(1)} CFU`);
  const totalSub = document.getElementById('total-status-sub');
  if (totalSub) totalSub.textContent = `${state.totalPassedCfu.toFixed(1)} superati, ${state.totalPlannedCfu.toFixed(1)} pianificati${state.totalSovrannumeroCfu > 0 ? ` (+${state.totalSovrannumeroCfu.toFixed(1)} extra)` : ''}`;

  // REQ 5: OBBLIGATORI
  updateReqBoxCount('obbligatori', state.countObligatory, 8, state.okObbligatori, `${state.countObligatory} / 8 obbligatori`, state.okObbligatori ? '✓ 8/8 Selezionati' : `Mancano ${state.missingObligatory.length} obbligatori`);
  const obbSub = document.getElementById('obbligatori-detail-text');
  if (obbSub) {
    if (state.okObbligatori) {
      obbSub.textContent = 'Tutti gli 8 obbligatori inclusi';
    } else {
      obbSub.textContent = `Mancano: ${state.missingObligatory.map(m => m.name).join(', ')}`;
    }
  }

  // REQ 6: DOT & SOFT SKILLS
  updateReqBoxMax('dot-soft', state.dotSoftCount, 1, state.okDotSoft, `${state.dotSoftCount} / max 1 corso`, state.okDotSoft ? `✓ ${state.dotSoftCount}/1 corso` : `⚠️ Superato (${state.dotSoftCount}/1)!`);
  const dotSoftSub = document.getElementById('dot-soft-detail-text');
  if (dotSoftSub) {
    dotSoftSub.textContent = state.okDotSoft ? (state.dotSoftCount === 0 ? 'Nessun corso DOT/Soft nel piano' : '1 corso effettivo (limite rispettato)') : 'Superato limite max 1! Metti gli altri in sovrannumero';
  }

  // REQ 7: LIMIT 2
  updateReqBoxMax('limit2', state.limit2Count, 2, state.okLimit2, `${state.limit2Count} / max 2 corsi`, state.okLimit2 ? `✓ ${state.limit2Count}/2 corsi` : `⚠️ Superato (${state.limit2Count}/2)!`);
  const limit2Sub = document.getElementById('limit2-detail-text');
  if (limit2Sub) {
    limit2Sub.textContent = state.okLimit2 ? `${state.limit2Count} su max 2 corsi selezionati` : 'Superato limite max 2! Metti gli altri in sovrannumero';
  }

  // REQ 8: LIMIT 3 AI
  updateReqBoxMax('limit3-ai', state.limit3AiCount, 3, state.okLimit3Ai, `${state.limit3AiCount} / max 3 corsi`, state.okLimit3Ai ? `✓ ${state.limit3AiCount}/3 corsi` : `⚠️ Superato (${state.limit3AiCount}/3)!`);
  const limit3AiSub = document.getElementById('limit3-ai-detail-text');
  if (limit3AiSub) {
    limit3AiSub.textContent = state.okLimit3Ai ? `${state.limit3AiCount} su max 3 corsi AI selezionati` : 'Superato limite max 3 corsi AI!';
  }

  // Update Section Badges
  updateSectionPlanBadges();
  updatePlanCountPill();

  // Summary Banner
  updateSummaryBanner(state);
}

function updateReqBox(id, current, target, isValid, displayStr, badgeStr) {
  const box = document.getElementById(`box-req-${id}`);
  const valEl = document.getElementById(`val-req-${id}`);
  const badgeEl = document.getElementById(`badge-req-${id}`);
  const barEl = document.getElementById(`bar-req-${id}`);
  const pctEl = document.getElementById(`pct-req-${id}`);

  if (valEl) valEl.textContent = current.toFixed(1);
  const pct = Math.min(100, Math.round((current / target) * 100));
  if (pctEl) pctEl.textContent = `${pct}%`;

  if (barEl) {
    barEl.style.width = `${pct}%`;
    barEl.className = `req-progress-bar-fill ${isValid ? 'fill-valid' : 'fill-missing'}`;
  }

  if (box && badgeEl) {
    box.className = `req-box ${isValid ? 'status-valid' : 'status-missing'}`;
    badgeEl.className = `req-badge ${isValid ? 'badge-valid' : 'badge-missing'}`;
    badgeEl.textContent = badgeStr;
  }
}

function updateReqBoxCount(id, current, target, isValid, displayStr, badgeStr) {
  const box = document.getElementById(`box-req-${id}`);
  const valEl = document.getElementById(`val-req-${id}`);
  const badgeEl = document.getElementById(`badge-req-${id}`);
  const barEl = document.getElementById(`bar-req-${id}`);
  const pctEl = document.getElementById(`pct-req-${id}`);

  if (valEl) valEl.textContent = current;
  const pct = Math.min(100, Math.round((current / target) * 100));
  if (pctEl) pctEl.textContent = `${pct}%`;

  if (barEl) {
    barEl.style.width = `${pct}%`;
    barEl.className = `req-progress-bar-fill ${isValid ? 'fill-valid' : 'fill-missing'}`;
  }

  if (box && badgeEl) {
    box.className = `req-box ${isValid ? 'status-valid' : 'status-missing'}`;
    badgeEl.className = `req-badge ${isValid ? 'badge-valid' : 'badge-missing'}`;
    badgeEl.textContent = badgeStr;
  }
}

function updateReqBoxMax(id, current, maxLimit, isValid, displayStr, badgeStr) {
  const box = document.getElementById(`box-req-${id}`);
  const valEl = document.getElementById(`val-req-${id}`);
  const badgeEl = document.getElementById(`badge-req-${id}`);
  const barEl = document.getElementById(`bar-req-${id}`);
  const pctEl = document.getElementById(`pct-req-${id}`);

  if (valEl) valEl.textContent = current;
  if (pctEl) pctEl.textContent = `${current}/${maxLimit}`;

  const pct = Math.min(100, Math.round((current / maxLimit) * 100));
  if (barEl) {
    barEl.style.width = `${pct}%`;
    barEl.className = `req-progress-bar-fill ${isValid ? 'fill-valid' : 'fill-missing'}`;
  }

  if (box && badgeEl) {
    box.className = `req-box ${isValid ? 'status-valid' : 'status-missing'}`;
    badgeEl.className = `req-badge ${isValid ? 'badge-valid' : 'badge-missing'}`;
    badgeEl.textContent = badgeStr;
  }
}

function updateSummaryBanner(state) {
  const banner = document.getElementById('validation-summary-banner');
  const bannerText = document.getElementById('validation-summary-text');
  if (!banner || !bannerText) return;

  const {
    okObbligatori, missingObligatory,
    okInt1, int1Cfu,
    okTaba, tabaCfu,
    okTabab, tababCombined,
    okDotSoft, dotSoftCount,
    okLimit2, limit2Count,
    okLimit3Ai, limit3AiCount,
    okTotal, totalCombined,
    totalSovrannumeroCfu,
    validRulesCount
  } = state;

  const allOk = validRulesCount === 8;
  const allConstraintsExceptTotal = okObbligatori && okInt1 && okTaba && okTabab && okDotSoft && okLimit2 && okLimit3Ai;

  if (allOk) {
    banner.className = 'validation-summary-banner banner-valid';
    bannerText.innerHTML = `<strong>🎉 Complimenti! Il tuo piano di studi T2A è COMPLETAMENTE VALIDO:</strong>
      <ul style="margin: 0.35rem 0 0 1.25rem; font-size: 0.8rem; line-height: 1.45;">
        <li>Tutti gli 8 insegnamenti obbligatori (o convalidati da I livello) sono stati inseriti</li>
        <li>Gruppo INT1: <strong>${int1Cfu.toFixed(1)} CFU</strong> (minimo 15 CFU)</li>
        <li>Tabella A: <strong>${tabaCfu.toFixed(1)} CFU</strong> (minimo 45 CFU)</li>
        <li>Tabella A + B: <strong>${tababCombined.toFixed(1)} CFU</strong> (minimo 55 CFU)</li>
        <li>DOT &amp; Soft Skills: <strong>${dotSoftCount} corso</strong> (massimo 1 effettivo)</li>
        <li>Etica/Progetto/Diritto/Robotics: <strong>${limit2Count} corsi</strong> (massimo 2 effettivi)</li>
        <li>Intelligenza Artificiale: <strong>${limit3AiCount} corsi</strong> (massimo 3 effettivi)</li>
        <li>Totale CFU Effettivi: <strong>${totalCombined.toFixed(1)} / 120 CFU</strong> raggiunti!${totalSovrannumeroCfu > 0 ? ` (+<strong>${totalSovrannumeroCfu.toFixed(1)} CFU</strong> in sovrannumero)` : ''}</li>
      </ul>`;
  } else if (allConstraintsExceptTotal) {
    banner.className = 'validation-summary-banner banner-missing';
    bannerText.innerHTML = `<strong>✅ Tutti i vincoli specifici del piano T2A sono soddisfatti!</strong><br>
      (Obbligatori OK, INT1: ${int1Cfu.toFixed(1)}/15, Tabella A: ${tabaCfu.toFixed(1)}/45, Tabella A+B: ${tababCombined.toFixed(1)}/55, DOT/Soft: ${dotSoftCount}/1, Etica/Proj: ${limit2Count}/2, AI: ${limit3AiCount}/3).<br>
      Ti mancano ancora <strong>${(120 - totalCombined).toFixed(1)} CFU</strong> per raggiungere i 120 CFU totali della Laurea Magistrale.`;
  } else {
    banner.className = 'validation-summary-banner banner-missing';
    let issues = [];
    if (!okObbligatori) {
      const names = missingObligatory.map(o => `<em>${o.name} (${o.code})</em>`).join(', ');
      issues.push(`Mancano gli insegnamenti obbligatori T2A: ${names} (se già sostenuti in triennale, impostali su <em>'🏛️ Sostenuto al I Livello'</em>)`);
    }
    if (!okInt1) issues.push(`Mancano <strong>${(15 - int1Cfu).toFixed(1)} CFU</strong> dal Gruppo INT1`);
    if (!okTaba) issues.push(`Mancano <strong>${(45 - tabaCfu).toFixed(1)} CFU</strong> da Tabella A`);
    if (!okTabab) issues.push(`Mancano <strong>${(55 - tababCombined).toFixed(1)} CFU</strong> dal totale Tabella A + Tabella B`);
    if (!okDotSoft) issues.push(`Hai inserito <strong>${dotSoftCount}</strong> corsi tra Gruppo DOT e Soft Skills (massimo consentito: <strong>1</strong> corso effettivo; imposta i restanti come <em>'➕ In Sovrannumero'</em>)`);
    if (!okLimit2) issues.push(`Hai inserito <strong>${limit2Count}</strong> corsi del gruppo Etica/Progetto/Diritto/Robotics (massimo consentito: <strong>2</strong> corsi effettivi; imposta i restanti come <em>'➕ In Sovrannumero'</em>)`);
    if (!okLimit3Ai) issues.push(`Hai inserito <strong>${limit3AiCount}</strong> corsi del gruppo Intelligenza Artificiale (massimo consentito per T2A: <strong>3</strong> corsi effettivi)`);
    if (!okTotal && allConstraintsExceptTotal) issues.push(`Mancano <strong>${(120 - totalCombined).toFixed(1)} CFU</strong> per raggiungere i 120 CFU`);

    bannerText.innerHTML = `<strong>⚠️ Attenzione, il piano non rispetta tutti i vincoli:</strong>
      <ul style="margin: 0.35rem 0 0 1.25rem; font-size: 0.8rem; line-height: 1.45;">
        ${issues.map(iss => `<li>${iss}</li>`).join('')}
      </ul>`;
  }
}

// --- CONCURRENT FILTER ENGINE ---

function handleSearchInput() {
  const searchInput = document.getElementById('global-search');
  filterState.search = (searchInput ? searchInput.value : '').trim();
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.style.display = filterState.search.length > 0 ? 'block' : 'none';
  applyFilters();
}

function clearSearch() {
  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.value = '';
  filterState.search = '';
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.style.display = 'none';
  applyFilters();
}

function handleDropdownChange(type, value) {
  if (type === 'year') {
    filterState.year = value;
  } else if (type === 'requirement') {
    filterState.requirements.clear();
    if (value !== 'ALL' && value !== '_MULTI_') {
      filterState.requirements.add(value);
    }
  } else if (type === 'period') {
    filterState.period = value;
  } else if (type === 'status') {
    filterState.status = value;
  } else if (type === 'cfu') {
    filterState.cfu = value;
  } else if (type === 'language') {
    filterState.language = value;
  } else if (type === 'group') {
    filterState.group = value;
  }
  applyFilters();
}

function toggleRequirementPill(reqKey) {
  if (filterState.requirements.has(reqKey)) {
    filterState.requirements.delete(reqKey);
  } else {
    filterState.requirements.add(reqKey);
  }
  applyFilters();
}

function toggleYearPill(yearVal) {
  if (filterState.year === yearVal) {
    filterState.year = 'ALL';
  } else {
    filterState.year = yearVal;
  }
  applyFilters();
}

function togglePeriodPill(periodVal) {
  if (filterState.period === periodVal) {
    filterState.period = 'ALL';
  } else {
    filterState.period = periodVal;
  }
  applyFilters();
}

function togglePlanFilter() {
  if (filterState.status === 'in_plan') {
    filterState.status = 'ALL';
  } else {
    filterState.status = 'in_plan';
  }
  applyFilters();
}

function removeFilter(type, value) {
  if (type === 'search') {
    clearSearch();
    return;
  } else if (type === 'year') {
    filterState.year = 'ALL';
  } else if (type === 'requirement') {
    filterState.requirements.delete(value);
  } else if (type === 'period') {
    filterState.period = 'ALL';
  } else if (type === 'status') {
    filterState.status = 'ALL';
  } else if (type === 'cfu') {
    filterState.cfu = 'ALL';
  } else if (type === 'language') {
    filterState.language = 'ALL';
  } else if (type === 'group') {
    filterState.group = 'ALL';
  }
  applyFilters();
}

function resetFilters() {
  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.value = '';
  filterState.search = '';
  filterState.year = 'ALL';
  filterState.requirements.clear();
  filterState.period = 'ALL';
  filterState.status = 'ALL';
  filterState.cfu = 'ALL';
  filterState.language = 'ALL';
  filterState.group = 'ALL';

  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.style.display = 'none';

  applyFilters();
}

// Main Filtering Function: Evaluates all sections and rows against filterState concurrently
function applyFilters() {
  const query = filterState.search.toLowerCase().trim();
  const year = filterState.year;
  const reqs = filterState.requirements;
  const group = filterState.group;
  const period = filterState.period;
  const status = filterState.status;
  const cfu = filterState.cfu;
  const lang = filterState.language;

  // Determine if specific course-level filters are active (if so, choice rules rows -- are hidden)
  const hasSpecificFilters = Boolean(
    query.length > 0 ||
    reqs.size > 0 ||
    period !== 'ALL' ||
    status !== 'ALL' ||
    cfu !== 'ALL' ||
    lang !== 'ALL'
  );

  let totalVisibleCourses = 0;
  let totalVisibleSections = 0;

  document.querySelectorAll('.section-card').forEach(secCard => {
    const secId = secCard.id;
    let secCourseCount = 0;
    let secVisibleCount = 0;

    // Year matching: sec_0 is 1st year; all other sections are 2nd year
    const isYear1Sec = (secId === 'sec_0');
    const sectionMatchesYear = (year === 'ALL') || (year === '1' && isYear1Sec) || (year === '2' && !isYear1Sec);
    const sectionMatchesGroup = (group === 'ALL') || (group === secId);

    secCard.querySelectorAll('tbody tr').forEach(row => {
      const code = row.getAttribute('data-code');
      const isChoice = (code === '--');
      if (!isChoice) secCourseCount++;

      // If the section doesn't match year or specific group filter, hide row immediately
      if (!sectionMatchesYear || !sectionMatchesGroup) {
        row.style.display = 'none';
        return;
      }

      // Hide orientation choice placeholder rows when specific course filters are active
      if (isChoice && hasSpecificFilters) {
        row.style.display = 'none';
        return;
      }

      const rowText = row.textContent.toLowerCase();
      const rowPeriod = (row.getAttribute('data-period') || '').toLowerCase();
      const rowCfu = parseFloat(row.getAttribute('data-cfu')) || 0;
      const rowLang = (row.getAttribute('data-lang') || 'other');
      const isInt1 = row.getAttribute('data-is-int1') === 'true';
      const isTaba = row.getAttribute('data-is-taba') === 'true';
      const isTabb = row.getAttribute('data-is-tabb') === 'true';
      const isObb = row.getAttribute('data-is-obbligatorio') === 'true';
      const isDotSoft = row.getAttribute('data-is-dot-soft') === 'true';
      const isLimit2 = row.getAttribute('data-is-limit2') === 'true';
      const isAi = row.getAttribute('data-is-ai') === 'true';

      const userState = userNotesData[code] || {};
      const courseStatus = userState.status || 'none';
      const hasNote = Boolean(userState.note && userState.note.trim().length > 0);
      const isMyPlan = ['planned', 'passed', 'sovrannumero', 'passed_bachelor'].includes(courseStatus);

      // 1. Text Search Filter
      let matchesSearch = true;
      if (query.length > 0) {
        const noteText = (userState.note || '').toLowerCase();
        matchesSearch = rowText.includes(query) || noteText.includes(query);
      }

      // 2. Requirements Filter (Union: matches ANY of the selected requirements)
      let matchesReq = true;
      if (reqs.size > 0) {
        if (isChoice) {
          matchesReq = false;
        } else {
          matchesReq = false;
          for (const req of reqs) {
            if (req === 'REQ_OBBLIGATORI' && isObb) { matchesReq = true; break; }
            if (req === 'REQ_TABA' && isTaba) { matchesReq = true; break; }
            if (req === 'REQ_TABB' && isTabb) { matchesReq = true; break; }
            if (req === 'REQ_TABAB' && (isTaba || isTabb)) { matchesReq = true; break; }
            if (req === 'REQ_INT1' && isInt1) { matchesReq = true; break; }
            if (req === 'REQ_LIMIT3_AI' && isAi) { matchesReq = true; break; }
            if (req === 'REQ_LIMIT2' && isLimit2) { matchesReq = true; break; }
            if (req === 'REQ_DOT_SOFTSKILLS' && isDotSoft) { matchesReq = true; break; }
          }
        }
      }

      // 3. Period / Semester Filter
      let matchesPeriod = true;
      if (period !== 'ALL') {
        if (isChoice) {
          matchesPeriod = false;
        } else if (period === '1° sem') {
          matchesPeriod = rowPeriod.includes('1');
        } else if (period === '2° sem') {
          matchesPeriod = rowPeriod.includes('2');
        } else if (period === 'annuale') {
          matchesPeriod = rowPeriod.includes('annuale');
        }
      }

      // 4. Status in Plan Filter
      let matchesStatus = true;
      if (status !== 'ALL') {
        if (isChoice) {
          matchesStatus = false;
        } else if (status === 'in_plan') {
          matchesStatus = isMyPlan;
        } else if (status === 'not_in_plan') {
          matchesStatus = !isMyPlan;
        } else if (status === 'planned') {
          matchesStatus = (courseStatus === 'planned');
        } else if (status === 'passed') {
          matchesStatus = (courseStatus === 'passed');
        } else if (status === 'sovrannumero') {
          matchesStatus = (courseStatus === 'sovrannumero');
        } else if (status === 'passed_bachelor') {
          matchesStatus = (courseStatus === 'passed_bachelor');
        } else if (status === 'interested') {
          matchesStatus = (courseStatus === 'interested');
        } else if (status === 'excluded') {
          matchesStatus = (courseStatus === 'excluded');
        } else if (status === 'with_notes') {
          matchesStatus = hasNote;
        }
      }

      // 5. CFU Filter
      let matchesCfu = true;
      if (cfu !== 'ALL') {
        if (isChoice) {
          matchesCfu = false;
        } else if (cfu === '5.0') {
          matchesCfu = (rowCfu === 5);
        } else if (cfu === '10.0') {
          matchesCfu = (rowCfu === 10);
        } else if (cfu === 'other') {
          matchesCfu = (rowCfu !== 5 && rowCfu !== 10);
        }
      }

      // 6. Language Filter
      let matchesLang = true;
      if (lang !== 'ALL') {
        if (isChoice) {
          matchesLang = false;
        } else if (lang === 'en') {
          matchesLang = (rowLang === 'en');
        } else if (lang === 'it') {
          matchesLang = (rowLang === 'it');
        }
      }

      const isVisible = matchesSearch && matchesReq && matchesPeriod && matchesStatus && matchesCfu && matchesLang;

      if (isVisible) {
        row.style.display = '';
        if (!isChoice) {
          secVisibleCount++;
          totalVisibleCourses++;
        }
      } else {
        row.style.display = 'none';
      }
    });

    // Update section card visibility and badge
    const matchBadge = document.getElementById(`match-badge-${secId}`);
    const shouldShowSection = (secVisibleCount > 0) || (!hasSpecificFilters && sectionMatchesYear && sectionMatchesGroup);

    if (shouldShowSection) {
      secCard.style.display = '';
      totalVisibleSections++;

      if (matchBadge) {
        if (secVisibleCount < secCourseCount) {
          matchBadge.textContent = `${secVisibleCount} / ${secCourseCount} visibili`;
          matchBadge.className = 'section-match-badge badge-filtered';
          matchBadge.style.display = 'inline-block';
        } else {
          matchBadge.textContent = `${secCourseCount} corsi`;
          matchBadge.className = 'section-match-badge';
          matchBadge.style.display = 'inline-block';
        }
      }

      // Auto-expand section if query has matches and section was collapsed
      if (query.length > 0 && secVisibleCount > 0 && secCard.classList.contains('is-collapsed')) {
        toggleSection(secId);
      }
    } else {
      secCard.style.display = 'none';
      if (matchBadge) matchBadge.style.display = 'none';
    }
  });

  // Update empty state
  const noResultsCard = document.getElementById('no-results-card');
  if (noResultsCard) {
    noResultsCard.style.display = (totalVisibleCourses === 0) ? 'flex' : 'none';
  }

  // Update results count and UI states
  updateResultsCount(totalVisibleCourses, totalVisibleSections);
  updateFilterUIElements();
}

// Synchronize all dropdowns, pills, active filter tags, and reset button
function updateFilterUIElements() {
  // Sync dropdowns
  const yearSelect = document.getElementById('filter-year');
  if (yearSelect && yearSelect.value !== filterState.year) yearSelect.value = filterState.year;

  const periodSelect = document.getElementById('filter-period');
  if (periodSelect && periodSelect.value !== filterState.period) periodSelect.value = filterState.period;

  const statusSelect = document.getElementById('filter-status');
  if (statusSelect && statusSelect.value !== filterState.status) statusSelect.value = filterState.status;

  const cfuSelect = document.getElementById('filter-cfu');
  if (cfuSelect && cfuSelect.value !== filterState.cfu) cfuSelect.value = filterState.cfu;

  const langSelect = document.getElementById('filter-language');
  if (langSelect && langSelect.value !== filterState.language) langSelect.value = filterState.language;

  const groupSelect = document.getElementById('filter-group');
  if (groupSelect && groupSelect.value !== filterState.group) groupSelect.value = filterState.group;

  // Sync requirement dropdown
  const reqSelect = document.getElementById('filter-requirement');
  if (reqSelect) {
    let multiOption = reqSelect.querySelector('option[value="_MULTI_"]');
    if (filterState.requirements.size === 0) {
      if (multiOption) multiOption.remove();
      reqSelect.value = 'ALL';
    } else if (filterState.requirements.size === 1) {
      if (multiOption) multiOption.remove();
      reqSelect.value = Array.from(filterState.requirements)[0];
    } else {
      if (!multiOption) {
        multiOption = document.createElement('option');
        multiOption.value = '_MULTI_';
        reqSelect.appendChild(multiOption);
      }
      multiOption.textContent = `⚡ Multipli Selezionati (${filterState.requirements.size})`;
      reqSelect.value = '_MULTI_';
    }
  }

  // Count active filters
  let activeCount = 0;
  if (filterState.search.length > 0) activeCount++;
  if (filterState.year !== 'ALL') activeCount++;
  activeCount += filterState.requirements.size;
  if (filterState.period !== 'ALL') activeCount++;
  if (filterState.status !== 'ALL') activeCount++;
  if (filterState.cfu !== 'ALL') activeCount++;
  if (filterState.language !== 'ALL') activeCount++;
  if (filterState.group !== 'ALL') activeCount++;

  // Sync Reset Button
  const resetBtn = document.getElementById('btn-reset-filters');
  const countBadge = document.getElementById('filter-count-badge');
  if (resetBtn) {
    resetBtn.disabled = (activeCount === 0);
  }
  if (countBadge) {
    if (activeCount > 0) {
      countBadge.textContent = activeCount;
      countBadge.style.display = 'inline-flex';
    } else {
      countBadge.style.display = 'none';
    }
  }

  // Sync Quick Pills
  const pillAll = document.getElementById('pill-all');
  if (pillAll) {
    pillAll.classList.toggle('active', activeCount === 0);
  }

  const pillPlan = document.getElementById('pill-plan');
  const isPlanActive = (filterState.status === 'in_plan');
  if (pillPlan) {
    pillPlan.classList.toggle('active', isPlanActive);
  }

  const headerPlanBtn = document.getElementById('btn-toggle-plan');
  if (headerPlanBtn) {
    headerPlanBtn.classList.toggle('btn-accent', isPlanActive);
  }

  // Requirement chips
  document.querySelectorAll('.filter-chip.chip-req').forEach(chip => {
    const req = chip.getAttribute('data-req');
    chip.classList.toggle('active', filterState.requirements.has(req));
  });

  // Year chips
  const pillYear1 = document.getElementById('pill-year-1');
  if (pillYear1) pillYear1.classList.toggle('active', filterState.year === '1');
  const pillYear2 = document.getElementById('pill-year-2');
  if (pillYear2) pillYear2.classList.toggle('active', filterState.year === '2');

  // Semester chips
  const pillSem1 = document.getElementById('pill-sem-1');
  if (pillSem1) pillSem1.classList.toggle('active', filterState.period === '1° sem');
  const pillSem2 = document.getElementById('pill-sem-2');
  if (pillSem2) pillSem2.classList.toggle('active', filterState.period === '2° sem');

  // Render Active Filter Tags Tray
  renderActiveFilterTags(activeCount);
}

function renderActiveFilterTags(activeCount) {
  const bar = document.getElementById('active-filters-bar');
  const list = document.getElementById('active-tags-list');
  if (!bar || !list) return;

  if (activeCount === 0) {
    bar.style.display = 'none';
    list.innerHTML = '';
    return;
  }

  bar.style.display = 'flex';
  const tagsHtml = [];

  if (filterState.search.length > 0) {
    tagsHtml.push(`
      <span class="active-tag">
        <span>Testo: "<strong>${escapeHtml(filterState.search)}</strong>"</span>
        <button type="button" class="active-tag-remove" onclick="removeFilter('search')" title="Rimuovi filtro ricerca">✕</button>
      </span>
    `);
  }

  if (filterState.year !== 'ALL') {
    const yrLabel = filterState.year === '1' ? '1° Anno' : '2° Anno';
    tagsHtml.push(`
      <span class="active-tag">
        <span>Anno: <strong>${yrLabel}</strong></span>
        <button type="button" class="active-tag-remove" onclick="removeFilter('year')" title="Rimuovi filtro anno">✕</button>
      </span>
    `);
  }

  filterState.requirements.forEach(req => {
    const reqLabel = REQUIREMENT_LABELS[req] || req;
    tagsHtml.push(`
      <span class="active-tag">
        <span>Vincolo: <strong>${escapeHtml(reqLabel)}</strong></span>
        <button type="button" class="active-tag-remove" onclick="removeFilter('requirement', '${req}')" title="Rimuovi vincolo">✕</button>
      </span>
    `);
  });

  if (filterState.period !== 'ALL') {
    tagsHtml.push(`
      <span class="active-tag">
        <span>Semestre: <strong>${escapeHtml(filterState.period)}</strong></span>
        <button type="button" class="active-tag-remove" onclick="removeFilter('period')" title="Rimuovi filtro semestre">✕</button>
      </span>
    `);
  }

  if (filterState.status !== 'ALL') {
    const stLabel = STATUS_LABELS[filterState.status] || filterState.status;
    tagsHtml.push(`
      <span class="active-tag">
        <span>Stato: <strong>${escapeHtml(stLabel)}</strong></span>
        <button type="button" class="active-tag-remove" onclick="removeFilter('status')" title="Rimuovi filtro stato">✕</button>
      </span>
    `);
  }

  if (filterState.cfu !== 'ALL') {
    const cfuLabel = (filterState.cfu === 'other') ? 'Altri CFU' : `${filterState.cfu} CFU`;
    tagsHtml.push(`
      <span class="active-tag">
        <span>CFU: <strong>${cfuLabel}</strong></span>
        <button type="button" class="active-tag-remove" onclick="removeFilter('cfu')" title="Rimuovi filtro CFU">✕</button>
      </span>
    `);
  }

  if (filterState.language !== 'ALL') {
    const langLabel = (filterState.language === 'en') ? 'Inglese' : 'Italiano';
    tagsHtml.push(`
      <span class="active-tag">
        <span>Lingua: <strong>${langLabel}</strong></span>
        <button type="button" class="active-tag-remove" onclick="removeFilter('language')" title="Rimuovi filtro lingua">✕</button>
      </span>
    `);
  }

  if (filterState.group !== 'ALL') {
    const grpLabel = SECTION_NAMES_MAP[filterState.group] || filterState.group;
    tagsHtml.push(`
      <span class="active-tag">
        <span>Tabella: <strong>${escapeHtml(grpLabel)}</strong></span>
        <button type="button" class="active-tag-remove" onclick="removeFilter('group')" title="Rimuovi filtro sezione">✕</button>
      </span>
    `);
  }

  list.innerHTML = tagsHtml.join('');
}

function updateResultsCount(visibleCourses, visibleSections) {
  const visibleNumEl = document.getElementById('visible-count');
  if (visibleNumEl) visibleNumEl.textContent = visibleCourses;

  const countBadge = document.getElementById('results-count');
  if (countBadge) {
    countBadge.title = `${visibleCourses} insegnamenti visibili in ${visibleSections} tabelle`;
  }
}

function updatePlanCountPill() {
  const countEl = document.getElementById('pill-plan-count');
  if (!countEl) return;

  const planCodes = new Set();
  Object.entries(userNotesData).forEach(([code, data]) => {
    if (['planned', 'passed', 'sovrannumero', 'passed_bachelor'].includes(data.status)) {
      planCodes.add(code);
    }
  });

  countEl.textContent = planCodes.size;
}

// Backward Compatibility Wrappers
function handleSearch() { applyFilters(); }
function handleFilterChange() { applyFilters(); }
function toggleOnlyPlanned(btn) { togglePlanFilter(); }
function setQuickGroup(grpVal, pillBtn) {
  if (grpVal === 'ALL') {
    resetFilters();
  } else if (grpVal.startsWith('REQ_')) {
    toggleRequirementPill(grpVal);
  } else if (grpVal === 'sec_0') {
    toggleYearPill('1');
  } else if (grpVal === 'sec_1') {
    toggleYearPill('2');
  } else {
    filterState.group = grpVal;
    applyFilters();
  }
}

// --- INFO & VALIDATION CARD COLLAPSE ---
function toggleInfoCard() {
  const body = document.getElementById('info-card-body');
  const icon = document.getElementById('info-toggle-icon');
  if (body.style.display === 'none') {
    body.style.display = 'grid';
    icon.style.transform = 'rotate(0deg)';
  } else {
    body.style.display = 'none';
    icon.style.transform = 'rotate(-90deg)';
  }
}

function toggleValidationCard() {
  const body = document.getElementById('validation-card-body');
  const icon = document.getElementById('validation-toggle-icon');
  const txt = document.getElementById('validation-toggle-text');
  if (body.style.display === 'none') {
    body.style.display = 'flex';
    icon.style.transform = 'rotate(0deg)';
    txt.textContent = 'Nascondi';
  } else {
    body.style.display = 'none';
    icon.style.transform = 'rotate(-90deg)';
    txt.textContent = 'Mostra';
  }
}

function scrollToValidation() {
  const card = document.getElementById('validation-dashboard');
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const body = document.getElementById('validation-card-body');
    if (body.style.display === 'none') toggleValidationCard();
  }
}

function copyText(txt) {
  navigator.clipboard.writeText(txt).then(() => {
    alert(`Codice ${txt} copiato negli appunti!`);
  }).catch(() => {});
}

// --- EXPORT & IMPORT MODALS ---
function openExportModal() {
  modalMode = 'export';
  document.getElementById('modal-title').textContent = 'Esporta Note e Piano di Studi';
  document.getElementById('modal-desc').textContent = 'Copia questo testo JSON per conservare un backup delle tue note e scelte di piano:';
  document.getElementById('modal-text').value = JSON.stringify(userNotesData, null, 2);
  document.getElementById('modal-text').readOnly = true;
  document.getElementById('modal-action-btn').textContent = 'Copia negli Appunti';
  document.getElementById('data-modal').style.display = 'flex';
}

function openImportModal() {
  modalMode = 'import';
  document.getElementById('modal-title').textContent = 'Importa Note e Piano di Studi';
  document.getElementById('modal-desc').textContent = 'Incolla qui sotto il testo JSON esportato in precedenza:';
  document.getElementById('modal-text').value = '';
  document.getElementById('modal-text').readOnly = false;
  document.getElementById('modal-action-btn').textContent = 'Ripristina Note';
  document.getElementById('data-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('data-modal').style.display = 'none';
}

function executeModalAction() {
  if (modalMode === 'export') {
    const txt = document.getElementById('modal-text').value;
    navigator.clipboard.writeText(txt).then(() => {
      alert('Note copiate negli appunti con successo!');
      closeModal();
    });
  } else {
    try {
      const parsed = JSON.parse(document.getElementById('modal-text').value);
      userNotesData = parsed;
      saveUserData();
      renderTables();
      recalculateStats();
      applyFilters();
      alert('Note importate con successo!');
      closeModal();
    } catch (e) {
      alert('Errore nel formato JSON. Assicurati di aver incollato un JSON valido.');
    }
  }
}

// --- APPLICATION INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
  await loadUserData();
  renderTables();
  recalculateStats();
  applyFilters();
});
