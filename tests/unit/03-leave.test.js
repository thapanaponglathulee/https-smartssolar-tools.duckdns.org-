/* ==========================================================================
   03 · การลา · โควตา · ถังวันลา
   ครอบคลุม LV-01 LV-03 LV-04 LV-06 LV-07 LV-09 LV-12
             BR-01 BR-02 BR-03 BR-05 BR-07 BR-09 BR-10 BR-12 · APV-04
   ========================================================================== */
'use strict';
var T = require('../lib/tiny-test.js');
var F = require('../lib/fixtures.js');
var group = T.group, test = T.test, x = T.expect;

/* ยื่นใบลาแบบสั้น ๆ — คืนผลของ store.submitLeave ตรง ๆ */
function submit(SS, empId, type, from, to, extra) {
  var data = { empId: empId, type: type, from: from, to: to, reason: 'ทดสอบระบบ' };
  Object.keys(extra || {}).forEach(function (k) { data[k] = extra[k]; });
  return SS.store.submitLeave(data);
}

group('03 · ทะเบียนประเภทการลา (LV-01)', function () {

  test('LV-01', 'มีประเภทการลาครบ 12 รายการตามที่ตกลงไว้', function () {
    var SS = F.boot();
    x.len(SS.LEAVE_TYPES, 12);
    ['LT-MATERNITY', 'LT-PATERNITY', 'LT-NEWBORN', 'LT-STERILIZE', 'LT-MILITARY',
     'LT-TRAINING', 'LT-INJURY', 'LT-UNPAID'].forEach(function (id) {
      x.ok(SS.leaveType(id), 'ต้องมีประเภท ' + id);
    });
  });

  test('LV-01', 'ลาคลอด 120 วันปฏิทิน · จ่าย 60 วัน · ปฏิเสธไม่ได้', function () {
    var SS = F.boot();
    var t = SS.leaveType('LT-MATERNITY');
    x.eq(t.quota, 120);
    x.eq(t.paidDays, 60);
    x.eq(t.unit, 'cal', 'ต้องนับเป็นวันปฏิทิน');
    x.eq(t.refusable, 'no', 'BR-04 · ปฏิเสธไม่ได้');
  });

  test('LV-01', 'ลาดูแลบุตรแรกคลอดที่ป่วย จ่ายอัตรา 50%', function () {
    var SS = F.boot();
    x.eq(SS.leaveType('LT-NEWBORN').payRate, 50);
  });

  test('LV-01', 'แยก "วันที่ลาได้" ออกจาก "วันที่ได้ค่าจ้าง" ทุกประเภท', function () {
    var SS = F.boot();
    var sick = SS.leaveType('LT-SICK');
    x.eq(sick.quota, null, 'ลาป่วยไม่จำกัดวันลา');
    x.eq(sick.paidDays, 30, 'แต่จ่ายแค่ 30 วัน');
  });

  test('BR-04', 'ประเภทที่กฎหมายห้ามปฏิเสธ ถูกทำเครื่องหมายไว้ในทะเบียนกลาง', function () {
    var SS = F.boot();
    ['LT-MATERNITY', 'LT-STERILIZE', 'LT-MILITARY', 'LT-INJURY'].forEach(function (id) {
      x.eq(SS.leaveType(id).refusable, 'no', id + ' ต้องปฏิเสธไม่ได้');
    });
    x.eq(SS.leaveType('LT-SICK').refusable, 'doc', 'ลาป่วยปฏิเสธได้เฉพาะเรื่องเอกสาร');
  });
});

group('03 · ถังวันลาและลำดับการตัด (BR-01)', function () {

  test('BR-01', 'ลำดับถังตายตัว: ชดเชยปีก่อน → สะสมปีก่อน → ชดเชยปีนี้ → พักร้อนปีนี้', function () {
    var SS = F.boot();
    var b = SS.store.get().balances[F.EMP.staff];
    b.comp = { 2025: 2, 2026: 1 };
    b.annualCarry = { 2025: 2 };
    b.annual = 8;
    var keys = SS.core.buckets(F.EMP.staff).map(function (k) { return k.key; });
    x.deepEq(keys, ['comp-2025', 'carry-2025', 'comp-2026', 'annual-2026']);
  });

  test('BR-01', 'ยื่นลาพักผ่อน 3 วัน ตัดชดเชยปีก่อน 2 + สะสมปีก่อน 1 · ยอดพักร้อนปีนี้ไม่ถูกแตะ', function () {
    var SS = F.boot();
    var plan = SS.core.allocate(F.EMP.staff, 3).plan;
    x.len(plan, 2);
    x.eq(plan[0].key, 'comp-2025');
    x.eq(plan[0].days, 2);
    x.eq(plan[1].key, 'carry-2025');
    x.eq(plan[1].days, 1);
    x.eq(plan.filter(function (p) { return p.key === 'annual-2026'; }).length, 0, 'พักร้อนปีนี้ต้องไม่ถูกแตะ');
  });

  test('BR-01', 'โควตาพิเศษแทรกตามวันหมดอายุ ไม่ใช่ต่อท้าย', function () {
    var SS = F.boot();
    var plan = SS.core.allocate(F.EMP.special, 1).plan;
    x.has(plan[0].key, 'special', 'โควตาพิเศษที่หมดอายุ 31 ธ.ค. 2569 ต้องถูกตัดก่อนถังที่หมดทีหลัง');
  });

  test('BR-01', 'ถังที่หมดอายุแล้วต้องไม่ถูกนำมาตัด และบอกว่าขาดอีกกี่วัน', function () {
    var SS = F.boot();
    var b = SS.store.get().balances[F.EMP.staff];
    b.comp = { 2024: 5 };            /* หมดอายุ 31 ธ.ค. 2568 ไปแล้ว */
    b.annualCarry = {};
    b.annual = 1;
    var res = SS.core.allocate(F.EMP.staff, 3);
    x.eq(res.plan.length, 1, 'ตัดได้เฉพาะพักร้อนปีนี้');
    x.eq(res.shortfall, 2, 'ต้องบอกว่ายังขาดอีก 2 วัน');
  });

  test('CI-09 LV-12', 'ทุกถังมีวันหมดอายุกำกับ และแยก "ปีก่อน" กับ "ปีนี้"', function () {
    var SS = F.boot();
    var bs = SS.core.buckets(F.EMP.staff);
    x.ok(bs.length >= 2);
    bs.forEach(function (b) {
      x.ok(/^\d{4}-\d{2}-\d{2}$/.test(b.expiry), 'ถัง ' + b.key + ' ต้องมีวันหมดอายุ');
      x.ok(b.label.length > 0, 'ถัง ' + b.key + ' ต้องมีชื่อที่คนอ่านรู้เรื่อง');
    });
  });
});

group('03 · โควตา ยอดใช้ไป และยอดจอง (BR-12)', function () {

  test('BR-12', '"ใช้ไปแล้ว" กับ "รออนุมัติ" แยกกัน ไม่ใช่ตัวเลขเดียว', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff2);
    var d1 = F.nextWorkingDay(SS, F.TODAY, 1);
    var r = submit(SS, F.EMP.staff2, 'LT-PERSONAL', d1, d1);
    x.ok(r.ok, JSON.stringify(r.check && r.check.issues));
    var q = SS.core.quota(F.EMP.staff2, 'LT-PERSONAL');
    x.eq(q.used, 0, 'ยังไม่อนุมัติ จึงยังไม่นับว่าใช้');
    x.eq(q.reserved, 1, 'แต่ต้องกันยอดไว้');
    x.eq(q.remaining, 5, 'ลากิจ 6 วัน จองไป 1 เหลือ 5');
  });

  test('BR-12', 'หัวหน้าปฏิเสธใบนั้น ยอดที่จองไว้กลับคืนทันที', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff2);
    var d1 = F.nextWorkingDay(SS, F.TODAY, 1);
    var r = submit(SS, F.EMP.staff2, 'LT-PERSONAL', d1, d1);
    SS.store.setUser(F.EMP.mgrA);
    SS.store.decideLeave(r.leave.id, 'rejected', 'งานเร่ง');
    var q = SS.core.quota(F.EMP.staff2, 'LT-PERSONAL');
    x.eq(q.reserved, 0);
    x.eq(q.remaining, 6, 'กลับเป็น 6 วันเต็ม');
  });

  test('BR-12', 'ยกเลิกใบที่อนุมัติแล้ว คืนเข้าถังเดิมที่ตัดมา ไม่ใช่คืนรวมเป็นพักร้อน', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff);
    var b = SS.store.get().balances[F.EMP.staff];
    b.comp = { 2025: 2 }; b.annualCarry = { 2025: 2 }; b.annual = 8;
    var from = F.nextWorkingDay(SS, F.TODAY, 3);
    var to = F.nextWorkingDay(SS, from, 1);
    var r = submit(SS, F.EMP.staff, 'LT-ANNUAL', from, to);
    x.ok(r.ok, JSON.stringify(r.check && r.check.issues));
    SS.store.setUser(F.EMP.mgrA);
    SS.store.decideLeave(r.leave.id, 'approved', '');
    x.eq(b.comp[2025], 0, 'ตัดชดเชยปีก่อนก่อน');
    x.eq(b.annualCarry[2025], 1, 'แล้วจึงตัดสะสมปีก่อน');
    x.eq(b.annual, 8, 'พักร้อนปีนี้ต้องไม่ถูกแตะ');
    SS.store.cancelLeave(r.leave.id, 'ไม่ได้ไปแล้ว');
    x.eq(b.comp[2025], 2, 'คืนเข้าถังชดเชยเดิม');
    x.eq(b.annualCarry[2025], 2, 'คืนเข้าถังสะสมเดิม');
    x.eq(b.annual, 8, 'ไม่ไปกองรวมที่พักร้อนปีนี้');
  });

  test('LV-04', 'ใบที่ยังไม่อนุมัติ ยกเลิกเองได้ทันทีและไม่กระทบยอดถัง', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff);
    var b = JSON.stringify(SS.store.get().balances[F.EMP.staff]);
    var d1 = F.nextWorkingDay(SS, F.TODAY, 4);
    var r = submit(SS, F.EMP.staff, 'LT-ANNUAL', d1, d1);
    SS.store.cancelLeave(r.leave.id, 'เปลี่ยนแผน');
    x.eq(SS.store.get().leaves.filter(function (l) { return l.id === r.leave.id; })[0].status, 'cancelled');
    x.eq(JSON.stringify(SS.store.get().balances[F.EMP.staff]), b, 'ยอดถังต้องไม่ขยับ');
  });

  test('BR-12', 'ใบลาไม่เคยถูกลบทิ้ง ใช้การเปลี่ยนสถานะแทน', function () {
    var SS = F.boot();
    var n = SS.store.get().leaves.length;
    var d1 = F.nextWorkingDay(SS, F.TODAY, 5);
    var r = submit(SS, F.EMP.staff2, 'LT-PERSONAL', d1, d1);
    SS.store.cancelLeave(r.leave.id, 'x');
    x.eq(SS.store.get().leaves.length, n + 1, 'แถวต้องยังอยู่');
  });
});

group('03 · ขั้นตรวจอัตโนมัติก่อนถึงคน (APV-04)', function () {

  test('APV-04 BR-07', 'ยื่นทับช่วงใบเดิม ถูกตีกลับพร้อมบอกเลขที่ใบที่ทับ', function () {
    var SS = F.boot();
    var exist = SS.store.get().leaves.filter(function (l) {
      return l.empId === F.EMP.staff && l.status === 'pending';
    })[0];
    x.ok(exist, 'ข้อมูลตัวอย่างต้องมีใบลาที่รออนุมัติของธนากร');
    var r = submit(SS, F.EMP.staff, 'LT-PERSONAL', exist.from, exist.to);
    x.no(r.ok);
    x.ok(r.bounced, 'ต้องเป็นการตีกลับ');
    x.eq(r.leave.status, 'bounced', 'สถานะต้องเป็น "ตีกลับให้แก้ไข" ไม่ใช่ "ไม่อนุมัติ"');
    x.has(JSON.stringify(r.check.issues), exist.id, 'ต้องบอกเลขที่ใบที่ทับ');
  });

  test('APV-04', 'สถานะ "ตีกลับให้แก้ไข" มีอยู่จริงในทะเบียนสถานะ และไม่ใช่ "ไม่อนุมัติ"', function () {
    var SS = F.boot();
    var st = SS.LEAVE_STATUS.filter(function (s) { return s.id === 'bounced'; })[0];
    x.ok(st, 'ต้องมีสถานะ bounced');
    x.eq(st.name, 'ตีกลับให้แก้ไข');
    x.eq(st.used, 0);
    x.eq(st.reserved, 0, 'ใบที่ถูกตีกลับต้องไม่กันยอด');
  });

  test('BR-06', 'เลือกช่วงที่เป็นวันหยุดล้วน ถูกตีกลับ ไม่ใช่ยื่นได้ 0 วัน', function () {
    var SS = F.boot();
    var sun = F.nextHoliday(SS, F.TODAY);
    var r = submit(SS, F.EMP.staff2, 'LT-PERSONAL', sun, sun);
    x.no(r.ok);
    x.has(JSON.stringify(r.check.issues), 'BR-06');
  });

  test('BR-09', 'คนที่ยังไม่ผ่านการประเมิน ยื่นลาพักผ่อนไม่ได้ แต่ลาป่วยและลากิจได้', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.probation);
    var d1 = F.nextWorkingDay(SS, F.TODAY, 6);
    var annual = submit(SS, F.EMP.probation, 'LT-ANNUAL', d1, d1);
    x.no(annual.ok, 'ลาพักผ่อนต้องยื่นไม่ได้');
    x.has(JSON.stringify(annual.check.issues), 'BR-09');
    var personal = submit(SS, F.EMP.probation, 'LT-PERSONAL', d1, d1);
    x.ok(personal.ok, 'ลากิจต้องยื่นได้');
    var d2 = F.nextWorkingDay(SS, d1, 1);
    var sick = submit(SS, F.EMP.probation, 'LT-SICK', d2, d2);
    x.ok(sick.ok, 'ลาป่วยต้องยื่นได้');
  });

  test('BR-03', 'ลาป่วยเกิน 30 วันยังยื่นได้ ไม่ขึ้นว่าสิทธิ์หมด — แต่เตือนว่าส่วนเกินไม่ได้ค่าจ้าง', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff2);
    F.clearCheckins(SS, F.EMP.staff2);
    var from = F.nextWorkingDay(SS, F.TODAY, 1);
    var to = SS.d.add(from, 60);
    var r = submit(SS, F.EMP.staff2, 'LT-SICK', from, to, { attachment: 'ใบรับรองแพทย์.pdf' });
    x.ok(r.ok, 'ต้องยื่นได้ ' + JSON.stringify(r.check && r.check.issues));
    var over = r.check.warns.filter(function (w) { return w.code === 'BR-02'; })[0];
    x.ok(over, 'ต้องเตือนเรื่องส่วนที่ไม่ได้ค่าจ้าง');
    x.ok(r.check.split.paid <= 30, 'ส่วนที่ได้ค่าจ้างต้องไม่เกิน 30 วัน');
    x.ok(r.check.split.unpaid > 0, 'ส่วนเกินต้องเป็นวันไม่ได้ค่าจ้าง');
  });

  test('BR-02', 'ยื่นเกินสิทธิ์ ระบบแยกวันจ่าย/ไม่จ่ายให้เห็นก่อนกดส่ง', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff2);
    var sp = SS.core.splitPaid(F.EMP.staff2, 'LT-PERSONAL', 8);
    x.eq(sp.paid, 6, 'ลากิจจ่าย 6 วัน');
    x.eq(sp.unpaid, 2, 'ส่วนเกิน 2 วันไม่ได้ค่าจ้าง');
    x.eq(sp.rate, 100);
  });

  test('BR-05', 'ยื่นกระชั้นยังยื่นได้ แต่ติดป้ายเตือน', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff);
    var tomorrow = F.nextWorkingDay(SS, F.TODAY);
    var r = submit(SS, F.EMP.staff, 'LT-ANNUAL', tomorrow, tomorrow);
    x.ok(r.ok, 'ต้องยื่นได้');
    x.has(JSON.stringify(r.check.warns), 'BR-05', 'ต้องมีป้ายยื่นกระชั้น');
  });

  test('BR-05', 'ประเภทที่ยื่นย้อนหลังไม่ได้ ต้องถูกตีกลับ ส่วนลาป่วยย้อนหลังในกรอบยังยื่นได้', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff2);
    F.clearCheckins(SS, F.EMP.staff2);
    var past = F.prevWorkingDay(SS, F.TODAY);
    var annual = submit(SS, F.EMP.staff2, 'LT-ANNUAL', past, past);
    x.no(annual.ok, 'ลาพักผ่อนย้อนหลังไม่ได้');
    x.has(JSON.stringify(annual.check.issues), 'BR-05');
    var sick = submit(SS, F.EMP.staff2, 'LT-SICK', past, past);
    x.ok(sick.ok, 'ลาป่วยย้อนหลังได้ไม่เกิน 3 วัน');
  });

  test('LV-07', 'ลาป่วยตั้งแต่ 3 วันโดยไม่แนบเอกสาร ต้องขึ้นคำเตือน', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff2);
    F.clearCheckins(SS, F.EMP.staff2);
    var from = F.nextWorkingDay(SS, F.TODAY);
    var to = F.nextWorkingDay(SS, from, 1);
    var r = submit(SS, F.EMP.staff2, 'LT-SICK', from, to);
    x.eq(SS.core.leaveDays(r.leave), 3, 'ฉากต้องเป็นลาป่วย 3 วันทำงาน');
    x.has(JSON.stringify(r.check.warns), 'LV-07');
  });

  test('LV-09 BR-10', 'เพดานคนลาต่อวันบังคับได้เมื่อตั้งค่า แต่ลาป่วยและลาคลอดแทรกได้เสมอ', function () {
    var SS = F.boot();
    F.setParams(SS, { maxLeavePerDay: 1 });
    var d1 = F.nextWorkingDay(SS, F.TODAY, 8);
    F.clearLeaves(SS, F.EMP.staff);
    F.clearLeaves(SS, F.EMP.staff2);
    var first = submit(SS, F.EMP.staff, 'LT-ANNUAL', d1, d1);
    x.ok(first.ok, JSON.stringify(first.check && first.check.issues));
    var second = submit(SS, F.EMP.staff2, 'LT-PERSONAL', d1, d1);
    x.no(second.ok, 'คนที่สองต้องถูกตีกลับเพราะเต็มเพดาน');
    x.has(JSON.stringify(second.check.issues), 'LV-09');
    var sick = submit(SS, F.EMP.staff2, 'LT-SICK', d1, d1);
    x.ok(sick.ok, 'ลาป่วยต้องแทรกได้เสมอ');
  });

  test('LV-09', 'ค่าเพดานคนลาต่อวันตั้งต้นเป็น null = ยังไม่บังคับ', function () {
    var SS = F.boot();
    x.eq(SS.store.get().params.maxLeavePerDay, null, 'ยังไม่เคาะตัวเลข จึงต้องไม่บังคับเงียบ ๆ');
  });

  test('BR-07', 'ยื่นลาทับวันที่เช็คอินไปแล้ว ต้องเตือนให้เลือกทางก่อน', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff2);
    var past = F.prevWorkingDay(SS, F.TODAY);
    x.ok(SS.core.checkinOf(F.EMP.staff2, past), 'ฉากต้องมีเช็คอินอยู่ในวันนั้น');
    var r = submit(SS, F.EMP.staff2, 'LT-SICK', past, past);
    x.has(JSON.stringify(r.check.warns), 'BR-07');
  });

  test('BR-07', 'เช็คอินในวันที่มีใบลาอนุมัติเต็มวันไม่ได้ ต้องยกเลิกใบลาก่อน', function () {
    var SS = F.boot();
    F.clearCheckins(SS, F.EMP.staff2, F.TODAY);
    F.clearLeaves(SS, F.EMP.staff2);
    SS.store.get().leaves.push({
      id: 'LV-TEST-APPROVED', empId: F.EMP.staff2, type: 'LT-ANNUAL',
      from: F.TODAY, to: F.TODAY, status: 'approved', halfDay: null, reason: 'พักผ่อน'
    });
    var r = SS.store.checkIn({ empId: F.EMP.staff2, jobType: 'office', travelType: 'office', detail: 'x' });
    x.no(r.ok);
    x.ok(r.needCancelLeave, 'ต้องบอกว่าให้ไปยกเลิกใบไหน');
    x.has(r.msg, 'BR-07');
  });
});

group('03 · การตัดสินใบลา', function () {

  test('LV-03', 'ระบบบอกจำนวนวันและแผนการตัดถังให้เห็นก่อนกดส่ง', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff);
    var from = F.nextWorkingDay(SS, F.TODAY, 3);
    var to = F.nextWorkingDay(SS, from, 1);
    var lv = { empId: F.EMP.staff, type: 'LT-ANNUAL', from: from, to: to };
    var chk = SS.core.autoCheckLeave(lv);
    x.eq(chk.days, 3, 'ต้องรู้จำนวนวันก่อนส่ง');
    var plan = SS.core.allocate(F.EMP.staff, chk.days).plan;
    x.ok(plan.length > 0, 'ต้องบอกได้ว่าจะหักจากถังไหน');
  });

  test('BR-12', 'อนุมัติแล้วยอดคงเหลือลดลง และแผนถังถูกเก็บไว้กับใบ', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff);
    var d1 = F.nextWorkingDay(SS, F.TODAY, 3);
    var r = submit(SS, F.EMP.staff, 'LT-ANNUAL', d1, d1);
    SS.store.setUser(F.EMP.mgrA);
    var lv = SS.store.decideLeave(r.leave.id, 'approved', '');
    x.eq(lv.status, 'approved');
    x.ok(lv.bucketPlan && lv.bucketPlan.length > 0, 'ต้องบันทึกแผนถังไว้เพื่อคืนยอดได้ถูกถัง');
    x.eq(lv.approverId, F.EMP.mgrA, 'ต้องรู้ว่าใครเป็นคนอนุมัติ');
    x.ok(lv.decidedAt, 'ต้องรู้ว่าอนุมัติเมื่อไร');
  });

  test('CI-14', 'อนุมัติใบลาย้อนหลังแล้ว สถานะของวันนั้นเปลี่ยนเองทันที', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff2);
    F.clearCheckins(SS, F.EMP.staff2);
    var past = F.prevWorkingDay(SS, F.TODAY);
    x.eq(SS.core.dayStatus(F.EMP.staff2, past).status, 'absent', 'ก่อนยื่นใบลาเป็นขาดงาน');
    var r = submit(SS, F.EMP.staff2, 'LT-SICK', past, past);
    x.eq(SS.core.dayStatus(F.EMP.staff2, past).status, 'review', 'ยื่นแล้วแต่ยังไม่อนุมัติ = รอตรวจสอบ');
    SS.store.setUser(F.EMP.mgrA);
    SS.store.decideLeave(r.leave.id, 'approved', '');
    x.eq(SS.core.dayStatus(F.EMP.staff2, past).status, 'leave', 'อนุมัติแล้วเปลี่ยนเป็นลาทันที');
  });

  test('APV-13', 'ทุกการตัดสินใบลาถูกบันทึกลง audit log', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff);
    var d1 = F.nextWorkingDay(SS, F.TODAY, 3);
    var r = submit(SS, F.EMP.staff, 'LT-ANNUAL', d1, d1);
    SS.store.setUser(F.EMP.mgrA);
    SS.store.decideLeave(r.leave.id, 'approved', 'อนุมัติตามที่คุยกัน');
    var log = SS.store.get().audit.filter(function (a) { return a.action === 'อนุมัติใบลา'; });
    x.ok(log.length > 0, 'ต้องมีบันทึกการอนุมัติ');
    x.ok(log[0].by, 'ต้องรู้ว่าใครทำ');
    x.ok(log[0].at, 'ต้องรู้ว่าเมื่อไร');
  });
});
