/* ==========================================================================
   harness.js — ตัวโหลดโค้ดต้นแบบเข้ามารันใน Node เพื่อทดสอบ
   ต้นแบบเป็น ES5 ล้วนที่แขวนทุกอย่างไว้บน window.SS จึงโหลดเข้า vm sandbox
   ที่ปลอม window / document / localStorage ให้ แล้วเรียกใช้ SS.* ได้ตรง ๆ
   ไม่แตะไฟล์ต้นแบบ ไม่ต้องมี dependency ภายนอก
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.resolve(__dirname, '..', '..');
var JS = path.join(ROOT, 'assets', 'js');

/* ไฟล์ที่เป็นตรรกะล้วน ไม่พึ่ง DOM — โหลดตามลำดับเดียวกับ index.html */
var LOGIC_FILES = ['masters.js', 'seed.js', 'core.js', 'store.js'];

function fakeLocalStorage() {
  var bag = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(bag, k) ? bag[k] : null; },
    setItem: function (k, v) { bag[k] = String(v); },
    removeItem: function (k) { delete bag[k]; },
    clear: function () { bag = {}; }
  };
}

/* document ปลอมแบบบางที่สุด เผื่อไฟล์ไหนแตะตอนโหลด */
function fakeDocument() {
  var noop = function () {};
  var el = function () {
    return {
      style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: function () { return false; } },
      appendChild: noop, setAttribute: noop, addEventListener: noop, querySelector: function () { return null; },
      querySelectorAll: function () { return []; }, innerHTML: '', textContent: ''
    };
  };
  return {
    createElement: el, getElementById: function () { return null; },
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    addEventListener: noop, body: el(), documentElement: el()
  };
}

/**
 * สร้างต้นแบบขึ้นมาหนึ่งชุดแบบสด ๆ (localStorage ว่าง = ข้อมูลตัวอย่างชุดใหม่)
 * @param {object} opts  opts.today = 'YYYY-MM-DD' ตรึงวันที่ให้ผลทดสอบคงที่
 * @returns {object} SS
 */
function bootstrap(opts) {
  opts = opts || {};
  var sandbox = {
    console: console,
    localStorage: fakeLocalStorage(),
    document: fakeDocument(),
    navigator: { userAgent: 'node-test', geolocation: null },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    setInterval: function () { return 0; }, clearInterval: function () {},
    Math: Math, Date: Date, JSON: JSON
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  LOGIC_FILES.forEach(function (f) {
    var code = fs.readFileSync(path.join(JS, f), 'utf8');
    vm.runInContext(code, sandbox, { filename: 'assets/js/' + f });
  });

  var SS = sandbox.SS;
  if (opts.today) freezeToday(SS, opts.today);
  SS.store.init();
  SS.__sandbox = sandbox;
  return SS;
}

/**
 * ตรึง "วันนี้" ของต้นแบบ — ทุกที่ในโค้ดเรียก SS.d.today() ทางเดียว
 * จึงเปลี่ยนที่จุดเดียวได้ ไม่ต้องยุ่งกับ Date ของ Node
 */
function freezeToday(SS, iso) {
  SS.d.today = function () { return iso; };
  return SS;
}

/** ตรึงเวลานาฬิกาที่ใช้ตัดสินการมาสาย/หน้าต่างแก้ไขเอง */
function freezeNow(SS, hhmm) {
  SS.d.now = function () { return hhmm; };
  return SS;
}

/** ตั้งพารามิเตอร์นโยบาย (จำลองการแก้จากหน้าตั้งค่า) */
function setParams(SS, patch) {
  var p = SS.store.get().params;
  Object.keys(patch).forEach(function (k) { p[k] = patch[k]; });
  return p;
}

/** ตั้งประเภทวันในปฏิทินของวันใดวันหนึ่ง */
function setDayType(SS, date, type) {
  SS.store.get().calendar[date] = { type: type, name: '' };
  return type;
}

module.exports = {
  bootstrap: bootstrap,
  freezeToday: freezeToday,
  freezeNow: freezeNow,
  setParams: setParams,
  setDayType: setDayType,
  ROOT: ROOT
};
