/* ==========================================================================
   04 · เส้นทางการอนุมัติ
   ครอบคลุม APV-01 APV-02 APV-03 APV-05 APV-11 · J4
   ตารางอำนาจต้องอยู่ที่เดียว — เทสต์ชุดนี้จึงตรวจว่าเปลี่ยนตารางแล้วผลเปลี่ยนตาม
   ========================================================================== */
'use strict';
var T = require('../lib/tiny-test.js');
var F = require('../lib/fixtures.js');
var group = T.group, test = T.test, x = T.expect;

group('04 · ตารางอำนาจอนุมัติ (APV-01)', function () {

  test('APV-01', 'ตารางอำนาจครอบคลุมทุกเรื่องที่ต้องอนุมัติ และมีผู้อนุมัติหลักทุกแถว', function () {
    var SS = F.boot();
    var subjects = SS.store.get().authority.map(function (a) { return a.subject; });
    ['leave', 'leave-cancel', 'checkin-edit', 'comp-day', 'allowance',
     'pay-close', 'checkin-exempt', 'leave-quota', 'role-change'].forEach(function (s) {
      x.ok(subjects.indexOf(s) >= 0, 'ตารางอำนาจต้องมีเรื่อง ' + s);
    });
    SS.store.get().authority.forEach(function (a) {
      x.ok(a.primary, 'แถว ' + a.subject + ' ต้องระบุผู้อนุมัติหลัก');
      x.ok(a.name, 'แถว ' + a.subject + ' ต้องมีชื่อเรื่องที่คนอ่านรู้เรื่อง');
    });
  });

  test('APV-01', 'เปลี่ยนตารางอำนาจแล้วเส้นทางเปลี่ยนตาม ไม่มีเงื่อนไขซ้ำซ่อนอยู่ในเมนู', function () {
    var SS = F.boot();
    x.eq(SS.core.approverOf(F.EMP.staff, 'leave').approver.id, F.EMP.mgrA, 'ตั้งต้นไปที่หัวหน้างาน');
    SS.store.get().authority.filter(function (a) { return a.subject === 'leave'; })[0].primary = 'exec';
    x.eq(SS.core.approverOf(F.EMP.staff, 'leave').approver.id, F.EMP.exec, 'แก้ตารางแล้วขึ้นผู้บริหารทันที');
  });

  test('APV-05', 'เรื่องเบี้ยเลี้ยงไปที่ฝ่ายบุคคล ไม่ผ่านหัวหน้างาน', function () {
    var SS = F.boot();
    var route = SS.core.approverOf(F.EMP.staff, 'allowance');
    x.eq(route.approver.role, 'hr', 'ผู้อนุมัติต้องเป็นฝ่ายบุคคล');
    x.eq(SS.core.approverOf(F.EMP.staff, 'allowance').approver.id === F.EMP.mgrA, false,
         'ต้องไม่ใช่หัวหน้างานของผู้ยื่น');
  });

  test('APV-11', 'เรื่องที่กระทบทั้งบริษัทขึ้นผู้บริหาร ไม่ใช่แอดมิน', function () {
    var SS = F.boot();
    ['allowance-rate', 'checkin-exempt', 'leave-quota', 'role-change', 'calendar-year'].forEach(function (s) {
      var row = SS.store.get().authority.filter(function (a) { return a.subject === s; })[0];
      x.eq(row.primary, 'exec', s + ' ต้องขึ้นผู้บริหาร');
    });
  });
});

group('04 · เส้นทางจริงของใบลา (APV-02 · APV-03 · J4)', function () {

  test('APV-02', 'ใบลาของพนักงานไปที่หัวหน้างานของตัวเอง', function () {
    var SS = F.boot();
    var route = SS.core.approverOf(F.EMP.staff, 'leave');
    x.eq(route.approver.id, F.EMP.mgrA);
  });

  test('APV-02', 'หัวหน้าลาอยู่ ใบลาของลูกทีมไปที่ผู้อนุมัติสำรอง', function () {
    var SS = F.boot();
    SS.store.get().leaves.push({
      id: 'LV-TEST-MGR', empId: F.EMP.mgrA, type: 'LT-ANNUAL',
      from: F.TODAY, to: F.TODAY, status: 'approved', halfDay: null, reason: 'พักผ่อน'
    });
    var route = SS.core.approverOf(F.EMP.staff, 'leave');
    x.eq(route.approver.id, F.EMP.mgrB, 'ต้องตกไปที่ผู้สำรอง');
    x.eq(route.onBehalf.id, F.EMP.mgrA, 'ต้องบอกว่ารับแทนใคร');
  });

  test('J4', 'หัวหน้าลาและไม่ได้ตั้งผู้สำรองไว้ ใบลาตกมาที่ฝ่ายบุคคล ไม่ใช่ค้างเงียบ', function () {
    var SS = F.boot();
    SS.store.employee(F.EMP.staff).backupApproverId = null;
    SS.store.get().leaves.push({
      id: 'LV-TEST-MGR2', empId: F.EMP.mgrA, type: 'LT-ANNUAL',
      from: F.TODAY, to: F.TODAY, status: 'approved', halfDay: null, reason: 'พักผ่อน'
    });
    var route = SS.core.approverOf(F.EMP.staff, 'leave');
    x.eq(route.approver.role, 'hr');
    x.ok(route.fallback, 'ต้องบอกว่าเป็นเส้นทางสำรอง');
  });

  test('J4', 'พนักงานที่ยังไม่ได้ผูกหัวหน้างาน ใบลาตกมาที่ฝ่ายบุคคล', function () {
    var SS = F.boot();
    SS.store.employee(F.EMP.staff).managerId = null;
    var route = SS.core.approverOf(F.EMP.staff, 'leave');
    x.eq(route.approver.role, 'hr');
    x.ok(route.fallback);
    x.has(route.why, 'ไม่มีหัวหน้างาน');
  });

  test('APV-03', 'หัวหน้างานยื่นใบลาเอง ไม่อยู่ในคิวตัวเอง แต่ขึ้นไปที่ผู้บริหาร', function () {
    var SS = F.boot();
    var route = SS.core.approverOf(F.EMP.mgrA, 'leave');
    x.eq(route.approver.role, 'exec');
    x.eq(route.approver.id === F.EMP.mgrA, false, 'ห้ามอนุมัติของตัวเอง');
    x.ok(route.escalated);
  });

  test('APV-03', 'เรื่องของฝ่ายบุคคลเอง ขึ้นผู้บริหาร ไม่วนกลับหาตัวเอง', function () {
    var SS = F.boot();
    var route = SS.core.approverOf(F.EMP.hr, 'allowance');
    x.eq(route.approver.role, 'exec');
    x.ok(route.escalated);
  });

  test('APV-03', 'เรื่องที่ผ่านหัวหน้างานหรือฝ่ายบุคคล ผู้อนุมัติต้องไม่ใช่ผู้ยื่นเอง', function () {
    var SS = F.boot();
    var subjects = SS.store.get().authority
      .filter(function (a) { return a.primary !== 'exec'; })
      .map(function (a) { return a.subject; });
    SS.store.get().employees.forEach(function (e) {
      subjects.forEach(function (s) {
        var route = SS.core.approverOf(e.id, s);
        if (route.approver) x.eq(route.approver.id === e.id, false,
          'เรื่อง ' + s + ' ของ ' + e.id + ' วนกลับไปหาตัวเอง');
      });
    });
  });

  T.known('APV-03',
    'เรื่องที่ขึ้นผู้บริหาร เมื่อผู้ยื่นคือผู้บริหารเอง ระบบยังส่งกลับไปหาตัวเอง',
    'ในทะเบียนมีผู้บริหารคนเดียว จึงยังไม่มีคำตอบว่า "ใครอนุมัติเรื่องของผู้บริหาร" — ' +
    'เป็นข้อที่ต้องให้บริษัทตัดสิน (ตั้งผู้บริหารคนที่สอง · ให้ฝ่ายบุคคลรับ · หรือรับทราบว่าอนุมัติเองได้) ' +
    'ยังไม่ควรให้ Claude Code เลือกแทน · เห็นชัดที่เรื่อง allowance-adj / checkin-exempt / leave-quota / role-change / calendar-year',
    function () {
      var SS = F.boot();
      var subjects = SS.store.get().authority
        .filter(function (a) { return a.primary === 'exec'; })
        .map(function (a) { return a.subject; });
      subjects.forEach(function (s) {
        var route = SS.core.approverOf(F.EMP.exec, s);
        if (route.approver) x.eq(route.approver.id === F.EMP.exec, false,
          'เรื่อง ' + s + ' ของผู้บริหารเอง วนกลับไปหาตัวเอง');
      });
    });

  test('APV-02', 'ผู้สำรองที่ลาอยู่เหมือนกัน ต้องไม่ถูกส่งงานไปให้', function () {
    var SS = F.boot();
    [F.EMP.mgrA, F.EMP.mgrB].forEach(function (id, i) {
      SS.store.get().leaves.push({
        id: 'LV-TEST-BOTH-' + i, empId: id, type: 'LT-ANNUAL',
        from: F.TODAY, to: F.TODAY, status: 'approved', halfDay: null, reason: 'พักผ่อน'
      });
    });
    var route = SS.core.approverOf(F.EMP.staff, 'leave');
    x.eq(route.approver.role, 'hr', 'ทั้งคู่ลา ต้องตกมาที่ฝ่ายบุคคล');
  });
});

group('04 · การอนุมัติแทน และการบันทึกผู้ตัดสิน', function () {

  test('APV-02', 'ผู้สำรองอนุมัติแทน ระบบบันทึกว่าอนุมัติแทนใคร', function () {
    var SS = F.boot();
    F.clearLeaves(SS, F.EMP.staff);
    SS.store.get().leaves.push({
      id: 'LV-TEST-MGR3', empId: F.EMP.mgrA, type: 'LT-ANNUAL',
      from: F.TODAY, to: F.TODAY, status: 'approved', halfDay: null, reason: 'พักผ่อน'
    });
    var d1 = F.nextWorkingDay(SS, F.TODAY, 3);
    var r = SS.store.submitLeave({ empId: F.EMP.staff, type: 'LT-ANNUAL', from: d1, to: d1, reason: 'ธุระ' });
    x.ok(r.ok, JSON.stringify(r.check && r.check.issues));
    SS.store.setUser(F.EMP.mgrB);
    var lv = SS.store.decideLeave(r.leave.id, 'approved', 'อนุมัติแทน');
    x.eq(lv.approverId, F.EMP.mgrB);
    x.eq(lv.onBehalfOf, F.EMP.mgrA, 'ต้องรู้ว่าอนุมัติแทนหัวหน้าคนไหน');
  });

  test('APV-13', 'ทุกการตัดสินมี audit log ที่บอกได้ว่าใคร เมื่อไร ทำอะไร', function () {
    var SS = F.boot();
    var n = SS.store.get().audit.length;
    F.clearLeaves(SS, F.EMP.staff2);
    var d1 = F.nextWorkingDay(SS, F.TODAY, 2);
    var r = SS.store.submitLeave({ empId: F.EMP.staff2, type: 'LT-PERSONAL', from: d1, to: d1, reason: 'ธุระ' });
    SS.store.setUser(F.EMP.mgrA);
    SS.store.decideLeave(r.leave.id, 'rejected', 'งานเร่ง');
    var log = SS.store.get().audit;
    x.ok(log.length > n, 'ต้องมีรายการเพิ่ม');
    var last = log[0].at ? log[0] : log[log.length - 1];
    x.ok(last.at && last.by && last.action, 'ทุกรายการต้องมี ใคร/เมื่อไร/ทำอะไร');
  });
});
