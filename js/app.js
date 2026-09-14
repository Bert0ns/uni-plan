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
          <span class="section-plan-badge" id="plan-badge-${sec.id}" style="display:none;"></span>
        </div>
        <div class="section-toggle-btn">
          <span class="section-toggle-text">Comprimi</span>
          <svg class="section-toggle-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
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

  if (showOnlyPlanned) {
    handleSearch();
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
});
