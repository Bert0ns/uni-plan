// State, UI Rendering, Search, and Event Handlers

let userNotesData = {};
let saveTimeout = null;
let showOnlyPlanned = false;
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

// --- DATA PERSISTENCE & LOCAL CACHING ---
async function loadUserData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        userNotesData = parsed;
        updateCacheStatusUI('Salvato in locale');
        return;
      }
    }
  } catch (e) {
    console.error('Failed to load user notes from localStorage:', e);
  }

  // Fallback to pre-saved study plan file if available
  try {
    const resp = await fetch('data/study-plan-state.json');
    if (resp.ok) {
      userNotesData = await resp.json();
      saveUserData({ silent: true });
      updateCacheStatusUI('Salvato in locale');
      return;
    }
  } catch (e) {
    console.warn('Could not load data/study-plan-state.json default:', e);
  }

  // Fallback to embedded default state
  if (typeof DEFAULT_STUDY_PLAN_STATE !== 'undefined') {
    userNotesData = JSON.parse(JSON.stringify(DEFAULT_STUDY_PLAN_STATE));
    saveUserData({ silent: true });
    updateCacheStatusUI('Salvato in locale');
  } else {
    userNotesData = {};
  }
}

let flashStatusTimer = null;
function flashCacheStatus() {
  const dotEl = document.getElementById('cache-dot');
  const textEl = document.getElementById('cache-status-text');
  if (!dotEl || !textEl) return;

  dotEl.classList.add('saving');
  textEl.textContent = 'Salvataggio...';

  clearTimeout(flashStatusTimer);
  flashStatusTimer = setTimeout(() => {
    dotEl.classList.remove('saving');
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    textEl.textContent = `Salvato (${timeStr})`;
  }, 400);
}

function updateCacheStatusUI(text, isError = false) {
  const textEl = document.getElementById('cache-status-text');
  const dotEl = document.getElementById('cache-dot');
  if (textEl) textEl.textContent = text;
  if (dotEl) {
    dotEl.className = 'cache-dot';
    dotEl.style.background = isError ? '#ef4444' : '#10b981';
    dotEl.style.boxShadow = isError ? '0 0 6px #ef4444' : '0 0 6px rgba(16, 185, 129, 0.7)';
  }
}

function cleanUserPlanData() {
  if (!userNotesData || typeof userNotesData !== 'object') {
    userNotesData = {};
    return;
  }
  for (const [code, val] of Object.entries(userNotesData)) {
    if (!val || typeof val !== 'object') {
      delete userNotesData[code];
      continue;
    }
    if (val.note !== undefined && (!val.note || !String(val.note).trim())) {
      delete val.note;
    }
    if ((!val.status || val.status === 'none') && !val.note) {
      delete userNotesData[code];
    }
  }
}

function saveUserData(options = {}) {
  cleanUserPlanData();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userNotesData));
    if (!options.silent) {
      flashCacheStatus();
    }
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    updateCacheStatusUI('Errore salvataggio', true);
  }
  recalculateStats();
}

function flushPendingNotes() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
    saveUserData();
  }
}

// Global hooks ensuring browser cache is never lost on navigation/tab close
window.addEventListener('beforeunload', flushPendingNotes);
window.addEventListener('pagehide', flushPendingNotes);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flushPendingNotes();
  }
});

function sanitizeUrl(url) {
  if (!url) return '#';
  // Ensure unescaping any entity before passing to escapeHtml to prevent double-escaping
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
        <tr id="${row.row_id}" class="choice-rule-row" data-code="--" data-sec="${sec.id}" data-name="${escapeHtml(row.name.toLowerCase())}" data-ssd="--" data-ssdsm="--" data-period="--" data-cfu="---" data-is-int1="false" data-is-taba="false" data-is-tabb="false">
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

      return `
      <tr id="${row.row_id}" class="row-${status}" data-code="${row.code}" data-sec="${sec.id}" data-name="${escapeHtml(row.name.toLowerCase())}" data-ssd="${escapeHtml(row.ssd.toLowerCase())}" data-ssdsm="${escapeHtml(row.ssdsm.toLowerCase())}" data-period="${escapeHtml(row.period)}" data-cfu="${row.cfu}" data-is-int1="${row.is_int1}" data-is-taba="${row.is_taba}" data-is-tabb="${row.is_tabb}" data-is-obbligatorio="${row.is_obbligatorio}" data-is-ai="${row.is_ai}" data-is-limit2="${row.is_limit2}" data-is-dot-soft="${row.is_dot || row.is_soft}">
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
            <textarea class="user-note-input" data-code="${row.code}" placeholder="Aggiungi nota personale..." oninput="handleNoteInput('${row.code}', this.value)" onblur="flushPendingNotes()" onchange="flushPendingNotes()">${escapeHtml(note)}</textarea>
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
  if (status === 'none' && (!userNotesData[code].note || !userNotesData[code].note.trim())) {
    delete userNotesData[code];
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

  if (showOnlyPlanned) {
    handleSearch();
  }
}

function handleNoteInput(code, text) {
  if (!userNotesData[code]) userNotesData[code] = {};
  if (text && text.trim().length > 0) {
    userNotesData[code].note = text;
  } else {
    delete userNotesData[code].note;
  }
  if ((!userNotesData[code].status || userNotesData[code].status === 'none') && !userNotesData[code].note) {
    delete userNotesData[code];
  }

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

// --- SEARCH & FILTER ENGINE ---
function handleSearch() {
  const searchInput = document.getElementById('global-search');
  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.style.display = query.length > 0 ? 'block' : 'none';

  const groupFilter = document.getElementById('filter-group').value;
  const periodFilter = document.getElementById('filter-period').value;
  const statusFilter = document.getElementById('filter-status').value;

  let visibleCount = 0;

  document.querySelectorAll('.section-card').forEach(secCard => {
    const secId = secCard.id;
    const matchesGroup = (groupFilter === 'ALL' || groupFilter.startsWith('REQ_') || groupFilter === secId);

    let secVisibleRows = 0;

    secCard.querySelectorAll('tbody tr').forEach(row => {
      const code = row.getAttribute('data-code');
      const isChoice = (code === '--');
      const rowText = row.textContent.toLowerCase();
      const period = row.getAttribute('data-period') || '';
      const isInt1 = row.getAttribute('data-is-int1') === 'true';
      const isTaba = row.getAttribute('data-is-taba') === 'true';
      const isTabb = row.getAttribute('data-is-tabb') === 'true';
      const isObb = row.getAttribute('data-is-obbligatorio') === 'true';
      const isDotSoft = row.getAttribute('data-is-dot-soft') === 'true';
      const isLimit2 = row.getAttribute('data-is-limit2') === 'true';
      const isAi = row.getAttribute('data-is-ai') === 'true';

      const userState = userNotesData[code] || {};
      const courseStatus = userState.status || 'none';
      const hasNote = userState.note && userState.note.trim().length > 0;
      const isMyPlan = ['planned', 'passed', 'sovrannumero', 'passed_bachelor'].includes(courseStatus);

      if (!matchesGroup) {
        row.style.display = 'none';
        return;
      }

      if (groupFilter === 'REQ_INT1' && (!isInt1 || isChoice)) {
        row.style.display = 'none';
        return;
      }
      if (groupFilter === 'REQ_TABA' && (!isTaba || isChoice)) {
        row.style.display = 'none';
        return;
      }
      if (groupFilter === 'REQ_TABB' && (!isTabb || isChoice)) {
        row.style.display = 'none';
        return;
      }
      if (groupFilter === 'REQ_TABAB' && ((!isTaba && !isTabb) || isChoice)) {
        row.style.display = 'none';
        return;
      }
      if (groupFilter === 'REQ_OBBLIGATORI' && (!isObb || isChoice)) {
        row.style.display = 'none';
        return;
      }
      if (groupFilter === 'REQ_DOT_SOFTSKILLS' && (!isDotSoft || isChoice)) {
        row.style.display = 'none';
        return;
      }
      if (groupFilter === 'REQ_LIMIT2' && (!isLimit2 || isChoice)) {
        row.style.display = 'none';
        return;
      }
      if (groupFilter === 'REQ_LIMIT3_AI' && (!isAi || isChoice)) {
        row.style.display = 'none';
        return;
      }

      if (showOnlyPlanned && !isMyPlan) {
        row.style.display = 'none';
        return;
      }

      if (statusFilter === 'plan_active' && !isMyPlan) {
        row.style.display = 'none';
        return;
      } else if (statusFilter === 'planned' && courseStatus !== 'planned') {
        row.style.display = 'none';
        return;
      } else if (statusFilter === 'passed' && courseStatus !== 'passed') {
        row.style.display = 'none';
        return;
      } else if (statusFilter === 'sovrannumero' && courseStatus !== 'sovrannumero') {
        row.style.display = 'none';
        return;
      } else if (statusFilter === 'passed_bachelor' && courseStatus !== 'passed_bachelor') {
        row.style.display = 'none';
        return;
      } else if (statusFilter === 'interested' && courseStatus !== 'interested') {
        row.style.display = 'none';
        return;
      } else if (statusFilter === 'excluded' && courseStatus !== 'excluded') {
        row.style.display = 'none';
        return;
      } else if (statusFilter === 'with_notes' && !hasNote) {
        row.style.display = 'none';
        return;
      }

      if (periodFilter !== 'ALL' && period !== periodFilter && !isChoice) {
        row.style.display = 'none';
        return;
      }

      if (query.length > 0 && !rowText.includes(query)) {
        row.style.display = 'none';
        return;
      }

      row.style.display = '';
      secVisibleRows++;
      if (!isChoice) visibleCount++;
    });

    secCard.style.display = (secVisibleRows > 0) ? '' : 'none';
    if (query.length > 0 && secVisibleRows > 0 && secCard.classList.contains('is-collapsed')) {
      toggleSection(secId);
    }
  });

  const countEl = document.getElementById('results-count');
  if (countEl) {
    countEl.textContent = `Mostrati ${visibleCount} insegnamenti`;
  }
}

function clearSearch() {
  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.value = '';
  handleSearch();
}

function handleFilterChange() {
  handleSearch();
}

function setQuickGroup(grpVal, pillBtn) {
  document.querySelectorAll('.filter-pills .filter-pill').forEach(p => p.classList.remove('active'));
  if (pillBtn) pillBtn.classList.add('active');
  document.getElementById('filter-group').value = grpVal;
  handleSearch();
}

function toggleOnlyPlanned(btn) {
  showOnlyPlanned = !showOnlyPlanned;
  const navBtn = document.getElementById('btn-toggle-plan');
  if (showOnlyPlanned) {
    if (navBtn) navBtn.classList.add('btn-accent');
    if (btn) btn.classList.add('active');
  } else {
    if (navBtn) navBtn.classList.remove('btn-accent');
    if (btn) btn.classList.remove('active');
  }
  handleSearch();
}

function resetFilters() {
  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.value = '';
  document.getElementById('filter-group').value = 'ALL';
  document.getElementById('filter-period').value = 'ALL';
  document.getElementById('filter-status').value = 'ALL';
  showOnlyPlanned = false;
  const navBtn = document.getElementById('btn-toggle-plan');
  if (navBtn) navBtn.classList.remove('btn-accent');
  document.querySelectorAll('.filter-pills .filter-pill').forEach(p => p.classList.remove('active'));
  const firstPill = document.querySelector('.filter-pills .filter-pill');
  if (firstPill) firstPill.classList.add('active');
  handleSearch();
}

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

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
  } else {
    iconSvg = '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
  }

  toast.innerHTML = `<span style="display:inline-flex; align-items:center;">${iconSvg}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

// --- EXPORT & IMPORT MODALS & FILE HANDLING ---
function openExportModal() {
  flushPendingNotes();
  cleanUserPlanData();
  modalMode = 'export';

  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const exportPanel = document.getElementById('modal-export-panel');
  const importPanel = document.getElementById('modal-import-panel');
  const resetDefaultBtn = document.getElementById('modal-reset-default-btn');
  const clearPlanBtn = document.getElementById('modal-clear-plan-btn');
  const actionBtn = document.getElementById('modal-action-btn');
  const modalText = document.getElementById('modal-text');

  if (modalTitle) modalTitle.textContent = 'Esporta Piano di Studi (JSON)';
  if (modalDesc) modalDesc.textContent = 'Scarica lo stato attuale del tuo piano di studi (inclusi CFU, stati e note) come file JSON, oppure copialo negli appunti.';

  if (exportPanel) exportPanel.style.display = 'block';
  if (importPanel) importPanel.style.display = 'none';
  if (resetDefaultBtn) resetDefaultBtn.style.display = 'none';
  if (clearPlanBtn) clearPlanBtn.style.display = 'none';

  // Populate mini-dashboard
  const state = evaluatePlanState(userNotesData);
  const plannedCount = Object.values(userNotesData).filter(v => ['planned', 'passed', 'sovrannumero', 'passed_bachelor'].includes(v.status)).length;
  const notesCount = Object.values(userNotesData).filter(v => v.note && v.note.trim().length > 0).length;

  const statsContainer = document.getElementById('modal-export-stats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="modal-stat-item">
        <span class="modal-stat-val">${state.totalCombined.toFixed(1)}</span>
        <span class="modal-stat-lbl">CFU Effettivi</span>
      </div>
      <div class="modal-stat-item">
        <span class="modal-stat-val">${plannedCount}</span>
        <span class="modal-stat-lbl">Insegnamenti</span>
      </div>
      <div class="modal-stat-item">
        <span class="modal-stat-val">${state.validRulesCount}/8</span>
        <span class="modal-stat-lbl">Vincoli T2A</span>
      </div>
      <div class="modal-stat-item">
        <span class="modal-stat-val">${notesCount}</span>
        <span class="modal-stat-lbl">Note Personali</span>
      </div>
    `;
  }

  if (modalText) {
    modalText.value = JSON.stringify(userNotesData, null, 2);
    modalText.readOnly = true;
  }

  if (actionBtn) {
    actionBtn.textContent = 'Scarica File .json';
    actionBtn.onclick = downloadPlanJsonFile;
  }

  const modal = document.getElementById('data-modal');
  if (modal) modal.style.display = 'flex';
}

function downloadPlanJsonFile() {
  flushPendingNotes();
  cleanUserPlanData();
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `piano-studi-t2a_${dateStr}.json`;
  const jsonStr = JSON.stringify(userNotesData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`File "${filename}" scaricato con successo!`, 'success');
}

function copyPlanJsonToClipboard() {
  flushPendingNotes();
  cleanUserPlanData();
  const jsonStr = JSON.stringify(userNotesData, null, 2);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr).then(() => {
      showToast('JSON copiato negli appunti!', 'success');
    }).catch(() => {
      copyFallback(jsonStr);
    });
  } else {
    copyFallback(jsonStr);
  }
}

function copyFallback(text) {
  const modalText = document.getElementById('modal-text');
  if (modalText) {
    modalText.select();
    document.execCommand('copy');
    showToast('JSON copiato negli appunti!', 'success');
  } else {
    showToast('Impossibile copiare negli appunti.', 'error');
  }
}

function openImportModal() {
  flushPendingNotes();
  modalMode = 'import';

  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const exportPanel = document.getElementById('modal-export-panel');
  const importPanel = document.getElementById('modal-import-panel');
  const resetDefaultBtn = document.getElementById('modal-reset-default-btn');
  const clearPlanBtn = document.getElementById('modal-clear-plan-btn');
  const actionBtn = document.getElementById('modal-action-btn');
  const modalText = document.getElementById('modal-text');
  const fileInput = document.getElementById('import-file-input');
  const statusEl = document.getElementById('file-import-status');

  if (modalTitle) modalTitle.textContent = 'Importa Piano di Studi (File JSON)';
  if (modalDesc) modalDesc.textContent = 'Carica un file .json salvato in precedenza oppure incolla direttamente il JSON per ripristinare il piano:';

  if (exportPanel) exportPanel.style.display = 'none';
  if (importPanel) importPanel.style.display = 'block';
  if (resetDefaultBtn) resetDefaultBtn.style.display = 'inline-block';
  if (clearPlanBtn) clearPlanBtn.style.display = 'inline-block';

  if (fileInput) fileInput.value = '';
  if (statusEl) {
    statusEl.style.display = 'none';
    statusEl.textContent = '';
  }

  if (modalText) {
    modalText.value = '';
    modalText.readOnly = false;
    modalText.placeholder = '{\n  "088983": { "status": "passed", "cfu": 5 },\n  "089182": { "status": "planned", "cfu": 5 }\n}';
  }

  if (actionBtn) {
    actionBtn.textContent = 'Importa Piano';
    actionBtn.onclick = executeModalAction;
  }

  const modal = document.getElementById('data-modal');
  if (modal) modal.style.display = 'flex';
}

function closeModal() {
  const modal = document.getElementById('data-modal');
  if (modal) modal.style.display = 'none';
}

function validateAndNormalizePlanData(input) {
  let parsed;
  if (typeof input === 'string') {
    try {
      const clean = input.trim().replace(/^\uFEFF/, '');
      parsed = JSON.parse(clean);
    } catch (e) {
      return { valid: false, error: 'Sintassi JSON non valida: ' + e.message };
    }
  } else if (input && typeof input === 'object') {
    parsed = input;
  } else {
    return { valid: false, error: 'Il file o testo non contiene un oggetto JSON valido.' };
  }

  // Handle common wrapper keys (e.g. { "plan": { ... } }, { "studyPlan": { ... } }, etc.)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    for (const wrapperKey of ['plan', 'userNotesData', 'studyPlan', 'courses', 'data', 'piano']) {
      if (parsed[wrapperKey] && typeof parsed[wrapperKey] === 'object' && !Array.isArray(parsed[wrapperKey])) {
        parsed = parsed[wrapperKey];
        break;
      }
    }
  }

  // Handle array of course objects: [ { code: "088983", status: "passed", cfu: 5 }, ... ]
  if (Array.isArray(parsed)) {
    const obj = {};
    for (const item of parsed) {
      if (item && typeof item === 'object') {
        const code = item.code || item.codice || item.courseCode || item.id;
        if (code) {
          obj[code] = item;
        }
      }
    }
    parsed = obj;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { valid: false, error: 'Il JSON deve essere un oggetto contenente i codici degli insegnamenti o una lista di corsi.' };
  }

  const validData = {};
  let count = 0;

  const statusAliases = {
    'pianificato': 'planned',
    'nel piano': 'planned',
    'nel_piano': 'planned',
    'superato': 'passed',
    'verbalizzato': 'passed',
    'sovrannumero': 'sovrannumero',
    'extra': 'sovrannumero',
    'in sovrannumero': 'sovrannumero',
    'in_sovrannumero': 'sovrannumero',
    'triennale': 'passed_bachelor',
    'i livello': 'passed_bachelor',
    'primo livello': 'passed_bachelor',
    'primo_livello': 'passed_bachelor',
    'bachelor': 'passed_bachelor',
    'sostenuto al i livello': 'passed_bachelor',
    'sostenuto_primo_livello': 'passed_bachelor',
    'in valutazione': 'interested',
    'in_valutazione': 'interested',
    'valutazione': 'interested',
    'interessato': 'interested',
    'preferito': 'interested',
    'escluso': 'excluded',
    'none': 'none'
  };
  const allowedStatuses = new Set(['planned', 'passed', 'sovrannumero', 'passed_bachelor', 'interested', 'excluded', 'none']);

  for (const [code, val] of Object.entries(parsed)) {
    if (!val || typeof val !== 'object') continue;
    const entry = {};

    if (val.status !== undefined && val.status !== null) {
      let st = String(val.status).trim().toLowerCase();
      if (statusAliases[st]) st = statusAliases[st];
      if (allowedStatuses.has(st)) {
        entry.status = st;
      }
    }

    if (val.cfu !== undefined && val.cfu !== null) {
      const parsedCfu = parseFloat(String(val.cfu).replace(',', '.'));
      if (!isNaN(parsedCfu) && parsedCfu > 0) {
        entry.cfu = parsedCfu;
      }
    }

    if (val.note !== undefined && val.note !== null) {
      const noteStr = String(val.note).trim();
      if (noteStr.length > 0) {
        entry.note = String(val.note);
      }
    }

    // Keep entry if it has an active status or a note
    if ((entry.status && entry.status !== 'none') || entry.note) {
      validData[code] = entry;
      count++;
    }
  }

  if (count === 0 && Object.keys(parsed).length > 0) {
    return { valid: true, data: {}, courseCount: 0 };
  } else if (count === 0) {
    return { valid: false, error: 'Nessun insegnamento valido trovato nel file JSON fornito.' };
  }

  return { valid: true, data: validData, courseCount: count };
}

function handleFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  processJsonFile(file);
  event.target.value = '';
}

function processJsonFile(file) {
  const statusEl = document.getElementById('file-import-status');
  if (!file.name.toLowerCase().endsWith('.json') && file.type && !file.type.includes('json')) {
    if (statusEl) {
      statusEl.style.display = 'flex';
      statusEl.className = 'file-status-badge status-err';
      statusEl.textContent = 'Attenzione: seleziona un file con estensione .json';
    }
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const res = validateAndNormalizePlanData(content);
    if (!res.valid) {
      if (statusEl) {
        statusEl.style.display = 'flex';
        statusEl.className = 'file-status-badge status-err';
        statusEl.textContent = res.error || 'Errore durante la lettura del file JSON.';
      }
      return;
    }

    if (statusEl) {
      statusEl.style.display = 'flex';
      statusEl.className = 'file-status-badge status-ok';
      statusEl.innerHTML = `<span>✓ File <strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB) — <strong>${res.courseCount}</strong> insegnamenti rilevati.</span> <button class="btn btn-sm btn-primary" onclick="executeModalAction()" style="margin-left:auto; padding:0.25rem 0.65rem; font-size:0.75rem;">Importa Subito</button>`;
    }

    const textEl = document.getElementById('modal-text');
    if (textEl) {
      textEl.value = JSON.stringify(res.data, null, 2);
    }
  };
  reader.onerror = () => {
    if (statusEl) {
      statusEl.style.display = 'flex';
      statusEl.className = 'file-status-badge status-err';
      statusEl.textContent = 'Errore durante la lettura del file.';
    }
  };
  reader.readAsText(file);
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('file-drop-zone');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'dragend'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    const dt = e.dataTransfer;
    const files = dt && dt.files;
    if (files && files.length > 0) {
      processJsonFile(files[0]);
    }
  }, false);
}

function setupGlobalDragAndDrop() {
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  }, false);

  window.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt && dt.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.json') || (file.type && file.type.includes('json'))) {
        e.preventDefault();
        openImportModal();
        processJsonFile(file);
      }
    }
  }, false);
}

function executeModalAction() {
  if (modalMode === 'export') {
    downloadPlanJsonFile();
    return;
  }

  const rawText = document.getElementById('modal-text').value.trim();
  if (!rawText) {
    showToast('Inserisci del testo JSON o seleziona un file JSON da caricare.', 'error');
    return;
  }

  const res = validateAndNormalizePlanData(rawText);
  if (!res.valid) {
    showToast(res.error || 'JSON non valido.', 'error');
    return;
  }

  userNotesData = res.data;
  saveUserData();
  renderTables();
  recalculateStats();
  handleSearch();

  closeModal();
  showToast(`Piano di studi importato con successo (${res.courseCount} corsi) e salvato nel browser!`, 'success', 4000);
}

function clearPlan() {
  if (!confirm('Sei sicuro di voler azzerare il piano di studi? Tutti gli stati e le note degli insegnamenti verranno rimossi.')) {
    return;
  }
  userNotesData = {};
  saveUserData();
  renderTables();
  recalculateStats();
  handleSearch();
  closeModal();
  showToast('Piano di studi azzerato e aggiornato nella memoria locale!', 'info', 3500);
}

function resetToDefaultPlan() {
  if (!confirm('Sei sicuro di voler ripristinare il piano di studi predefinito? Tutte le modifiche attuali verranno sovrascritte.')) {
    return;
  }

  if (typeof DEFAULT_STUDY_PLAN_STATE !== 'undefined') {
    userNotesData = JSON.parse(JSON.stringify(DEFAULT_STUDY_PLAN_STATE));
  } else {
    userNotesData = {};
  }

  saveUserData();
  renderTables();
  recalculateStats();
  handleSearch();

  closeModal();
  showToast('Piano di studi predefinito ripristinato e memorizzato nella cache locale!', 'info', 4000);
}

// Cross-tab synchronization via storage event
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY && e.newValue) {
    try {
      const parsed = JSON.parse(e.newValue);
      if (parsed && typeof parsed === 'object') {
        userNotesData = parsed;
        renderTables();
        recalculateStats();
        handleSearch();
        updateCacheStatusUI('Sincronizzato da altra scheda');
      }
    } catch (err) {
      console.warn('Storage sync error:', err);
    }
  }
});

// --- APPLICATION INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
  await loadUserData();
  renderTables();
  recalculateStats();
  setupDragAndDrop();
  setupGlobalDragAndDrop();
});
