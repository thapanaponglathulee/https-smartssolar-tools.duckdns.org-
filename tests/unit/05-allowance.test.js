/* ==========================================================================
   05 · ค่าอาหาร (คำนวณอัตโนมัติ) และเบี้ยเลี้ยง
   ครอบคลุม ALW-02 ALW-04 ALW-06 ALW-10 · CI-03 · CI-19
   ย้ำคำศัพท์: "ค่าข้าว" = ระบบคำนวณเองจากเช็คอิน · "เบี้ยเลี้ยง" = ยื่นเบิกเอง
   ========================================================================== */
'use strict';
var T = require('../lib/tiny-test.js');
var F = require('../lib/fixtures.js');
var group = T.group, test = T.test, x = T.expect;

function checkin(SS, empId, over) {
  var data = { empId: empId, jobType: 'onsite', projectId: 'PRJ-MVP', travelType: 'onsite', detail: 'งานติดตั้ง' };
  Object.keys(over || {}).forEach(function (k) { data[k] = over[k]; });
  return SS.store.checkIn(data);
}

group('05 · จำนวนมื้อตามลักษณะการไป (ALW-04 · CI-19)', function () {

  test('ALW-04', 'จำนวนมื้อของแต่ละแบบตรงกับทะเบียนกลาง S20', function () {
    var SS = F.boot();
    x.eq(SS.core.mealCount(['onsite']), 3, 'ประจำไซต์');
    x.eq(SS.core.mealCount(['office']), 0, 'ประจำออฟฟิศ');
    x.eq(SS.core.mealCount(['daytrip']), 1, 'ไปเช้า-เย็นกลับ');
    x.eq(SS.core.mealCount(['am']), 1, 'ไปเช้า-บ่ายกลับ');
    x.eq(SS.core.mealCount(['pm']), 1, 'ไปบ่าย-เย็นกลับ');
    x.eq(SS.core.mealCount(['night']), 3, 'กะกลางคืน');
  });

  test('CI-19', '"อยู่หน้างานนอกเวลา" เป็นตัวบวก +1 มื้อ', function () {
    var SS = F.boot();
    x.eq(SS.core.mealCount(['daytrip', 'overtime']), 2);
    x.eq(SS.core.mealCount(['onsite', 'overtime']), 4);
  });

  test('CI-19', 'กะกลางคืนทับทุกอย่าง ไม่บวกมื้อนอกเวลาซ้ำ', function () {
    var SS = F.boot();
    x.eq(SS.core.mealCount(['night', 'overtime']), 3, 'ต้องไม่กลายเป็น 4');
    x.eq(SS.core.mealCount(['onsite', 'night']), 3);
  });

  test('ALW-04', 'แก้จำนวนมื้อในทะเบียนกลาง แล้วยอดคำนวณใหม่ตาม ไม่ต้องแก้โปรแกรม', function () {
    var SS = F.boot();
    SS.travelType('daytrip').meals = 2;
    x.eq(SS.core.mealCount(['daytrip']), 2);
  });
});

group('05 · อัตราต่อมื้อรายไซต์ (ALW-02)', function () {

  test('ALW-02', 'อัตราของไซต์มาจากทะเบียนอัตรา ไม่ใช่ค่าตายในโค้ด', function () {
    var SS = F.boot();
    x.eq(SS.core.rateAt('PRJ-MVP', F.TODAY).rate, 75, 'MVP ตั้งไว้ 75 บาท');
    x.eq(SS.core.rateAt('PRJ-HYS', F.TODAY).rate, 40);
  });

  test('ALW-02', 'ไซต์ที่ยังไม่ตั้งอัตรา ต้องบอกว่ากำลังใช้ค่าเริ่มต้น ไม่ใช่คิดเป็น 0 เงียบ ๆ', function () {
    var SS = F.boot();
    var r = SS.core.rateAt('PRJ-CRR', F.TODAY);
    x.ok(r.isDefault, 'ต้องติดธงว่าเป็นค่าเริ่มต้น');
    x.eq(r.rate, SS.store.get().params.defaultMealRate, 'ใช้อัตราเริ่มต้นของบริษัท');
    x.ok(r.rate > 0, 'ห้ามเป็น 0');
  });

  test('ALW-02', 'อัตรามีวันเริ่มมีผล — วันก่อนหน้านั้นต้องไม่ใช้อัตราใหม่', function () {
    var SS = F.boot();
    SS.store.get().rates.push({ id: 'R-TEST', projectId: 'PRJ-CRR', rate: 120, from: '2026-10-01', to: null });
    x.eq(SS.core.rateAt('PRJ-CRR', '2026-09-30').rate, SS.store.get().params.defaultMealRate, 'ก่อนวันเริ่มมีผล');
    x.eq(SS.core.rateAt('PRJ-CRR', '2026-10-01').rate, 120, 'ตั้งแต่วันเริ่มมีผล');
  });

  test('ALW-07', 'การคิดเงินตามระยะทางถูกปิดไว้ตามข้อสรุป', function () {
    var SS = F.boot();
    x.no(SS.store.get().params.distanceRateEnabled, 'ALW-07 ตัดออกแล้ว');
  });
});

group('05 · ยอดค่าอาหารรายวัน (ALW-06 · ALW-10)', function () {

  test('ALW-06', 'ยอด = อัตราต่อมื้อของไซต์ ณ วันนั้น × จำนวนมื้อ', function () {
    var SS = F.boot();
    var r = checkin(SS, F.EMP.staff);
    var a = SS.core.allowanceOf(r.rec);
    x.eq(a.meals, 3);
    x.eq(a.rate, 75);
    x.eq(a.amount, 225);
  });

  test('ALW-06', 'ติ๊กอยู่หน้างานนอกเวลา ได้เพิ่มอีกหนึ่งมื้อ', function () {
    var SS = F.boot();
    var r = checkin(SS, F.EMP.staff, { travelType: 'daytrip', overtime: true });
    var a = SS.core.allowanceOf(r.rec);
    x.eq(a.meals, 2);
    x.eq(a.amount, 150);
  });

  test('ALW-10', 'วันที่มีใบลาอนุมัติแล้ว ไม่เกิดรายการค่าอาหาร', function () {
    var SS = F.boot();
    F.clearCheckins(SS, F.EMP.staff2, F.TODAY);
    F.clearLeaves(SS, F.EMP.staff2);
    var r = checkin(SS, F.EMP.staff2);
    SS.store.get().leaves.push({
      id: 'LV-TEST-ALW', empId: F.EMP.staff2, type: 'LT-ANNUAL',
      from: F.TODAY, to: F.TODAY, status: 'approved', halfDay: 'am', reason: 'ธุระครึ่งวัน'
    });
    var a = SS.core.allowanceOf(SS.core.checkinOf(F.EMP.staff2, F.TODAY));
    x.ok(a.skip, 'ต้องข้ามรายการ');
    x.has(a.reason, 'ALW-10');
    x.ok(r.ok);
  });

  test('ALW-06', 'หยุดงานที่ไซต์ยังได้ค่าอาหารเต็มตามที่ไปถึงจริง', function () {
    var SS = F.boot();
    var r = checkin(SS, F.EMP.staff);
    SS.store.setSiteStop(r.rec.id, { reason: 'rain', allDay: true });
    var a = SS.core.allowanceOf(SS.core.checkinOf(F.EMP.staff, F.TODAY));
    x.eq(a.amount, 225, 'ยอดต้องไม่ถูกตัดเพราะฝนตก');
  });

  test('ALW-06', 'เช็คอินประจำออฟฟิศได้ 0 มื้อ', function () {
    var SS = F.boot();
    var r = checkin(SS, F.EMP.staff, { jobType: 'office', projectId: null, travelType: 'office' });
    x.eq(SS.core.allowanceOf(r.rec).meals, 0);
  });
});

group('05 · ห้ามให้พนักงานเห็นตัวเงิน (CI-03 · ALW-13)', function () {

  test('CI-03', 'ทะเบียนประเภทงานและลักษณะการไปที่ส่งให้หน้าจอ ต้องไม่มีตัวเลขเงิน', function () {
    var SS = F.boot();
    var s = JSON.stringify(SS.store.get().jobTypes);
    x.hasNot(s, 'rate', 'ประเภทงานต้องไม่พกอัตราเงินติดไปด้วย');
    x.hasNot(s, 'amount');
    x.hasNot(s, 'บาท');
  });

  test('CI-03', 'รายการเช็คอินที่บันทึกไว้ ไม่มีตัวเลขเงินหรือจำนวนมื้อฝังอยู่', function () {
    var SS = F.boot();
    var r = checkin(SS, F.EMP.staff);
    var keys = Object.keys(r.rec);
    ['amount', 'rate', 'meals', 'allowance'].forEach(function (k) {
      x.eq(keys.indexOf(k), -1, 'รายการเช็คอินต้องไม่มีฟิลด์ ' + k + ' (คำนวณตอนอ่านเท่านั้น)');
    });
  });

  test('ALW-13', 'ยอดเงินคำนวณตอนอ่านผ่าน core.allowanceOf จุดเดียว หน้าจออื่นห้ามคิดเอง', function () {
    var SS = F.boot();
    x.eq(typeof SS.core.allowanceOf, 'function', 'ต้องมีบริการกลางให้เรียก');
    var r = checkin(SS, F.EMP.staff);
    SS.store.get().rates.filter(function (x2) { return x2.projectId === 'PRJ-MVP'; })[0].rate = 90;
    x.eq(SS.core.allowanceOf(r.rec).amount, 270, 'แก้อัตราที่ทะเบียนแล้วยอดเปลี่ยนตามทันที');
  });
});

group('05 · ระบบนี้ไม่ยุ่งกับเงินเดือนและค่าแรง', function () {

  test('CI-10', 'OT แปลงเป็นวันหยุดอย่างเดียว ไม่มีการเก็บเป็นเงิน', function () {
    var SS = F.boot();
    var ot = SS.store.submitOT({ empId: F.EMP.staff, date: F.TODAY, start: '18:00', end: '22:00', reason: 'x' });
    var keys = Object.keys(ot);
    ['amount', 'rate', 'pay', 'money', 'baht'].forEach(function (k) {
      x.eq(keys.indexOf(k), -1, 'คำขอ OT ต้องไม่มีฟิลด์ ' + k);
    });
    x.ok('hours' in ot, 'เก็บเป็นชั่วโมงเท่านั้น');
  });

  test('A1', 'ทะเบียนพนักงานไม่มีช่องเงินเดือน ค่าแรง หรือเลขบัญชี', function () {
    var SS = F.boot();
    var s = JSON.stringify(SS.store.get().employees);
    ['salary', 'wage', 'bankAccount', 'เงินเดือน', 'ค่าแรง', 'เลขบัญชี'].forEach(function (k) {
      x.hasNot(s, k, 'ทะเบียนพนักงานต้องไม่เก็บ ' + k);
    });
  });
});
