/* ==========================================================================
   fixtures.js — ตัวช่วยตั้งฉากให้เทสต์
   ทุกเทสต์เริ่มจากต้นแบบชุดใหม่เสมอ (localStorage ว่าง) จะได้ไม่ส่งผลข้ามกัน
   วันที่และเวลาถูกตรึงไว้ เพราะกติกาหลายข้อขึ้นกับ "วันนี้" และ "ตอนนี้"
   ========================================================================== */
'use strict';
var harness = require('./harness.js');

/* วันจันทร์ 7 ก.ย. 2569 — เลือกวันทำงานกลางสัปดาห์เป็นฐาน จะได้ไม่ชนวันหยุด */
var TODAY = '2026-09-07';
var NOW = '08:00';

function boot(opts) {
  opts = opts || {};
  var SS = harness.bootstrap({ today: opts.today || TODAY });
  harness.freezeNow(SS, opts.now || NOW);
  return SS;
}

/* พนักงานสมมติที่ใช้บ่อย — ชื่อจริงอยู่ใน seed.js ห้ามใช้ชื่อพนักงานจริงของบริษัท */
var EMP = {
  exec:       'EMP-001',   /* ธเนศ · ผู้บริหาร */
  admin:      'EMP-002',   /* ณัฐพล · แอดมินระบบ */
  hr:         'EMP-100',   /* ปวีณา · ฝ่ายบุคคล */
  hr2:        'EMP-103',   /* อรวรรณ · ฝ่ายบุคคล คนที่สอง */
  mgrA:       'EMP-101',   /* กิตติพงษ์ · หัวหน้างาน */
  mgrB:       'EMP-102',   /* สุรเดช · หัวหน้างาน */
  staff:      'EMP-201',   /* ธนากร · พนักงาน ทีม A (ชดเชยปีก่อน 2 · สะสมปีก่อน 2 · พักร้อน 8) */
  staff2:     'EMP-203',   /* วีระพล · พนักงาน ทีม A */
  probation:  'EMP-204',   /* อนุชา · ยังไม่ผ่านการประเมิน */
  night:      'EMP-206',   /* พิมพ์ชนก · กะกลางคืน */
  special:    'EMP-207',   /* กมลชนก · มีโควตาพิเศษ */
  test:       'EMP-900'    /* บัญชีทดสอบ — ต้องไม่ถูกนับในตัวหาร */
};

/* หาวันทำงานถัดไปนับจากวันที่กำหนด ตามปฏิทินของต้นแบบ */
function nextWorkingDay(SS, from, skip) {
  var d = from, n = 0, guard = 0;
  while (guard++ < 60) {
    d = SS.d.add(d, 1);
    if (SS.core.calendar(d).working) { n++; if (n > (skip || 0)) return d; }
  }
  throw new Error('หาวันทำงานถัดไปไม่เจอ');
}

/* หาวันหยุดถัดไป (เสาร์หยุด · อาทิตย์ · วันหยุดบริษัท) */
function nextHoliday(SS, from) {
  var d = from, guard = 0;
  while (guard++ < 60) {
    d = SS.d.add(d, 1);
    if (!SS.core.calendar(d).working) return d;
  }
  throw new Error('หาวันหยุดถัดไปไม่เจอ');
}

/* หาวันทำงานก่อนหน้า นับถอยหลังจากวันที่กำหนด */
function prevWorkingDay(SS, from, skip) {
  var d = from, n = 0, guard = 0;
  while (guard++ < 60) {
    d = SS.d.add(d, -1);
    if (SS.core.calendar(d).working) { n++; if (n > (skip || 0)) return d; }
  }
  throw new Error('หาวันทำงานก่อนหน้าไม่เจอ');
}

/* ลบเช็คอินของคนใดคนหนึ่ง (ทั้งหมด หรือเฉพาะวันที่ระบุ)
   ข้อมูลตัวอย่างเช็คอินให้อัตโนมัติย้อนหลังหลายสิบวัน บางเทสต์จึงต้องเคลียร์ฉากก่อน */
function clearCheckins(SS, empId, date) {
  var db = SS.store.get();
  db.checkins = db.checkins.filter(function (c) {
    if (empId && c.empId !== empId) return true;
    if (date && c.date !== date) return true;
    return false;
  });
}

/* ลบใบลาของคนใดคนหนึ่งออกจากฉาก เพื่อทดสอบเส้นทางใหม่โดยไม่ชนใบลาในข้อมูลตัวอย่าง */
function clearLeaves(SS, empId) {
  var db = SS.store.get();
  db.leaves = db.leaves.filter(function (l) { return l.empId !== empId; });
}

module.exports = {
  boot: boot,
  clearCheckins: clearCheckins,
  clearLeaves: clearLeaves,
  TODAY: TODAY,
  NOW: NOW,
  EMP: EMP,
  nextWorkingDay: nextWorkingDay,
  prevWorkingDay: prevWorkingDay,
  nextHoliday: nextHoliday,
  setParams: harness.setParams,
  setDayType: harness.setDayType,
  freezeNow: harness.freezeNow,
  freezeToday: harness.freezeToday
};
