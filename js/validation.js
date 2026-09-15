// Validation Rules and Constants for Track T2A (Politecnico di Milano)

const STORAGE_KEY = 'polimi_manifesto_notes_542_2026';

// Default pre-saved study plan state
const DEFAULT_STUDY_PLAN_STATE = {
  "054443": { "status": "passed_bachelor", "cfu": 5 },
  "088983": { "status": "passed", "cfu": 5 },
  "089182": { "status": "planned", "cfu": 5 },
  "089183": { "status": "passed", "cfu": 5 },
  "088949": { "status": "passed", "cfu": 5 },
  "095898": { "status": "passed", "cfu": 5 },
  "055633": { "status": "passed", "cfu": 5 },
  "089254": { "status": "planned", "cfu": 20 },
  "054445": { "status": "passed", "cfu": 5 },
  "085900": { "status": "planned", "cfu": 5 },
  "054092": { "status": "planned", "cfu": 5 },
  "097677": { "status": "planned", "cfu": 5 },
  "088805": { "status": "planned", "cfu": 5 },
  "088804": { "status": "planned", "cfu": 5 },
  "056899": { "status": "planned", "cfu": 5 },
  "091023": { "status": "planned", "cfu": 5 },
  "052535": { "status": "planned", "cfu": 5 },
  "054307": { "status": "planned", "cfu": 5 },
  "093212": { "status": "passed", "cfu": 5 },
  "090958": { "status": "planned", "cfu": 5 },
  "089013": { "status": "planned", "cfu": 5, "note": "valuta se togliere" },
  "054323": { "status": "interested", "cfu": 5 },
  "095943": { "status": "interested", "cfu": 5, "note": "valuta se togliere" },
  "056889": { "status": "excluded", "cfu": 5 },
  "056890": { "status": "excluded", "cfu": 5 },
  "097683": { "status": "excluded", "cfu": 5 },
  "053879": { "status": "excluded", "cfu": 10 },
  "063501": { "status": "planned", "cfu": 5, "note": "capire la difficoltà" }
};

// Requisite Set Codes
const INT1_CODES = new Set([
  "051587", "054083", "054092", "060001", "085900", "088877", "088983",
  "089180", "089194", "089195", "090037", "090038", "091021", "095901",
  "099322", "099325"
]);

const TABA_CODES = new Set([
  "052535", "052537", "053879", "054443", "055633", "056889", "056890",
  "056899", "063501", "088949", "089182", "089183", "089185", "090950",
  "091023", "095898", "095903", "095943", "097683"
]);

const TABB_CODES = new Set([
  "052534", "054307", "054446", "054447", "055812", "056490", "056892",
  "056895", "056896", "056897", "056901", "056902", "056903", "056935",
  "056986", "058583", "061723", "062113", "062260", "062642", "063496",
  "063499", "063500", "088946", "089013", "090951", "090957", "090958",
  "093212", "093217", "095944", "095945", "095946", "095947", "095948",
  "097685", "099993"
]);

// Mandatory courses for T2A: 7 in 1st year + Prova Finale in 2nd year
const OBLIGATORY_T2A_INFO = [
  { code: "088983", name: "Foundations of Operations Research", cfu: 5 },
  { code: "089182", name: "Formal Languages and Compilers", cfu: 5 },
  { code: "089183", name: "Data Bases 2", cfu: 5 },
  { code: "054443", name: "Software Engineering 2", cfu: 5 },
  { code: "088949", name: "Advanced Computer Architectures", cfu: 5 },
  { code: "095898", name: "Computing Infrastructures", cfu: 5 },
  { code: "055633", name: "Computer Security - UIC 587", cfu: 5 },
  { code: "089254", name: "Prova Finale (INF)", cfu: 20 }
];
const OBLIGATORY_T2A_CODES = new Set(OBLIGATORY_T2A_INFO.map(c => c.code));

// DOT and SOFT SKILLS
const DOT_CODES = new Set([
  "063033", "063937", "063938", "063939", "063940", "063941", "063942", "063943", "063993"
]);
const SOFT_SKILLS_CODES = new Set([
  "052581", "052582", "052583", "052585", "053583", "055806", "056048",
  "056827", "056829", "056839", "059448", "059579", "062088", "062436",
  "063139", "063787", "064834"
]);
const DOT_OR_SOFT_CODES = new Set([...DOT_CODES, ...SOFT_SKILLS_CODES]);

// Restricted Courses (Max 2 effective)
const LIMIT2_INFO = [
  { code: "097677", name: "Computer Ethics" },
  { code: "052581", name: "Ethics for Technology" },
  { code: "054447", name: "Distributed Software Development" },
  { code: "056275", name: "Informatica e Diritto" },
  { code: "054446", name: "Multidisciplinary Project" },
  { code: "056986", name: "Progetto Multidisciplinare" },
  { code: "090951", name: "Philosophical Issues of Computer Science" },
  { code: "093217", name: "Robotics and Design" }
];
const LIMIT2_CODES = new Set(LIMIT2_INFO.map(c => c.code));

// AI Courses (Max 3 effective)
const LIMIT3_AI_INFO = [
  { code: "054307", name: "Artificial Neural Networks and Deep Learning" },
  { code: "056892", name: "Data Mining" },
  { code: "056889", name: "Foundations of Artificial Intelligence" },
  { code: "097683", name: "Machine Learning" },
  { code: "056890", name: "Uncertainty in Artificial Intelligence" }
];
const LIMIT3_AI_CODES = new Set(LIMIT3_AI_INFO.map(c => c.code));

function evaluatePlanState(userNotesData) {
  let totalPlannedCfu = 0;
  let totalPassedCfu = 0;
  let totalSovrannumeroCfu = 0;
  let int1Cfu = 0;
  let tabaCfu = 0;
  let tabbCfu = 0;

  const countedCodes = new Set();
  const effectiveDotSoft = [];
  const effectiveLimit2 = [];
  const effectiveLimit3Ai = [];
  const fulfilledObligatory = new Map();

  if (!userNotesData || typeof userNotesData !== 'object') {
    userNotesData = {};
  }

  for (const [code, val] of Object.entries(userNotesData)) {
    if (!val || typeof val !== 'object') continue;
    const status = val.status;
    const isPlanned = status === 'planned';
    const isPassed = status === 'passed';
    const isSovrannumero = status === 'sovrannumero';
    const isPassedBachelor = status === 'passed_bachelor';

    let cfu = parseFloat(val.cfu);
    if (isNaN(cfu) || cfu <= 0) {
      // Look up course in MANIFESTO_SECTIONS
      if (typeof MANIFESTO_SECTIONS !== 'undefined') {
        for (const sec of MANIFESTO_SECTIONS) {
          const found = sec.rows.find(r => r.code === code);
          if (found && !isNaN(parseFloat(found.cfu))) {
            cfu = parseFloat(found.cfu);
            break;
          }
        }
      }
    }

    if (OBLIGATORY_T2A_CODES.has(code)) {
      if (isPlanned || isPassed || isPassedBachelor) {
        fulfilledObligatory.set(code, status);
      }
    }

    if (isSovrannumero) {
      if (!countedCodes.has(code) && !isNaN(cfu)) {
        totalSovrannumeroCfu += cfu;
        countedCodes.add(code);
      }
    } else if (isPlanned || isPassed) {
      if (!countedCodes.has(code) && !isNaN(cfu)) {
        if (isPlanned) totalPlannedCfu += cfu;
        if (isPassed) totalPassedCfu += cfu;

        if (INT1_CODES.has(code)) int1Cfu += cfu;
        if (TABA_CODES.has(code)) tabaCfu += cfu;
        if (TABB_CODES.has(code)) tabbCfu += cfu;

        if (DOT_OR_SOFT_CODES.has(code)) effectiveDotSoft.push(code);
        if (LIMIT2_CODES.has(code)) effectiveLimit2.push(code);
        if (LIMIT3_AI_CODES.has(code)) effectiveLimit3Ai.push(code);

        countedCodes.add(code);
      }
    }
  }

  const totalCombined = totalPlannedCfu + totalPassedCfu;
  const tababCombined = tabaCfu + tabbCfu;

  const missingObligatory = [];
  OBLIGATORY_T2A_INFO.forEach(item => {
    if (!fulfilledObligatory.has(item.code)) {
      missingObligatory.push(item);
    }
  });
  const okObbligatori = missingObligatory.length === 0;
  const countObligatory = OBLIGATORY_T2A_INFO.length - missingObligatory.length;

  const okInt1 = int1Cfu >= 15;
  const okTaba = tabaCfu >= 45;
  const okTabab = tababCombined >= 55;
  const dotSoftCount = effectiveDotSoft.length;
  const okDotSoft = dotSoftCount <= 1;
  const limit2Count = effectiveLimit2.length;
  const okLimit2 = limit2Count <= 2;
  const limit3AiCount = effectiveLimit3Ai.length;
  const okLimit3Ai = limit3AiCount <= 3;
  const okTotal = totalCombined >= 120;

  const rulesList = [okObbligatori, okInt1, okTaba, okTabab, okDotSoft, okLimit2, okLimit3Ai, okTotal];
  const validRulesCount = rulesList.filter(Boolean).length;
  const hasDirectViolation = !okDotSoft || !okLimit2 || !okLimit3Ai;

  return {
    totalPlannedCfu,
    totalPassedCfu,
    totalCombined,
    totalSovrannumeroCfu,
    int1Cfu,
    tabaCfu,
    tabbCfu,
    tababCombined,
    countObligatory,
    missingObligatory,
    okObbligatori,
    okInt1,
    okTaba,
    okTabab,
    dotSoftCount,
    okDotSoft,
    limit2Count,
    okLimit2,
    limit3AiCount,
    okLimit3Ai,
    okTotal,
    validRulesCount,
    hasDirectViolation
  };
}
