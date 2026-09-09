/* ==========================================================================
   01 · ปฏิทินทำงานและการนับวัน
   ครอบคลุม CI-04 (ประเภทวัน 5 แบบ) · BR-06 (วันหยุดคั่นกลางไม่นับ)
             BR-08 (ใบลาคร่อมสิ้นปี) · CI-09 (วันหมดอายุของถัง)
   ========================================================================== */
'use strict';
var T = require('../lib/tiny-test.js');
var F = require('../lib/fixtures.js');
var group = T.group, test = T.test, x = T.expect;

group('01 · ปฏิทินทำงานและการนับวัน', function () {

  test('CI-04', 'ประเภทวันมีครบ 5 แบบ และแต่ละแบบบอกได้ว่าทำงานหรือหยุด', function () {
    var SS = F.boot();
    x.len(SS.DAY_TYPES, 5, 'จำนวนประเภทวันในทะเบียนกลาง');
    var ids = SS.DAY_TYPES.map(function (d) { return d.id; }).sort().join(',');
    x.eq(ids, 'holiday,sat-off,sat-work,sunday,work');
    x.ok(SS.dayType('sat-work').working, 'เสาร์ทำงานต้องเป็นวันทำงาน');
    x.no(SS.dayType('sat-off').working, 'เสาร์หยุดต้องไม่ใช่วันทำงาน');
  });

  test('CI-04', 'วันที่ไม่ได้ตั้งค่าไว้ ตกลงเป็นค่าตั้งต้นตามวันในสัปดาห์ ไม่ใช่วันว่าง', function () {
    var SS = F.boot();
    delete SS.store.get().calendar['2026-09-07'];
    delete SS.store.get().calendar['2026-09-06'];
    x.eq(SS.core.calendar('2026-09-07').type, 'work', 'วันจันทร์');
    x.eq(SS.core.calendar('2026-09-06').type, 'sunday', 'วันอาทิตย์');
  });

  test('CI-04', 'เสาร์ทำงานมาจากการติ๊กรายปี ไม่ใช่สูตรเสาร์เว้นเสาร์', function () {
    var SS = F.boot();
    var sats = [];
    Object.keys(SS.store.get().calendar).forEach(function (d) {
      if (SS.d.dow(d) === 6) sats.push({ d: d, t: SS.store.get().calendar[d].type });
    });
    x.ok(sats.length >= 50, 'ปฏิทินต้องมีเสาร์ครบทั้งปี');
    var work = sats.filter(function (s) { return s.t === 'sat-work'; });
    x.ok(work.length > 0, 'ต้องมีเสาร์ทำงานอย่างน้อยหนึ่งวัน');
    /* ถ้าเป็นสูตรเสาร์เว้นเสาร์ ระยะห่างจะเท่ากับ 14 วันทุกคู่ — ต้องไม่เป็นแบบนั้น */
    var gaps = {};
    for (var i = 1; i < work.length; i++) gaps[SS.d.diff(work[i - 1].d, work[i].d)] = 1;
    x.ok(Object.keys(gaps).length > 1 || !gaps['14'],
         'ระยะห่างของเสาร์ทำงานต้องไม่ใช่ 14 วันเท่ากันหมด (ห้ามใช้สูตรเสาร์เว้นเสาร์)');
  });

  test('CI-04', 'แก้ประเภทวันกลางปี มีผลกับการนับทันที ไม่ต้องรีเซ็ตอะไร', function () {
    var SS = F.boot();
    var d = '2026-09-08';
    x.ok(SS.core.isWorkingDay(d), 'ก่อนแก้เป็นวันทำงาน');
    F.setDayType(SS, d, 'holiday');
    x.no(SS.core.isWorkingDay(d), 'หลังแก้เป็นวันหยุดบริษัท');
    x.eq(SS.core.countDays('2026-09-07', '2026-09-09', 'work'), 2, 'สามวันเหลือสองวันทำงาน');
  });

  test('BR-06', 'นับวันลาแบบวันทำงาน ข้ามเสาร์หยุดและอาทิตย์ที่คั่นกลาง', function () {
    var SS = F.boot();
    /* ศุกร์ 11 – จันทร์ 14 ก.ย. คร่อมเสาร์ 12 (เสาร์ทำงาน) และอาทิตย์ 13 */
    x.eq(SS.core.calendar('2026-09-12').type, 'sat-work', 'ฉากตั้งต้น: 12 ก.ย. เป็นเสาร์ทำงาน');
    x.eq(SS.core.countDays('2026-09-11', '2026-09-14', 'work'), 3, 'ศุกร์ + เสาร์ทำงาน + จันทร์');
    F.setDayType(SS, '2026-09-12', 'sat-off');
    x.eq(SS.core.countDays('2026-09-11', '2026-09-14', 'work'), 2, 'ถ้าเสาร์นั้นหยุด เหลือ 2 วัน');
  });

  test('BR-06 LV-01', 'ลาคลอดนับเป็นวันปฏิทิน รวมเสาร์อาทิตย์ที่คั่นอยู่', function () {
    var SS = F.boot();
    x.eq(SS.core.countDays('2026-09-11', '2026-09-14', 'cal'), 4, 'วันปฏิทินนับทุกวัน');
    var lv = { empId: F.EMP.staff, type: 'LT-MATERNITY', from: '2026-09-11', to: '2026-09-14' };
    x.eq(SS.core.leaveDays(lv), 4, 'ลาคลอดใช้หน่วยวันปฏิทิน');
    var lv2 = { empId: F.EMP.staff, type: 'LT-ANNUAL', from: '2026-09-11', to: '2026-09-14' };
    x.eq(SS.core.leaveDays(lv2), 3, 'ลาพักผ่อนใช้หน่วยวันทำงาน');
  });

  test('LV-06', 'ลาครึ่งวันนับ 0.5 วันไม่ว่าประเภทไหน', function () {
    var SS = F.boot();
    x.eq(SS.core.leaveDays({ type: 'LT-ANNUAL', from: '2026-09-08', to: '2026-09-08', halfDay: 'am' }), 0.5);
    x.eq(SS.core.leaveDays({ type: 'LT-SICK', from: '2026-09-08', to: '2026-09-08', halfDay: 'pm' }), 0.5);
  });

  test('BR-08', 'ใบลาคร่อมสิ้นปี แยกจำนวนวันตามปีของแต่ละวัน', function () {
    var SS = F.boot();
    var by = SS.core.daysByYear({ type: 'LT-ANNUAL', from: '2026-12-30', to: '2027-01-04' });
    x.ok(by[2026] > 0 && by[2027] > 0, 'ต้องแยกออกเป็นสองปี ไม่ใช่ยอดเดียว');
    var total = by[2026] + by[2027];
    x.eq(total, SS.core.countDays('2026-12-30', '2027-01-04', 'work'), 'ผลรวมสองปีต้องเท่ากับจำนวนวันทั้งใบ');
  });

  test('CI-09', 'ทุกถังหมดอายุ 31 ธ.ค. ของปีถัดจากปีที่ได้มา', function () {
    var SS = F.boot();
    x.eq(SS.core.expiryOf(2026), '2027-12-31');
    x.eq(SS.core.expiryOf(2025), '2026-12-31');
  });

  test('CI-09', 'เปลี่ยนกติกาวันหมดอายุที่หน้าตั้งค่า แล้วยอดคำนวณใหม่โดยไม่ต้องแก้โปรแกรม', function () {
    var SS = F.boot();
    F.setParams(SS, { expiryRule: 'dec31-same' });
    x.eq(SS.core.expiryOf(2025), '2025-12-31', 'กติกาใหม่ไม่ยกข้ามปี');
    var bs = SS.core.buckets(F.EMP.staff).filter(function (b) { return b.year === 2025; });
    x.ok(bs.length > 0, 'ต้องมีถังของปี 2568');
    x.ok(bs.every(function (b) { return b.expired; }), 'ถังปีก่อนต้องกลายเป็นหมดอายุทันที');
  });

  test('CAL-01', 'ปฏิทินตั้งต้นมีข้อมูลครบทั้งปี ไม่มีวันว่าง', function () {
    var SS = F.boot();
    var cal = SS.store.get().calendar;
    var n = 0, d = '2026-01-01';
    while (d <= '2026-12-31') { if (!cal[d]) n++; d = SS.d.add(d, 1); }
    x.eq(n, 0, 'จำนวนวันที่ยังไม่ได้ตั้งประเภท');
  });
});
