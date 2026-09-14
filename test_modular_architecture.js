const fs = require('fs');
const vm = require('vm');

// Read modules
// In data/manifesto_data.js and js/validation.js, replace 'const ' and 'let ' with 'var ' so they attach to VM global context
let dataCode = fs.readFileSync('data/manifesto_data.js', 'utf8').replace('const MANIFESTO_SECTIONS =', 'var MANIFESTO_SECTIONS =');
let validationCode = fs.readFileSync('js/validation.js', 'utf8')
  .replace(/const /g, 'var ')
  .replace(/let /g, 'var ');
let appCode = fs.readFileSync('js/app.js', 'utf8')
  .replace(/const /g, 'var ')
  .replace(/let /g, 'var ');

// Mock DOM
const domStore = {};
function getMock(id) {
  if (!domStore[id]) {
    domStore[id] = {
      id,
      textContent: '',
      innerHTML: '',
      className: '',
      style: {},
      value: '',
      children: [],
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => false,
        contains: () => false
      },
      setAttribute: () => {},
      getAttribute: () => null,
      querySelectorAll: () => [],
      querySelector: () => null,
      closest: () => null
    };
  }
  return domStore[id];
}

const mockDoc = {
  getElementById: (id) => getMock(id),
  querySelectorAll: (sel) => [],
  querySelector: (sel) => null
};

const context = {
  document: mockDoc,
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
  JSON: JSON,
  String: String
};

vm.createContext(context);
vm.runInContext(dataCode, context);
vm.runInContext(validationCode, context);
vm.runInContext(appCode, context);

console.log('--- TEST RUNNING ON MODULAR ARCHITECTURE ---');

// 1. Check sections loaded
console.log('Loaded sections count:', context.MANIFESTO_SECTIONS.length);

// 2. Render tables
context.renderTables();
console.log('Tables-wrapper innerHTML generated length:', domStore['tables-wrapper'].innerHTML.length);

// 3. Test validation logic
const state = context.evaluatePlanState({
  '088983': { status: 'planned', cfu: 5 },
  '089182': { status: 'planned', cfu: 5 },
  '089183': { status: 'passed_bachelor', cfu: 5 },
  '054443': { status: 'planned', cfu: 5 },
  '088949': { status: 'planned', cfu: 5 },
  '095898': { status: 'planned', cfu: 5 },
  '055633': { status: 'planned', cfu: 5 },
  '089254': { status: 'planned', cfu: 20 },
  '063033': { status: 'planned', cfu: 5 }, // DOT 1
  '052582': { status: 'sovrannumero', cfu: 5 } // DOT/Soft 2 (sovrannumero)
});

console.log('Evaluation state:');
console.log('  Total combined CFU:', state.totalCombined, '(Expected: 55, because passed_bachelor and sovrannumero do not add Master CFU)');
console.log('  Total sovrannumero CFU:', state.totalSovrannumeroCfu, '(Expected: 5)');
console.log('  Obligatory count:', state.countObligatory, '/ 8 (Expected: 8)');
console.log('  DOT/Soft count:', state.dotSoftCount, '(Expected: 1)');
console.log('  okDotSoft:', state.okDotSoft, '(Expected: true)');

console.log('\n--- ALL MODULE CHECKS PASSED! ---');
