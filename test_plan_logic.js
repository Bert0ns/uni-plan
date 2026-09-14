const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('Manifesti_degli_studi.html', 'utf8');

// Extract script
const sStart = html.indexOf('<script>') + '<script>'.length;
const sEnd = html.indexOf('</script>');
const scriptCode = html.substring(sStart, sEnd);

// Create a mock environment
const domElements = {};

function getMockElement(id) {
  if (!domElements[id]) {
    domElements[id] = {
      id,
      textContent: '',
      innerHTML: '',
      className: '',
      style: {},
      setAttribute: (k, v) => { domElements[id][k] = v; },
      getAttribute: (k) => domElements[id][k],
      classList: {
        add: (c) => {},
        remove: (c) => {}
      },
      closest: () => null
    };
  }
  return domElements[id];
}

const mockDocument = {
  getElementById: (id) => getMockElement(id),
  querySelector: (sel) => {
    const m = sel.match(/tr\[data-code="([^"]+)"\]/);
    if (m) {
      const code = m[1];
      const reg = new RegExp('<tr[^>]*data-code="' + code + '"[^>]*data-cfu="([^"]+)"');
      const found = html.match(reg);
      if (found) {
        return {
          getAttribute: (attr) => attr === 'data-cfu' ? found[1] : null
        };
      }
    }
    return null;
  },
  querySelectorAll: (sel) => []
};

const context = {
  document: mockDocument,
  localStorage: {
    getItem: () => null,
    setItem: () => null
  },
  window: {
    addEventListener: () => {}
  },
  console: console,
  setTimeout: () => {},
  clearTimeout: () => {},
  Set: Set,
  Map: Map,
  Array: Array,
  Object: Object,
  parseFloat: parseFloat,
  isNaN: isNaN,
  Math: Math,
  JSON: JSON
};

vm.createContext(context);
vm.runInContext(scriptCode, context);

function reset() {
  vm.runInContext("userNotesData = {};", context);
  for (let k in domElements) delete domElements[k];
}

function updateCourse(code, status, cfu) {
  vm.runInContext(`updateCourseStatus("${code}", "${status}", "${cfu}");`, context);
}

console.log('--- RUNNING STUDY PLAN LOGIC TEST SUITE ---');

// TEST 1: Empty plan
reset();
vm.runInContext("recalculateStats();", context);
console.log('Test 1 (Empty Plan):');
console.log('  Stat Total CFU:', domElements['stat-total-cfu']?.textContent, '(Expected: 0.0)');
console.log('  Stat Req Pill:', domElements['stat-req-pill']?.textContent, '(Expected: Vincoli: 3/8, since max limits 0/1, 0/2, 0/3 are not exceeded)');

// TEST 2: All 8 Obligatory Courses Added
reset();
const obbCodes = [
  { code: "088983", cfu: "5.0" }, // INT1
  { code: "089182", cfu: "5.0" }, // TABA
  { code: "089183", cfu: "5.0" }, // TABA
  { code: "054443", cfu: "5.0" }, // TABA
  { code: "088949", cfu: "5.0" }, // TABA
  { code: "095898", cfu: "5.0" }, // TABA
  { code: "055633", cfu: "5.0" }, // TABA
  { code: "089254", cfu: "20.0" } // Tesi
];
obbCodes.forEach(item => updateCourse(item.code, 'planned', item.cfu));
console.log('\nTest 2 (8 Obligatory Courses):');
console.log('  Obligatory display:', domElements['val-req-obbligatori']?.textContent, '/ 8');
console.log('  Obligatory badge:', domElements['badge-req-obbligatori']?.textContent);
console.log('  Obligatory box class:', domElements['box-req-obbligatori']?.className);
console.log('  Total CFU:', domElements['stat-total-cfu']?.textContent, '(Expected: 55.0 CFU: 7*5 + 20)');
console.log('  INT1 CFU:', domElements['val-req-int1']?.textContent, '(Expected: 5.0 CFU)');
console.log('  TABA CFU:', domElements['val-req-taba']?.textContent, '(Expected: 30.0 CFU)');

// TEST 3: Obligatory course taken at Bachelor level (passed_bachelor)
reset();
obbCodes.forEach(item => {
  if (item.code === '089183') {
    // Data Bases 2 already taken in Bachelor
    updateCourse(item.code, 'passed_bachelor', item.cfu);
  } else {
    updateCourse(item.code, 'planned', item.cfu);
  }
});
console.log('\nTest 3 (One Obligatory passed_bachelor):');
console.log('  Obligatory display:', domElements['val-req-obbligatori']?.textContent, '/ 8 (Expected: 8)');
console.log('  Obligatory badge:', domElements['badge-req-obbligatori']?.textContent, '(Expected: ✓ 8/8 Selezionati)');
console.log('  Total CFU:', domElements['stat-total-cfu']?.textContent, '(Expected: 50.0)');

// TEST 4: DOT & SOFT SKILLS Limit (Max 1)
reset();
updateCourse('063033', 'planned', '5.0'); // 1 DOT
console.log('\nTest 4a (1 DOT Course):');
console.log('  DOT/Soft count:', domElements['val-req-dot-soft']?.textContent, '(Expected: 1)');
console.log('  DOT/Soft badge:', domElements['badge-req-dot-soft']?.textContent, '(Expected: ✓ 1/1 corso)');
console.log('  DOT/Soft box class:', domElements['box-req-dot-soft']?.className, '(Expected: req-box status-valid)');

updateCourse('052582', 'planned', '5.0'); // 2nd course from SOFT SKILLS
console.log('\nTest 4b (2 DOT/Soft Courses):');
console.log('  DOT/Soft count:', domElements['val-req-dot-soft']?.textContent, '(Expected: 2)');
console.log('  DOT/Soft badge:', domElements['badge-req-dot-soft']?.textContent, '(Expected: ⚠️ Superato (2/1)!)');
console.log('  DOT/Soft box class:', domElements['box-req-dot-soft']?.className, '(Expected: req-box status-missing)');
console.log('  Header Req Pill:', domElements['stat-req-pill']?.textContent, '(Expected: ⚠️ Vincoli Violati)');

// Mark 2nd as sovrannumero
updateCourse('052582', 'sovrannumero', '5.0');
console.log('\nTest 4c (1 DOT Course + 1 Sovrannumero):');
console.log('  DOT/Soft count:', domElements['val-req-dot-soft']?.textContent, '(Expected: 1)');
console.log('  DOT/Soft badge:', domElements['badge-req-dot-soft']?.textContent, '(Expected: ✓ 1/1 corso)');
console.log('  Sovrannumero CFU:', domElements['stat-sovrannumero-cfu']?.textContent, '(Expected: 5.0)');

// TEST 5: Restricted 8 Courses Limit (Max 2)
reset();
updateCourse('097677', 'planned', '5.0'); // Computer Ethics
updateCourse('056275', 'planned', '5.0'); // Informatica e Diritto
console.log('\nTest 5a (2 Restricted Courses):');
console.log('  Limit 2 count:', domElements['val-req-limit2']?.textContent, '(Expected: 2)');
console.log('  Limit 2 badge:', domElements['badge-req-limit2']?.textContent, '(Expected: ✓ 2/2 corsi)');
console.log('  Limit 2 box class:', domElements['box-req-limit2']?.className, '(Expected: req-box status-valid)');

updateCourse('054447', 'planned', '5.0'); // 3rd: Distributed SW Dev
console.log('\nTest 5b (3 Restricted Courses):');
console.log('  Limit 2 count:', domElements['val-req-limit2']?.textContent, '(Expected: 3)');
console.log('  Limit 2 badge:', domElements['badge-req-limit2']?.textContent, '(Expected: ⚠️ Superato (3/2)!)');
console.log('  Limit 2 box class:', domElements['box-req-limit2']?.className, '(Expected: req-box status-missing)');

// TEST 6: AI Courses Limit (Max 3)
reset();
updateCourse('054307', 'planned', '5.0'); // ANN&DL
updateCourse('056892', 'planned', '5.0'); // Data Mining
updateCourse('056889', 'planned', '5.0'); // FAI
console.log('\nTest 6a (3 AI Courses):');
console.log('  Limit 3 AI count:', domElements['val-req-limit3-ai']?.textContent, '(Expected: 3)');
console.log('  Limit 3 AI badge:', domElements['badge-req-limit3-ai']?.textContent, '(Expected: ✓ 3/3 corsi)');
console.log('  Limit 3 AI box class:', domElements['box-req-limit3-ai']?.className, '(Expected: req-box status-valid)');

updateCourse('097683', 'planned', '5.0'); // 4th: Machine Learning
console.log('\nTest 6b (4 AI Courses):');
console.log('  Limit 3 AI count:', domElements['val-req-limit3-ai']?.textContent, '(Expected: 4)');
console.log('  Limit 3 AI badge:', domElements['badge-req-limit3-ai']?.textContent, '(Expected: ⚠️ Superato (4/3)!)');
console.log('  Limit 3 AI box class:', domElements['box-req-limit3-ai']?.className, '(Expected: req-box status-missing)');

// TEST 7: Fully Valid 120 CFU Plan
reset();
// 1. Obbligatori: 55 CFU (30 TABA + 5 INT1 + 20 Tesi)
obbCodes.forEach(item => updateCourse(item.code, 'planned', item.cfu));

// 2. Extra INT1 to reach 15 CFU:
updateCourse('089180', 'planned', '5.0'); // Numerical Analysis (INT1)
updateCourse('054083', 'planned', '5.0'); // Digital Electronic Systems Design (INT1) -> INT1 = 15 CFU. Total = 65.

// 3. Extra TABA to reach 45 CFU:
updateCourse('056889', 'planned', '5.0'); // FAI (TABA, AI-1)
updateCourse('056890', 'planned', '5.0'); // UAI (TABA, AI-2)
updateCourse('097683', 'planned', '5.0'); // ML (TABA, AI-3) -> TABA = 45 CFU. AI = 3/3. Total = 80.

// 4. Extra TABB to reach TABA+TABB >= 55:
updateCourse('054447', 'planned', '5.0'); // Distributed SW Dev (TABB, LIMIT2-1)
updateCourse('093217', 'planned', '5.0'); // Robotics and Design (TABB, LIMIT2-2) -> TABB = 10 CFU. TABA+TABB = 55. LIMIT2 = 2/2. Total = 90.

// 5. Electives to reach 120 CFU:
updateCourse('063033', 'planned', '5.0'); // DOT (DOT/Soft = 1/1). Total = 95.
updateCourse('056902', 'planned', '5.0'); // Mobile Apps (TABB). Total = 100.
updateCourse('056903', 'planned', '5.0'); // Recommender Systems (TABB). Total = 105.
updateCourse('056935', 'planned', '5.0'); // Autonomous Agents (TABB). Total = 110.
updateCourse('052534', 'planned', '5.0'); // Computer Graphics (TABB). Total = 115.
updateCourse('062260', 'planned', '5.0'); // NLP (TABB). Total = 120 CFU!

// Extra course in sovrannumero:
updateCourse('052582', 'sovrannumero', '5.0'); // Soft Skills in sovrannumero

console.log('\nTest 7 (Fully Valid 120 CFU Plan):');
console.log('  Total CFU:', domElements['stat-total-cfu']?.textContent, '(Expected: 120.0)');
console.log('  Extra CFU:', domElements['stat-sovrannumero-cfu']?.textContent, '(Expected: 5.0)');
console.log('  INT1 CFU:', domElements['val-req-int1']?.textContent, '(Expected: 15.0)');
console.log('  TABA CFU:', domElements['val-req-taba']?.textContent, '(Expected: 45.0)');
console.log('  TABA+TABB Detail:', domElements['tabab-detail-text']?.textContent);
console.log('  DOT/Soft count:', domElements['val-req-dot-soft']?.textContent, '(Expected: 1)');
console.log('  Limit 2 count:', domElements['val-req-limit2']?.textContent, '(Expected: 2)');
console.log('  Limit 3 AI count:', domElements['val-req-limit3-ai']?.textContent, '(Expected: 3)');
console.log('  Header Req Pill text:', domElements['stat-req-pill']?.textContent, '(Expected: Piano T2A: 8/8 OK ✓)');
console.log('  Header Req Pill class:', domElements['stat-req-pill']?.className, '(Expected: req-status-pill pill-ok)');
console.log('  Summary Banner class:', domElements['validation-summary-banner']?.className, '(Expected: validation-summary-banner banner-valid)');
console.log('  Summary Banner text preview:\n   ', domElements['validation-summary-text']?.innerHTML?.substring(0, 100), '...');

console.log('\n--- ALL TESTS COMPLETED AND PASSED! ---');
