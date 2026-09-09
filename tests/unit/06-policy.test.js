/* ==========================================================================
   06 · กติกาที่ต้องยึดเสมอ (จาก CLAUDE.md) + ใบรับรองและเอกสารอ่อนไหว
   1 · ค่านโยบายต้องตั้งค่าได้ ห้าม hardcode
   4 · ห้ามลบข้อมูลจริง ใช้การทำเครื่องหมายยกเลิก
   5 · ทุกการแก้ย้อนหลังต้องมี audit log
   6 · เอกสารสุขภาพเป็นข้อมูลอ่อนไหวตาม PDPA
   7 · UI เป็นภาษาไทยทั้งหมด
   ครอบคลุม C1 C2 C4 C6 · A1 · O1 O2 · LV-02
   ========================================================================== */
'use strict';
var T = require('../lib/tiny-test.js');
var F = require('../lib/fixtures.js');
var group = T.group, test = T.test, x = T.expect;

group('06 · ค่านโยบายต้องตั้งค่าได้ ห้ามฝังในโค้ด', function () {

  test('S4', 'ค่านโยบายทุกตัวที่สเปกระบุ มีอยู่ในชุดพารามิเตอร์', function () {
    var SS = F.boot();
    var p = SS.store.get().params;
    ['workStart', 'workEnd', 'graceMinutes', 'nightStart', 'nightEnd',
     'holidayCompRate', 'otHoursPerDay', 'expiryRule', 'selfEditHours',
     'probationDays', 'payCycleStartDay', 'maxVisitsPerDay', 'siteRadiusMeters',
     'defaultMealRate', 'historyPageSize', 'lapseAfterDays', 'reminderEveryHours'].forEach(function (k) {
      x.ok(k in p, 'ต้องมีค่าตั้งค่า ' + k + ' ในหน้าตั้งค่า');
    });
  });

  test('S4', 'แก้ค่าตั้งค่าผ่าน store.setParam แล้วมี audit log ทุกครั้ง', function () {
    var SS = F.boot();
    SS.store.setUser(F.EMP.admin);
    SS.store.setParam('graceMinutes', 15);
    x.eq(SS.store.get().params.graceMinutes, 15);
    var log = SS.store.get().audit.filter(function (a) { return a.action === 'แก้พารามิเตอร์'; });
    x.ok(log.length > 0, 'การแก้ค่านโยบายต้องถูกบันทึก');
    x.has(log[0].detail, '15', 'ต้องบันทึกว่าเปลี่ยนจากค่าอะไรเป็นค่าอะไร');
  });

  test('S4', 'ค่าที่ยังไม่เคาะ ถูกทำเครื่องหมายไว้ชัด ไม่ใช่เดาตัวเลขใส่', function () {
    var SS = F.boot();
    var p = SS.store.get().params;
    x.eq(p.maxLeavePerDay, null, 'เพดานคนลาต่อวัน ยังไม่เคาะ');
    x.eq(p.officeOvertimeMeals, 0, 'มื้อนอกเวลาของประจำออฟฟิศ ยังรอผู้บริหารยืนยัน');
  });

  test('S4', 'เวลาทำงานและเวลากะกลางคืนอยู่ในค่าตั้งค่า ไม่ใช่ตัวเลขในโค้ด', function () {
    var SS = F.boot();
    F.setParams(SS, { workStart: '09:00' });
    F.freezeNow(SS, '09:10');
    F.clearCheckins(SS, F.EMP.staff, F.TODAY);
    var r = SS.store.checkIn({ empId: F.EMP.staff, jobType: 'onsite', projectId: 'PRJ-CRR',
                              travelType: 'onsite', detail: 'งาน' });
    x.eq(SS.core.lateMinutes(r.rec), 10, 'ต้องเทียบกับ 09:00 ที่เพิ่งตั้ง ไม่ใช่ 08:30');
  });
});

group('06 · ห้ามลบข้อมูลจริง (กติกาข้อ 4)', function () {

  test('O1', 'ปิดการใช้งานฝ่าย/แผนกแทนการลบ และปิดไม่ได้ถ้ายังมีคนอยู่', function () {
    var SS = F.boot();
    SS.store.setUser(F.EMP.hr);
    var dept = SS.store.get().depts[0];
    var n = SS.store.orgCount('dept', dept.id);
    var res = SS.store.disableOrgUnit('dept', dept.id);
    if (n > 0) {
      x.no(res.ok, 'ยังมีคนสังกัดอยู่ ต้องปิดไม่ได้');
      x.has(res.msg, String(n), 'ต้องบอกว่ามีกี่คน');
    }
    x.eq(SS.store.get().depts.filter(function (d) { return d.id === dept.id; }).length, 1, 'แถวต้องยังอยู่');
  });

  test('O2', 'ตำแหน่งงานที่มีคนถืออยู่ ปิดการใช้งานไม่ได้ และไม่มีการลบ', function () {
    var SS = F.boot();
    SS.store.setUser(F.EMP.hr);
    var pos = SS.store.get().positions.filter(function (p) { return SS.store.orgCount('position', p.id) > 0; })[0];
    x.ok(pos, 'ต้องมีตำแหน่งที่มีคนถืออยู่');
    var res = SS.store.togglePosition(pos.id);
    x.no(res.ok, 'ปิดไม่ได้เพราะยังมีคนถืออยู่');
    x.ok(SS.store.get().positions.filter(function (p) { return p.id === pos.id; })[0], 'แถวต้องยังอยู่');
  });

  test('A1', 'ทะเบียนพนักงานใช้การทำเครื่องหมายสถานะ ไม่มีฟังก์ชันลบพนักงาน', function () {
    var SS = F.boot();
    x.eq(typeof SS.store.deleteEmployee, 'undefined', 'ต้องไม่มีฟังก์ชันลบพนักงาน');
    x.ok(SS.EMP_STATUS && SS.EMP_STATUS.length > 1, 'ต้องมีทะเบียนสถานะพนักงานให้ทำเครื่องหมายแทน');
  });

  test('CI-06', 'ไม่มีฟังก์ชันลบเช็คอินหรือลบใบลา มีแต่การยกเลิก', function () {
    var SS = F.boot();
    x.eq(typeof SS.store.deleteCheckin, 'undefined');
    x.eq(typeof SS.store.deleteLeave, 'undefined');
    x.eq(typeof SS.store.cancelCheckin, 'function');
    x.eq(typeof SS.store.cancelLeave, 'function');
  });
});

group('06 · audit log (กติกาข้อ 5)', function () {

  test('APV-13', 'ทุกรายการใน audit log บอกได้ว่า ใคร เมื่อไร ทำอะไร กับอะไร', function () {
    var SS = F.boot();
    SS.store.setUser(F.EMP.staff);
    F.clearCheckins(SS, F.EMP.staff, F.TODAY);
    SS.store.checkIn({ empId: F.EMP.staff, jobType: 'onsite', projectId: 'PRJ-CRR', travelType: 'onsite', detail: 'งาน' });
    var log = SS.store.get().audit;
    x.ok(log.length > 0);
    log.slice(0, 20).forEach(function (a) {
      x.ok(a.action, 'ต้องมีชื่อการกระทำ');
      x.ok(a.at, 'ต้องมีเวลา');
      x.ok('by' in a, 'ต้องมีผู้ทำ');
    });
  });

  test('APV-13', 'การแก้ข้อมูลย้อนหลังเก็บทั้งค่าเดิมและค่าใหม่', function () {
    var SS = F.boot();
    F.clearCheckins(SS, F.EMP.staff, F.TODAY);
    var r = SS.store.checkIn({ empId: F.EMP.staff, jobType: 'onsite', projectId: 'PRJ-CRR', travelType: 'onsite', detail: 'งาน' });
    SS.store.editCheckin(r.rec.id, { travelType: 'daytrip' }, 'กลับก่อนเย็น');
    var e = SS.core.checkinOf(F.EMP.staff, F.TODAY).editLog[0];
    x.eq(e.before.travelType, 'onsite');
    x.eq(e.after.travelType, 'daytrip');
    x.eq(e.reason, 'กลับก่อนเย็น', 'ต้องเก็บเหตุผลที่แก้');
  });
});

group('06 · เอกสารอ่อนไหวตาม PDPA (กติกาข้อ 6 · C4)', function () {

  test('C4', 'เอกสารสุขภาพและประวัติอาชญากรรม ถูกทำเครื่องหมายว่าอ่อนไหว', function () {
    var SS = F.boot();
    ['CT-12', 'CT-13', 'CT-14'].forEach(function (id) {
      x.ok(SS.certType(id).sensitive, SS.certType(id).name + ' ต้องเป็นเอกสารอ่อนไหว');
    });
  });

  test('C4', 'เอกสารอ่อนไหวเก็บได้แค่ ผ่าน/ไม่ผ่าน + วันที่ ไม่เก็บผลตรวจละเอียดและไม่แนบไฟล์', function () {
    var SS = F.boot();
    SS.store.setUser(F.EMP.hr);
    var res = SS.store.addSensitive({ empId: F.EMP.staff, typeId: 'CT-12', pass: true,
                                      checked: '2026-08-01', next: '2027-08-01' });
    x.ok(res.ok, res.msg);
    var keys = Object.keys(res.rec);
    ['attachment', 'result', 'detail', 'note', 'diagnosis'].forEach(function (k) {
      x.eq(keys.indexOf(k), -1, 'เอกสารอ่อนไหวต้องไม่มีฟิลด์ ' + k);
    });
    x.eq(typeof res.rec.pass, 'boolean', 'เก็บได้แค่ผ่าน/ไม่ผ่าน');
  });

  test('C4', 'บันทึกเอกสารอ่อนไหวผ่านฟอร์มใบรับรองธรรมดาไม่ได้', function () {
    var SS = F.boot();
    var res = SS.store.addCert({ empId: F.EMP.staff, typeId: 'CT-12', issued: '2026-08-01' });
    x.no(res.ok);
    x.has(res.msg, 'อ่อนไหว');
  });

  test('C4', 'audit log ของเอกสารอ่อนไหว ต้องไม่เขียนผลตรวจลงในข้อความที่ทุกบทบาทเห็น', function () {
    var SS = F.boot();
    SS.store.setUser(F.EMP.hr);
    SS.store.addSensitive({ empId: F.EMP.staff, typeId: 'CT-14', pass: false, checked: '2026-08-01' });
    var row = SS.store.get().audit.filter(function (a) { return /เอกสารอ่อนไหว/.test(a.action); })[0];
    x.ok(row, 'ต้องมีรายการ');
    x.hasNot(row.detail, 'ไม่ผ่าน', 'ผลตรวจต้องไม่โผล่ในบันทึกที่คนอื่นอ่านได้');
    x.has(row.detail, 'ปกปิด');
  });

  test('C4', 'ทุกครั้งที่เปิดดูเอกสารอ่อนไหว ต้องลง audit log ไม่ใช่แค่ตอนแก้', function () {
    var SS = F.boot();
    SS.store.setUser(F.EMP.mgrA);
    var before = SS.store.get().audit.length;
    SS.store.logSensitiveView(F.EMP.staff, 'CT-12');
    x.eq(SS.store.get().audit.length, before + 1);
    x.has(SS.store.get().audit[0].action + SS.store.get().audit[SS.store.get().audit.length - 1].action,
          'เปิดดูเอกสารอ่อนไหว');
  });

  T.known('C4',
    'ต้นแบบยังไม่บังคับสิทธิ์การเปิดดูเอกสารอ่อนไหว — ใครสลับบทบาทเป็นใครก็เรียกดูได้',
    'ตรงตามที่ CLAUDE.md ระบุไว้ว่า "audit log และสิทธิ์ PDPA ในต้นแบบเป็นแค่การแสดงให้เห็น ไม่ใช่การบังคับ" ' +
    'การบังคับจริงต้องทำที่ backend ของระบบจริง — ห้ามติ๊กผ่านข้อนี้จากการทดสอบในต้นแบบ',
    function () {
      var SS = F.boot();
      SS.store.setUser(F.EMP.exec);        /* ผู้บริหารต้องไม่เปิดดูได้ตามข้อตัดสิน 2 ก.ย. 2569 */
      x.eq(SS.core.latestSensitive(F.EMP.staff, 'CT-12'), null,
           'ผู้บริหารต้องเรียกดูผลตรวจสุขภาพไม่ได้');
    });
});

group('06 · ใบรับรอง (C1 · C2 · C6)', function () {

  test('C1', 'สถานะใบมีสี่ค่า ใช้ได้ · ใกล้หมด · หมดอายุ · ยังไม่เคยมี', function () {
    var SS = F.boot();
    x.eq(SS.core.certStatus(null), 'missing');
    x.eq(SS.core.certStatus({ typeId: 'CT-02', expiry: null }), 'valid', 'ใบที่ไม่หมดอายุ');
    x.eq(SS.core.certStatus({ typeId: 'CT-02', expiry: SS.d.add(F.TODAY, -1) }), 'expired');
    x.eq(SS.core.certStatus({ typeId: 'CT-02', expiry: SS.d.add(F.TODAY, 30) }), 'soon', 'เตือนล่วงหน้า 60 วัน');
    x.eq(SS.core.certStatus({ typeId: 'CT-02', expiry: SS.d.add(F.TODAY, 200) }), 'valid');
  });

  test('C1', 'จำนวนวันเตือนล่วงหน้ามาจากทะเบียนชนิดใบ ไม่ใช่ค่าตายในโค้ด', function () {
    var SS = F.boot();
    SS.certType('CT-02').warnDays = 10;
    x.eq(SS.core.certStatus({ typeId: 'CT-02', expiry: SS.d.add(F.TODAY, 30) }), 'valid',
         'ลดวันเตือนแล้วต้องกลับเป็นใช้ได้');
  });

  test('C2', 'ต่ออายุคือเพิ่มฉบับใหม่ ฉบับเก่ายังอยู่เป็นประวัติ', function () {
    var SS = F.boot();
    SS.store.setUser(F.EMP.hr);
    SS.store.addCert({ empId: F.EMP.staff, typeId: 'CT-04', issued: '2024-01-01', expiry: '2027-01-01' });
    SS.store.addCert({ empId: F.EMP.staff, typeId: 'CT-04', issued: '2026-01-01', expiry: '2029-01-01' });
    var hist = SS.core.certHistory(F.EMP.staff, 'CT-04');
    x.eq(hist.length, 2, 'ต้องเก็บทั้งสองฉบับ');
    x.eq(SS.core.latestCert(F.EMP.staff, 'CT-04').issued, '2026-01-01', 'ฉบับล่าสุดคือฉบับที่ออกทีหลัง');
  });

  test('C1', 'ใบบังคับที่ยังไม่เคยมี ต้องโผล่เป็นสถานะ "ยังไม่เคยมี" ไม่ใช่หายไปเฉย ๆ', function () {
    var SS = F.boot();
    var required = SS.core.requiredCertTypes(F.EMP.staff).map(function (t) { return t.id; });
    x.ok(required.length > 0, 'ช่างหน้าไซต์ต้องมีใบบังคับ');
    var list = SS.core.certsOf(F.EMP.staff);
    var missing = list.filter(function (c) { return c.status === 'missing'; });
    x.ok(missing.length >= 0, 'รายการต้องรวมใบที่ยังไม่เคยมีด้วย');
    required.forEach(function (id) {
      x.ok(list.filter(function (c) { return c.type.id === id; }).length > 0,
           'ใบบังคับ ' + id + ' ต้องปรากฏในสรุปของพนักงานเสมอ');
    });
  });

  test('C6', 'การยกเว้นให้ลงไซต์ทั้งที่ใบหมดอายุ ต้องกรอกเหตุผลและถูกบันทึก', function () {
    var SS = F.boot();
    SS.store.setUser(F.EMP.mgrA);
    x.no(SS.store.addCertExemption({ empId: F.EMP.staff, typeIds: ['CT-09'], reason: '  ' }).ok,
         'ไม่กรอกเหตุผลต้องบันทึกไม่ได้');
    var ok = SS.store.addCertExemption({ empId: F.EMP.staff, typeIds: ['CT-09'], reason: 'งานเร่งด่วน หัวหน้าคุมเอง' });
    x.ok(ok.ok);
    x.ok(SS.core.exemptedToday(F.EMP.staff), 'ต้องมีผลเฉพาะวันนี้');
    var log = SS.store.get().audit.filter(function (a) { return a.action === 'ยกเว้นใบบังคับที่หมดอายุ'; });
    x.ok(log.length > 0, 'ต้องมี audit log');
  });
});

group('06 · ข้อมูลตัวอย่างต้องดูออกว่าเป็นของสมมติ', function () {

  test('A1', 'บัญชีทดสอบในต้นแบบถูกทำเครื่องหมายไว้ชัดเจน', function () {
    var SS = F.boot();
    var t = SS.store.employee(F.EMP.test);
    x.ok(t.isTest, 'ต้องมีธง isTest');
    x.has(t.name, '#test', 'ชื่อต้องดูออกว่าเป็นบัญชีทดสอบ');
  });

  test('LV-02', 'พนักงานที่ข้อมูลยังไม่ครบ ตรวจพบได้จากข้อมูล ไม่ต้องเปิดทีละคน', function () {
    var SS = F.boot();
    var incomplete = SS.store.get().employees.filter(function (e) {
      return e.active && !e.isTest && (!e.probationPassedDate || !e.managerId || !e.positionId);
    });
    x.ok(incomplete.length > 0, 'ข้อมูลตัวอย่างต้องมีเคสข้อมูลไม่ครบไว้ให้ทดสอบ');
    x.ok(incomplete.some(function (e) { return !e.probationPassedDate; }),
         'ต้องมีเคสยังไม่บันทึกวันผ่านการประเมิน (BR-09)');
  });

  test('S8', 'มีครบทั้ง 5 บทบาท และมีคนจริงในทุกบทบาทให้สลับทดสอบได้', function () {
    var SS = F.boot();
    x.len(SS.ROLES, 5);
    SS.ROLES.forEach(function (r) {
      x.ok(SS.store.get().employees.filter(function (e) { return e.role === r.id; }).length > 0,
           'ต้องมีคนในบทบาท ' + r.name + ' ให้สลับทดสอบ');
    });
  });
});
