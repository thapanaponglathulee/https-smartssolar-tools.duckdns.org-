/* ==========================================================================
   tiny-test.js — ตัวรันเทสต์ขนาดจิ๋ว ไม่มี dependency
   ต้นแบบไม่มี test runner มาก่อน และไม่ควรลาก framework เข้ามาเพราะทั้งโปรเจกต์
   ไม่มี package.json — ไฟล์นี้จึงทำเท่าที่ต้องใช้: ลงทะเบียนเทสต์ · เทียบค่า · สรุปผล
   เทสต์ทุกข้อผูกกับ "รหัสเกณฑ์ตรวจรับ" (CI-xx · LV-xx · BR-xx · APV-xx · ALW-xx)
   เพื่อให้ตอบได้ว่าข้อกำหนดข้อไหนมีเทสต์คุมอยู่แล้วบ้าง
   ========================================================================== */
'use strict';

var E = String.fromCharCode(27);   /* ESC — เขียนแบบนี้เพื่อไม่ให้ไฟล์มีอักขระควบคุมจริง */
var C = {
  bold:  E + '[1m',
  green: E + '[32m',
  red:   E + '[31m',
  dim:   E + '[90m',
  off:   E + '[0m'
};
if (process.env.NO_COLOR) { Object.keys(C).forEach(function (k) { C[k] = ''; }); }

var registry = [];
var currentGroup = '(ไม่ระบุหมวด)';

function group(name, fn) {
  var prev = currentGroup;
  currentGroup = name;
  fn();
  currentGroup = prev;
}

/**
 * @param {string} specId รหัสเกณฑ์ตรวจรับ เช่น 'CI-18' — ใส่หลายรหัสคั่นด้วยช่องว่างได้
 * @param {string} title  สิ่งที่คาดหวัง เขียนเป็นภาษาไทยให้คนอ่านรู้เรื่อง
 */
function test(specId, title, fn) {
  registry.push({ id: specId, title: title, fn: fn, group: currentGroup });
}

/**
 * ข้อค้นพบที่ "ยังไม่ได้แก้ และยังไม่ควรแก้เองเพราะเป็นเรื่องที่ต้องให้คนตัดสิน"
 * เทสต์แบบนี้คาดว่าจะไม่ผ่าน — ถ้าวันไหนผ่านขึ้นมา แปลว่ามีคนแก้แล้ว
 * ตัวรันจะเตือนให้ย้ายกลับไปเป็น test() ปกติ จะได้ไม่มีข้อค้นพบตกค้างในรายการ
 * @param {string} note เหตุผลว่าทำไมยังไม่แก้ · ต้องมีเสมอ
 */
function known(specId, title, note, fn) {
  registry.push({ id: specId, title: title, fn: fn, group: currentGroup, known: true, note: note });
}

/* ---------- ตัวเทียบค่า ---------- */
function fail(msg) { var e = new Error(msg); e.assertion = true; throw e; }
function show(v) { return typeof v === 'object' ? JSON.stringify(v) : String(v); }

var expect = {
  eq: function (actual, want, why) {
    if (actual !== want) fail((why ? why + ' — ' : '') + 'ได้ ' + show(actual) + ' แต่ต้องการ ' + show(want));
  },
  deepEq: function (actual, want, why) {
    var a = JSON.stringify(actual), b = JSON.stringify(want);
    if (a !== b) fail((why ? why + ' — ' : '') + 'ได้ ' + a + ' แต่ต้องการ ' + b);
  },
  near: function (actual, want, tol, why) {
    if (Math.abs(actual - want) > (tol === undefined ? 1e-9 : tol))
      fail((why ? why + ' — ' : '') + 'ได้ ' + show(actual) + ' แต่ต้องการประมาณ ' + show(want));
  },
  ok: function (v, why) { if (!v) fail((why || 'คาดว่าเป็นจริง') + ' — ได้ ' + show(v)); },
  no: function (v, why) { if (v) fail((why || 'คาดว่าเป็นเท็จ') + ' — ได้ ' + show(v)); },
  has: function (hay, needle, why) {
    var s = typeof hay === 'string' ? hay : JSON.stringify(hay);
    if (s.indexOf(needle) < 0) fail((why ? why + ' — ' : '') + 'ไม่พบ "' + needle + '" ใน ' + s.slice(0, 300));
  },
  hasNot: function (hay, needle, why) {
    var s = typeof hay === 'string' ? hay : JSON.stringify(hay);
    if (s.indexOf(needle) >= 0) fail((why ? why + ' — ' : '') + 'พบ "' + needle + '" ทั้งที่ไม่ควรมี ใน ' + s.slice(0, 300));
  },
  len: function (arr, n, why) {
    if (!arr || arr.length !== n) fail((why ? why + ' — ' : '') + 'ได้ ' + (arr ? arr.length : 'null') + ' รายการ แต่ต้องการ ' + n);
  }
};

/* ---------- รัน ---------- */
function run(filter) {
  var pass = 0, knownCount = 0, failed = [], byGroup = {}, order = [];
  registry.forEach(function (t) {
    if (filter && (t.id + ' ' + t.title + ' ' + t.group).toLowerCase().indexOf(filter.toLowerCase()) < 0) return;
    if (!byGroup[t.group]) { byGroup[t.group] = []; order.push(t.group); }
    var res = { t: t, ok: true, err: null };
    if (t.known) {
      /* คาดว่าจะไม่ผ่าน — ผ่านเมื่อไรคือถูกแก้แล้ว ให้เตือนกลับ */
      try { t.fn(); res.ok = false; res.fixed = true; failed.push(res); }
      catch (e) { res.ok = true; res.err = e; knownCount++; }
      byGroup[t.group].push(res);
      return;
    }
    try { t.fn(); pass++; }
    catch (e) { res.ok = false; res.err = e; failed.push(res); }
    byGroup[t.group].push(res);
  });

  order.forEach(function (g) {
    console.log('\n' + C.bold + g + C.off);
    byGroup[g].forEach(function (r) {
      var mark = r.ok ? C.green + ' PASS' + C.off : C.red + ' FAIL' + C.off;
      if (r.t.known && r.ok) mark = C.dim + ' พบ ' + C.off;
      if (r.t.known && r.fixed) mark = C.red + ' แก้แล้ว' + C.off;
      console.log(mark + '  [' + r.t.id + '] ' + r.t.title);
      if (r.t.known && r.ok) {
        console.log('       ' + C.dim + 'อาการ: ' + (r.err.assertion ? r.err.message : r.err.message) + C.off);
        console.log('       ' + C.dim + 'ทำไมยังไม่แก้: ' + r.t.note + C.off);
      } else if (r.t.known && r.fixed) {
        console.log('       ' + C.red + 'ข้อนี้ผ่านแล้ว — ย้ายกลับไปเป็นเทสต์ปกติ (known → test)' + C.off);
      } else if (!r.ok) {
        console.log('       ' + C.red + (r.err.assertion ? r.err.message : r.err.stack) + C.off);
      }
    });
  });

  var total = pass + failed.length + knownCount;
  var line = new Array(73).join('-');
  console.log('\n' + line);
  console.log('รวม ' + total + ' เทสต์ · ' + C.green + 'ผ่าน ' + pass + C.off + ' · ' +
              (failed.length ? C.red + 'ไม่ผ่าน ' + failed.length + C.off : 'ไม่ผ่าน 0') +
              ' · ข้อค้นพบที่ยังไม่แก้ ' + knownCount);

  var ids = {};
  registry.forEach(function (t) { t.id.split(/\s+/).forEach(function (i) { if (i) ids[i] = (ids[i] || 0) + 1; }); });
  var list = Object.keys(ids).sort();
  console.log('ครอบคลุมเกณฑ์ตรวจรับ ' + list.length + ' ข้อ: ' + list.join(' '));
  console.log(line);
  return failed.length;
}

module.exports = { group: group, test: test, known: known, expect: expect, run: run, registry: registry, C: C };
