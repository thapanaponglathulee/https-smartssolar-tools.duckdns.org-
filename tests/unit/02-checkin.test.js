/* ==========================================================================
   02 · เช็คอิน · ดรอปดาวน์ · สถานะรายวัน
   ครอบคลุม CI-05 CI-06 CI-07 CI-08 CI-10 CI-11 CI-13 CI-14 CI-15 CI-16
             CI-18 CI-19 CI-20 CI-25 CI-26 CI-28 · DSH-02 · DSH-03
   ========================================================================== */
'use strict';
var T = require('../lib/tiny-test.js');
var F = require('../lib/fixtures.js');
var group = T.group, test = T.test, x = T.expect;

/* ฉากมาตรฐาน: ธนากร (งานหน้าไซต์) เช็คอินวันนี้ที่ไซต์ CRR */
function checkinToday(SS, empId, over) {
  var data = {
    empId: empId, jobType: 'onsite', projectId: 'PRJ-CRR', travelType: 'onsite',
    detail: 'ติดตั้งแผงโซลาร์โซน A'
  };
  Object.keys(over || {}).forEach(function (k) { data[k] = over[k]; });
  return SS.store.checkIn(data);
}

group('02 · ดรอปดาวน์ประเภทงานและไซต์', function () {

  test('CI-16', 'ซ่อมบำรุงเห็นโครงการที่เสร็จสิ้นแล้ว แต่งานหน้าไซต์ต้องไม่เห็น', function () {
    var SS = F.boot();
    var om = SS.core.sitesFor('om').map(function (p) { return p.id; });
    var onsite = SS.core.sitesFor('onsite').map(function (p) { return p.id; });
    x.ok(om.indexOf('PRJ-HYS') >= 0, 'ซ่อมบำรุงต้องเห็น HYS ที่ส่งมอบแล้ว');
    x.ok(om.indexOf('PRJ-CRR') >= 0, 'ซ่อมบำรุงต้องเห็นโครงการที่กำลังดำเนินการด้วย');
    x.eq(onsite.indexOf('PRJ-HYS'), -1, 'งานหน้าไซต์ต้องไม่เห็นโครงการที่ส่งมอบแล้ว');
  });

  test('CI-16', 'สำรวจเห็นเฉพาะโครงการสถานะแผนงาน และเปิดให้พิมพ์สถานที่อื่นได้', function () {
    var SS = F.boot();
    var survey = SS.core.sitesFor('survey');
    x.ok(survey.length > 0, 'ต้องมีโครงการสถานะแผนงาน');
    x.ok(survey.every(function (p) { return p.status === 'plan'; }), 'ต้องมีแต่สถานะแผนงาน');
    x.ok(SS.jobType('survey').otherPlace, 'CI-17 · สำรวจต้องมีตัวเลือกสถานที่อื่น');
    x.no(SS.jobType('onsite').otherPlace, 'งานหน้าไซต์ไม่มีสถานที่อื่น');
  });

  test('CI-15', 'ลิสต์ไซต์มีแต่ชื่อสถานที่ ไม่มีชื่อประเภทงานปนอยู่', function () {
    var SS = F.boot();
    var names = SS.store.get().projects.map(function (p) { return p.name + ' ' + p.code; }).join(' | ');
    ['งาน O&M', 'งาน Survey', 'Office Store'].forEach(function (bad) {
      x.hasNot(names, bad, 'ชื่อประเภทงานหลุดเข้ามาในทะเบียนไซต์');
    });
  });

  test('CI-15', 'ประเภทงานที่เลิกใช้ถูกปิดการใช้งาน ไม่ถูกลบทิ้ง', function () {
    var SS = F.boot();
    var lg = SS.jobType('logistic');
    x.ok(lg, 'Logistic/Store ต้องยังอยู่ในทะเบียน (ข้อมูลเก่ายังอ้างถึง)');
    x.no(lg.enabled, 'แต่ต้องถูกปิดการใช้งาน');
  });

  test('CI-20', 'ประจำออฟฟิศไม่ต้องเลือกไซต์และไม่ต้องเลือกลักษณะการไป', function () {
    var SS = F.boot();
    x.no(SS.jobType('office').requireSite, 'ไม่ต้องเลือกไซต์');
    x.len(SS.core.sitesFor('office'), 0, 'ลิสต์ไซต์ต้องว่าง');
    x.len(SS.core.travelsFor('office'), 0, 'ลิสต์ลักษณะการไปต้องว่าง (ล็อกตาย)');
  });

  test('CI-18', 'งานหน้าไซต์เลือก "ประจำออฟฟิศ" ไม่ได้ (UAT FB-2)', function () {
    var SS = F.boot();
    ['onsite', 'om', 'survey'].forEach(function (j) {
      var ids = SS.core.travelsFor(j).map(function (t) { return t.id; });
      x.eq(ids.indexOf('office'), -1, j + ' ต้องไม่มีตัวเลือกประจำออฟฟิศ');
      x.ok(ids.length > 0, j + ' ต้องมีตัวเลือกให้เลือก');
    });
  });

  test('CI-19', 'ตัวเลือก "อยู่หน้างานนอกเวลา" เป็นตัวบวก ไม่ใช่ตัวเลือกแทน จึงไม่โผล่ในดรอปดาวน์', function () {
    var SS = F.boot();
    x.ok(SS.travelType('overtime').additive, 'ต้องเป็นตัวบวก');
    x.ok(SS.travelType('night').replacesAll, 'กะกลางคืนต้องทับค่าอื่นทั้งหมด');
    ['onsite', 'om', 'survey'].forEach(function (j) {
      var ids = SS.core.travelsFor(j).map(function (t) { return t.id; });
      x.eq(ids.indexOf('overtime'), -1, 'ตัวบวกต้องไม่อยู่ในดรอปดาวน์ของ ' + j);
    });
  });

  test('CI-18', 'ค่าตั้งต้นของลักษณะการไปมาจากประเภทงาน · กะกลางคืนทับเสมอ', function () {
    var SS = F.boot();
    x.eq(SS.core.defaultTravelFor(F.EMP.staff, 'onsite'), 'onsite');
    x.eq(SS.core.defaultTravelFor(F.EMP.staff, 'om'), 'daytrip');
    x.eq(SS.core.defaultTravelFor(F.EMP.staff, 'office'), 'office');
    x.eq(SS.core.defaultTravelFor(F.EMP.night, 'office'), 'night', 'พนักงานกะกลางคืนได้ค่าตั้งต้นเป็นกะกลางคืนเสมอ');
  });
});

group('02 · ธงเปลี่ยนจำนวนมื้อ (CI-18 ฉบับ 8 ก.ย. 2569)', function () {

  test('CI-18', 'สลับระหว่างแบบที่ให้ 1 มื้อเท่ากัน ไม่ขึ้นธง', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff, { jobType: 'om', projectId: 'PRJ-HYS', travelType: 'am' });
    x.ok(r.ok, r.msg);
    x.eq(SS.core.mealFlag(r.rec), null, 'ซ่อมบำรุง (ตั้งต้น 1 มื้อ) เปลี่ยนเป็นไปเช้า-บ่ายกลับ (1 มื้อ) ต้องไม่ขึ้นธง');
  });

  test('CI-18', 'เปลี่ยนจาก 1 มื้อเป็น 3 มื้อ ต้องขึ้นธงให้หัวหน้าเห็น', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff, { jobType: 'om', projectId: 'PRJ-HYS', travelType: 'onsite' });
    var flag = SS.core.mealFlag(r.rec);
    x.ok(flag, 'ต้องขึ้นธง');
    x.eq(flag.from, 1, 'มื้อตั้งต้น');
    x.eq(flag.to, 3, 'มื้อที่เลือกจริง');
  });

  test('CI-18', 'ไม่มีช่องเหตุผลติดมากับรายการเช็คอินอีกแล้ว (ตัดออก 8 ก.ย. 2569)', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    x.eq(r.rec.travelReason, undefined, 'รายการใหม่ต้องไม่มีฟิลด์ travelReason');
  });

  test('CI-18', 'ธงคำนวณตอนอ่าน — แก้ตารางกลางแล้วธงเปลี่ยนตามทันที', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff, { jobType: 'om', projectId: 'PRJ-HYS', travelType: 'onsite' });
    x.ok(SS.core.mealFlag(r.rec), 'ตอนแรกขึ้นธง');
    SS.jobType('om').defaultTravel = 'onsite';           /* แอดมินแก้ค่าตั้งต้นของประเภทงาน */
    x.eq(SS.core.mealFlag(r.rec), null, 'เมื่อค่าตั้งต้นตรงกับที่เลือกแล้ว ธงต้องหายไปเอง');
  });
});

group('02 · การกดเช็คอิน', function () {

  test('CI-05', 'เช็คอินซ้ำวันเดียวกันไม่ได้', function () {
    var SS = F.boot();
    x.ok(checkinToday(SS, F.EMP.staff).ok);
    var second = checkinToday(SS, F.EMP.staff);
    x.no(second.ok, 'ครั้งที่สองต้องถูกปฏิเสธ');
    x.has(second.msg, 'ลงเวลาไปแล้ว');
  });

  test('CI-11', 'ระบบจำค่าที่เลือกครั้งก่อนไว้ให้ตั้งต้นครั้งถัดไป', function () {
    var SS = F.boot();
    checkinToday(SS, F.EMP.staff, { projectId: 'PRJ-MVP', travelType: 'daytrip' });
    var last = SS.store.lastChoice(F.EMP.staff);
    x.eq(last.projectId, 'PRJ-MVP');
    x.eq(last.travelType, 'daytrip');
    x.eq(last.jobType, 'onsite');
  });

  test('CI-13', 'กะกลางคืนเทียบเวลาเริ่มกะ ไม่ใช่ 08:30', function () {
    var SS = F.boot();
    F.freezeNow(SS, '20:05');
    F.clearCheckins(SS, F.EMP.night, F.TODAY);
    var r = checkinToday(SS, F.EMP.night, { jobType: 'office', projectId: null, travelType: 'night' });
    x.ok(r.ok, r.msg);
    /* ถ้าเทียบกับ 08:30 จะกลายเป็นสาย 695 นาที — ต้องเทียบกับ 20:00 จึงเหลือ 5 นาที
       หมายเหตุ: รายการ UAT เขียนว่า 20:05 "ไม่สาย" ซึ่งจะจริงก็ต่อเมื่อค่าผ่อนผัน > 0
       ค่าผ่อนผัน (graceMinutes) ยังไม่เคาะ — ดู DSH-02 ในเทสต์ถัดไป */
    x.eq(SS.core.lateMinutes(r.rec), 5, 'เทียบกับเวลาเริ่มกะ 20:00');
    F.setParams(SS, { graceMinutes: 15 });
    x.eq(SS.core.lateMinutes(r.rec), 0, 'ตั้งผ่อนผัน 15 นาทีแล้วต้องไม่สาย');
  });

  test('CI-13', 'กะกลางคืนที่เช็คอินหลังเที่ยงคืน ยังเป็นกะเดิม ไม่ถือว่าสายทั้งวัน', function () {
    var SS = F.boot();
    F.freezeNow(SS, '00:30');
    F.clearCheckins(SS, F.EMP.night, F.TODAY);
    var r = checkinToday(SS, F.EMP.night, { jobType: 'office', projectId: null, travelType: 'night' });
    x.eq(SS.core.lateMinutes(r.rec), 0, 'ห้ามคิดเป็นสาย 270 นาที');
  });

  test('CI-13', 'กะกลางวันเข้า 08:45 ถือว่าสาย 15 นาที', function () {
    var SS = F.boot();
    F.freezeNow(SS, '08:45');
    var r = checkinToday(SS, F.EMP.staff);
    x.eq(SS.core.lateMinutes(r.rec), 15);
  });

  test('DSH-02', 'เปลี่ยนค่าผ่อนผันที่หน้าตั้งค่า แล้วสถานะมาสายย้อนหลังคำนวณใหม่ตาม', function () {
    var SS = F.boot();
    F.freezeNow(SS, '08:45');
    var r = checkinToday(SS, F.EMP.staff);
    x.eq(SS.core.lateMinutes(r.rec), 15, 'ก่อนแก้ค่า');
    F.setParams(SS, { graceMinutes: 30 });
    x.eq(SS.core.lateMinutes(r.rec), 0, 'ผ่อนผัน 30 นาทีแล้วต้องไม่สาย โดยไม่ต้องแก้ข้อมูลเก่า');
  });

  test('CI-08', 'เช็คอินในวันที่ปฏิทินระบุว่าหยุด ต้องเกิดคำขอวันชดเชยเข้าคิว', function () {
    var SS = F.boot();
    F.setDayType(SS, F.TODAY, 'holiday');
    var r = checkinToday(SS, F.EMP.staff);
    x.ok(r.ok, r.msg);
    x.ok(r.comp, 'ต้องมีคำขอวันชดเชย');
    x.eq(r.comp.status, 'pending', 'ต้องรออนุมัติ ไม่ใช่ให้เลย');
    x.eq(r.comp.days, SS.store.get().params.holidayCompRate, 'จำนวนวันต้องมาจากค่าตั้งค่า');
  });

  test('CI-08', 'อนุมัติวันชดเชยแล้ว ยอดถังเพิ่มขึ้นและใช้ลาชดเชยได้จริง', function () {
    var SS = F.boot();
    F.setDayType(SS, F.TODAY, 'holiday');
    var before = SS.core.quota(F.EMP.staff, 'LT-COMP').total;
    var r = checkinToday(SS, F.EMP.staff);
    SS.store.setUser(F.EMP.mgrA);
    SS.store.decideComp(r.comp.id, 'approved', 'ทำงานวันหยุดจริง');
    var after = SS.core.quota(F.EMP.staff, 'LT-COMP').total;
    x.eq(after, before + 1, 'ยอดลาชดเชยต้องเพิ่ม 1 วัน');
    var bucket = SS.core.buckets(F.EMP.staff).filter(function (b) { return b.key === 'comp-2026'; })[0];
    x.ok(bucket, 'ต้องมีถังลาชดเชยของปีนี้');
    x.eq(bucket.expiry, '2027-12-31', 'พร้อมวันหมดอายุตามกติกา');
  });

  test('CI-08', 'เช็คอินวันทำงานปกติ ต้องไม่เกิดวันชดเชย', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    x.eq(r.comp, null, 'วันทำงานปกติต้องไม่แถมวันชดเชย');
  });

  test('CI-10', 'ชั่วโมง OT สะสมแล้วแปลงเป็นวัน เศษยกไป ไม่ปัดทิ้ง', function () {
    var SS = F.boot();
    var b = SS.store.get().balances[F.EMP.staff];
    var compBefore = b.comp[2026] || 0;
    SS.store.setUser(F.EMP.staff);
    var ot1 = SS.store.submitOT({ empId: F.EMP.staff, date: F.TODAY, start: '18:00', end: '23:00', reason: 'เร่งงานติดตั้ง' });
    x.eq(ot1.hours, 5);
    SS.store.setUser(F.EMP.mgrA);
    SS.store.decideOT(ot1.id, 'approved');
    x.eq(b.otCarry, 5, 'ยังไม่ครบ 8 ชม. จึงยังไม่ได้วัน');
    x.eq(b.comp[2026] || 0, compBefore, 'ยอดวันชดเชยยังไม่เปลี่ยน');
    var ot2 = SS.store.submitOT({ empId: F.EMP.staff, date: F.TODAY, start: '18:00', end: '22:00', reason: 'เร่งงานติดตั้ง' });
    SS.store.decideOT(ot2.id, 'approved');
    x.eq(b.comp[2026] || 0, compBefore + 1, 'ครบ 8 ชม. ได้ 1 วัน');
    x.eq(b.otCarry, 1, 'เศษ 1 ชม. ต้องยกไป ไม่ปัดทิ้ง');
  });

  test('CI-10', 'จำนวนชั่วโมงต่อวันมาจากหน้าตั้งค่า ไม่ใช่ค่าตายในโค้ด', function () {
    var SS = F.boot();
    F.setParams(SS, { otHoursPerDay: 4 });
    var b = SS.store.get().balances[F.EMP.staff];
    var before = b.comp[2026] || 0;
    var ot = SS.store.submitOT({ empId: F.EMP.staff, date: F.TODAY, start: '18:00', end: '22:00', reason: 'งานด่วน' });
    SS.store.setUser(F.EMP.mgrA);
    SS.store.decideOT(ot.id, 'approved');
    x.eq(b.comp[2026] || 0, before + 1, '4 ชม. ได้ 1 วัน เมื่อตั้งค่าเป็น 4');
  });

  test('CI-10', 'OT ที่ยังไม่อนุมัติ ต้องไม่เพิ่มยอดให้ใคร', function () {
    var SS = F.boot();
    var b = SS.store.get().balances[F.EMP.staff];
    var before = JSON.stringify(b);
    SS.store.submitOT({ empId: F.EMP.staff, date: F.TODAY, start: '18:00', end: '23:00', reason: 'x' });
    x.eq(JSON.stringify(b), before, 'ยอดต้องไม่ขยับจนกว่าจะอนุมัติ');
  });
});

group('02 · แก้ไขและยกเลิกเช็คอิน (CI-06)', function () {

  test('CI-06', 'แก้รายการของวันนี้ภายในเวลาที่ตั้งไว้ บันทึกได้ทันที ไม่ต้องอนุมัติ', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    var res = SS.store.editCheckin(r.rec.id, { projectId: 'PRJ-MVP' }, '');
    x.ok(res.ok);
    x.no(res.needApproval, 'ในวันเดียวกันไม่ต้องผ่านหัวหน้า');
    x.eq(SS.core.checkinOf(F.EMP.staff, F.TODAY).projectId, 'PRJ-MVP');
  });

  test('CI-06', 'แก้รายการที่เลยหน้าต่างเวลา ต้องเข้าคิวให้หัวหน้าอนุมัติ', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    F.setParams(SS, { selfEditHours: 0 });
    F.freezeNow(SS, '17:00');
    var res = SS.store.editCheckin(r.rec.id, { projectId: 'PRJ-MVP' }, 'จำไซต์ผิด');
    x.ok(res.ok);
    x.ok(res.needApproval, 'ต้องเข้าคิวอนุมัติ');
    x.eq(res.req.status, 'pending');
    x.eq(SS.core.checkinOf(F.EMP.staff, F.TODAY).projectId, 'PRJ-CRR', 'ค่ายังไม่เปลี่ยนจนกว่าจะอนุมัติ');
    SS.store.setUser(F.EMP.mgrA);
    SS.store.decideEditRequest(res.req.id, 'approved', 'ตรวจแล้ว');
    x.eq(SS.core.checkinOf(F.EMP.staff, F.TODAY).projectId, 'PRJ-MVP', 'อนุมัติแล้วค่าถึงเปลี่ยน');
  });

  test('CI-06', 'ทุกการแก้ไขถูกบันทึกไว้ว่าใครแก้ จากค่าอะไรเป็นค่าอะไร', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    SS.store.editCheckin(r.rec.id, { projectId: 'PRJ-MVP' }, 'แก้ไซต์');
    var c = SS.core.checkinOf(F.EMP.staff, F.TODAY);
    x.eq(c.editLog.length, 1, 'ต้องนับจำนวนครั้งที่แก้ได้');
    x.eq(c.editLog[0].before.projectId, 'PRJ-CRR');
    x.eq(c.editLog[0].after.projectId, 'PRJ-MVP');
    x.ok(c.editLog[0].by, 'ต้องรู้ว่าใครแก้');
    var audit = SS.store.get().audit.filter(function (a) { return a.action === 'แก้ไขเช็คอิน'; });
    x.ok(audit.length > 0, 'ต้องมี audit log');
  });

  test('CI-06', 'ยกเลิกเช็คอินใช้การทำเครื่องหมาย ไม่ใช่ลบแถวทิ้ง', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    var n = SS.store.get().checkins.length;
    SS.store.cancelCheckin(r.rec.id, 'ลงผิดวัน');
    x.eq(SS.store.get().checkins.length, n, 'จำนวนแถวต้องเท่าเดิม');
    x.eq(SS.store.get().checkins.filter(function (c) { return c.id === r.rec.id; })[0].status, 'cancelled');
    x.eq(SS.core.checkinOf(F.EMP.staff, F.TODAY), null, 'แต่ไม่ถูกนับเป็นเช็คอินของวันนั้นแล้ว');
  });
});

group('02 · สถานะรายวัน (CI-14)', function () {

  test('CI-14', 'ทุกวันมีสถานะเสมอ ไม่มีวันว่างเปล่า', function () {
    var SS = F.boot();
    var d = SS.d.add(F.TODAY, -30);
    var blank = [];
    while (d <= F.TODAY) {
      var st = SS.core.dayStatus(F.EMP.staff, d);
      if (!st || !st.status) blank.push(d);
      d = SS.d.add(d, 1);
    }
    x.len(blank, 0, 'วันที่ไม่มีสถานะ');
  });

  test('CI-14', 'ลำดับการตัดสิน: เช็คอินชนะใบลาที่อนุมัติแล้ว', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    x.eq(SS.core.dayStatus(F.EMP.staff, F.TODAY).status, 'work');
    x.ok(r.ok);
  });

  test('CI-14', 'ใบลารออนุมัติที่เลยวันลาไปแล้ว ขึ้น "รอตรวจสอบ" ไม่ใช่ "ขาดงาน"', function () {
    var SS = F.boot();
    var past = SS.d.add(F.TODAY, -3);
    F.clearCheckins(SS, F.EMP.staff2, past);
    SS.store.get().leaves.push({
      id: 'LV-TEST-1', empId: F.EMP.staff2, type: 'LT-PERSONAL', from: past, to: past,
      status: 'pending', reason: 'ธุระ', halfDay: null
    });
    x.eq(SS.core.dayStatus(F.EMP.staff2, past).status, 'review');
  });

  test('CI-14', 'ใบลารออนุมัติของวันข้างหน้า ขึ้น "รออนุมัติลา"', function () {
    var SS = F.boot();
    var future = F.nextWorkingDay(SS, F.TODAY, 2);
    F.clearCheckins(SS, F.EMP.staff2, future);
    SS.store.get().leaves.push({
      id: 'LV-TEST-2', empId: F.EMP.staff2, type: 'LT-PERSONAL', from: future, to: future,
      status: 'pending', reason: 'ธุระ', halfDay: null
    });
    x.eq(SS.core.dayStatus(F.EMP.staff2, future).status, 'pending');
  });

  test('CI-14', 'ใบลาถูกปฏิเสธหลังวันลาผ่านไปแล้ว วันนั้นเป็นขาดงาน พร้อมระบุสาเหตุ', function () {
    var SS = F.boot();
    var past = F.prevWorkingDay(SS, F.TODAY, 1);
    F.clearCheckins(SS, F.EMP.staff2, past);
    SS.store.get().leaves.push({
      id: 'LV-TEST-3', empId: F.EMP.staff2, type: 'LT-PERSONAL', from: past, to: past,
      status: 'rejected', reason: 'ธุระ', halfDay: null
    });
    var st = SS.core.dayStatus(F.EMP.staff2, past);
    x.eq(st.status, 'absent');
    x.eq(st.cause, 'rejected', 'ต้องบอกสาเหตุว่าถูกปฏิเสธแล้วยังไม่มา');
    x.ok(SS.ABSENT_CAUSE[st.cause], 'สาเหตุต้องมีคำอธิบายในทะเบียนกลาง');
  });

  test('CI-14', 'ระหว่างวันยังไม่ตัดสินว่าขาดงาน — ติดธง "ยังไม่เช็คอิน" จนเลยเวลาเลิกงาน', function () {
    var SS = F.boot({ now: '10:00' });
    F.clearCheckins(SS, F.EMP.staff2, F.TODAY);
    F.clearLeaves(SS, F.EMP.staff2);
    var st = SS.core.dayStatus(F.EMP.staff2, F.TODAY);
    x.eq(st.status, 'absent');
    x.ok(st.notYet, 'ก่อนเลิกงานต้องยังไม่ฟันธงว่าขาด');
    F.freezeNow(SS, '18:00');
    x.no(SS.core.dayStatus(F.EMP.staff2, F.TODAY).notYet, 'หลังเลิกงานถึงฟันธง');
  });

  test('CI-07 DSH-03', 'คนที่ถูกยกเว้นการเช็คอิน ไม่ถูกนับว่าขาดงาน', function () {
    var SS = F.boot({ now: '18:00' });
    var emp = SS.store.employee(F.EMP.staff2);
    F.clearCheckins(SS, F.EMP.staff2, F.TODAY);
    F.clearLeaves(SS, F.EMP.staff2);
    x.eq(SS.core.dayStatus(F.EMP.staff2, F.TODAY).status, 'absent', 'ก่อนตั้งยกเว้น');
    emp.exemptCheckin = true;
    x.eq(SS.core.dayStatus(F.EMP.staff2, F.TODAY).status, 'exempt', 'หลังตั้งยกเว้น');
  });

  test('DSH-03', 'บัญชีทดสอบไม่ถูกนับในตัวหารของ Dashboard', function () {
    var SS = F.boot();
    var counted = SS.store.counted().map(function (e) { return e.id; });
    x.eq(counted.indexOf(F.EMP.test), -1, 'บัญชีทดสอบต้องไม่อยู่ในตัวหาร');
    x.ok(SS.store.employee(F.EMP.test).isTest, 'แต่ยังอยู่ในทะเบียนและถูกทำเครื่องหมายว่าเป็นบัญชีทดสอบ');
  });

  test('CI-14', 'วันหยุดตามปฏิทินที่ไม่มีใบลา ขึ้นสถานะวันหยุด ไม่ใช่ขาดงาน', function () {
    var SS = F.boot();
    var hol = SS.d.add(F.TODAY, -1);
    F.setDayType(SS, hol, 'holiday');
    F.clearCheckins(SS, F.EMP.staff2, hol);
    x.eq(SS.core.dayStatus(F.EMP.staff2, hol).status, 'holiday');
  });
});

group('02 · แวะไซต์เพิ่ม (CI-25)', function () {

  test('CI-25', 'แวะไซต์เพิ่มได้หลังเช็คอินแล้ว และไม่เพิ่มจำนวนมื้อ', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    var before = SS.core.allowanceOf(r.rec).meals;
    var v = SS.store.addVisit(r.rec.id, { projectId: 'PRJ-MVP', detail: 'ตรวจอินเวอร์เตอร์' });
    x.ok(v.ok, v.msg);
    x.eq(SS.core.allowanceOf(SS.core.checkinOf(F.EMP.staff, F.TODAY)).meals, before, 'จำนวนมื้อต้องไม่เปลี่ยน');
  });

  test('CI-25', 'คน-วัน 1.0 ยกให้ไซต์หลักเสมอ ไซต์ที่แวะนับเป็นจำนวนครั้ง', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    SS.store.addVisit(r.rec.id, { projectId: 'PRJ-MVP', detail: 'ตรวจอินเวอร์เตอร์' });
    var md = SS.core.manDay(SS.core.checkinOf(F.EMP.staff, F.TODAY));
    x.eq(md.manDays, 1.0, 'ห้ามนับ 1 คน-วันให้ทุกไซต์');
    x.eq(md.mainSite, 'PRJ-CRR');
    x.len(md.visits, 1);
    x.eq(md.visits[0].entries, 1);
  });

  test('CI-25', 'ไม่เลือกไซต์ ไม่กรอกงานที่ทำ ไซต์ซ้ำ หรือไซต์เดียวกับไซต์หลัก บันทึกไม่ได้', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    x.no(SS.store.addVisit(r.rec.id, { detail: 'x' }).ok, 'ไม่เลือกไซต์');
    x.no(SS.store.addVisit(r.rec.id, { projectId: 'PRJ-MVP', detail: '  ' }).ok, 'ไม่กรอกงานที่ทำ');
    x.no(SS.store.addVisit(r.rec.id, { projectId: 'PRJ-CRR', detail: 'x' }).ok, 'ไซต์เดียวกับไซต์หลัก');
    x.ok(SS.store.addVisit(r.rec.id, { projectId: 'PRJ-MVP', detail: 'x' }).ok);
    x.no(SS.store.addVisit(r.rec.id, { projectId: 'PRJ-MVP', detail: 'y' }).ok, 'ไซต์ที่แวะไปแล้ว');
  });

  test('CI-25', 'ตั้งจำนวนไซต์ที่แวะได้ต่อวันเป็น 0 → ปิดฟีเจอร์ทั้งปุ่ม', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    F.setParams(SS, { maxVisitsPerDay: 0 });
    var res = SS.store.addVisit(r.rec.id, { projectId: 'PRJ-MVP', detail: 'x' });
    x.no(res.ok);
    x.has(res.msg, 'ปิดการใช้งาน');
  });

  test('CI-25', 'แวะเกินเพดานที่ตั้งไว้ไม่ได้', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    F.setParams(SS, { maxVisitsPerDay: 2 });
    x.ok(SS.store.addVisit(r.rec.id, { projectId: 'PRJ-MVP', detail: 'a' }).ok);
    x.ok(SS.store.addVisit(r.rec.id, { projectId: 'PRJ-SWF', detail: 'b' }).ok);
    x.no(SS.store.addVisit(r.rec.id, { projectId: 'PRJ-TPC2', detail: 'c' }).ok, 'เกินเพดาน 2 ไซต์');
  });

  test('CI-25', 'ลบรายการแวะได้ แต่ audit log ยังเก็บไว้', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    var v = SS.store.addVisit(r.rec.id, { projectId: 'PRJ-MVP', detail: 'ตรวจงาน' });
    SS.store.removeVisit(r.rec.id, v.visit.id, 'ลงผิดไซต์');
    x.len(SS.core.checkinOf(F.EMP.staff, F.TODAY).visits, 0);
    var log = SS.store.get().audit.filter(function (a) { return a.action === 'ลบรายการแวะไซต์'; });
    x.ok(log.length > 0, 'ต้องมี audit log ของการลบ');
  });

  test('CI-25', 'ไซต์ที่แวะซึ่งควรได้มื้อมากกว่าไซต์หลัก ขึ้นธงให้หัวหน้า แต่ระบบไม่เปลี่ยนมื้อเอง', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff, { jobType: 'om', projectId: 'PRJ-HYS', travelType: 'daytrip' });
    SS.store.addVisit(r.rec.id, { projectId: 'PRJ-MVP', jobType: 'onsite', detail: 'ช่วยทีมติดตั้ง' });
    var ci = SS.core.checkinOf(F.EMP.staff, F.TODAY);
    var flag = SS.core.visitFlag(ci);
    x.ok(flag, 'ต้องขึ้นธง');
    x.eq(flag.from, 1);
    x.eq(flag.to, 3);
    x.eq(SS.core.allowanceOf(ci).meals, 1, 'แต่จำนวนมื้อจริงต้องยังเป็นของไซต์หลัก');
  });
});

group('02 · หยุดงานที่ไซต์ (CI-26)', function () {

  test('CI-26', 'ทะเบียนเหตุผลมีครบ 6 ข้อ และมีเพียงข้อเดียวที่พิมพ์เองได้', function () {
    var SS = F.boot();
    x.len(SS.store.get().stopReasons, 6);
    var free = SS.store.get().stopReasons.filter(function (r) { return r.free; });
    x.len(free, 1, 'พิมพ์อิสระได้เฉพาะ "เหตุอื่น"');
    x.eq(free[0].id, 'other');
  });

  test('CI-26', 'เลือกเหตุผลนอกทะเบียนไม่ได้ และ "เหตุอื่น" ต้องระบุเหตุ', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    x.no(SS.store.setSiteStop(r.rec.id, { reason: 'พิมพ์เอง' }).ok, 'เหตุผลนอกทะเบียน');
    x.no(SS.store.setSiteStop(r.rec.id, { reason: 'other', note: '  ' }).ok, 'เหตุอื่นแต่ไม่ระบุ');
    x.ok(SS.store.setSiteStop(r.rec.id, { reason: 'other', note: 'ลิฟต์เสีย ขึ้นดาดฟ้าไม่ได้', allDay: true }).ok);
  });

  test('CI-26', 'บันทึกแล้วสถานะรายวันเป็น "หยุดงานที่ไซต์" ไม่ใช่ทำงานและไม่ใช่ขาดงาน', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    SS.store.setSiteStop(r.rec.id, { reason: 'rain', allDay: true });
    var st = SS.core.dayStatus(F.EMP.staff, F.TODAY);
    x.eq(st.status, 'sitestop');
    var meta = SS.dayStatus('sitestop');
    x.ok(meta.countWork, 'ยังนับเป็นวันทำงาน');
    x.ok(meta.allowance, 'ยังได้เบี้ยเลี้ยง');
  });

  test('CI-26', 'หยุดงานที่ไซต์ยังได้มื้อเท่าเดิม และไม่ทำให้ขึ้นธงเปลี่ยนมื้อ', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    var before = SS.core.allowanceOf(r.rec).meals;
    SS.store.setSiteStop(r.rec.id, { reason: 'rain', from: '13:00' });
    var ci = SS.core.checkinOf(F.EMP.staff, F.TODAY);
    x.eq(SS.core.allowanceOf(ci).meals, before, 'จำนวนมื้อต้องไม่เปลี่ยน');
    x.eq(SS.core.mealFlag(ci), null, 'และต้องไม่ขึ้นธงเปลี่ยนมื้อ');
  });

  test('CI-26', 'ยกเลิกการหยุดงานที่ไซต์ได้ และมี audit log ทั้งตอนบันทึกและตอนยกเลิก', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff);
    SS.store.setSiteStop(r.rec.id, { reason: 'material', allDay: true });
    SS.store.clearSiteStop(r.rec.id, 'ของมาถึงตอนบ่าย');
    x.eq(SS.core.checkinOf(F.EMP.staff, F.TODAY).siteStop, null);
    var acts = SS.store.get().audit.map(function (a) { return a.action; });
    x.has(acts, 'บันทึกหยุดงานที่ไซต์');
    x.has(acts, 'ยกเลิกการหยุดงานที่ไซต์');
  });
});

group('02 · พิกัดที่ตั้ง (CI-28)', function () {

  test('CI-28', 'ไม่อนุญาตให้ใช้ตำแหน่ง ก็ยังเช็คอินได้ตามปกติ', function () {
    var SS = F.boot();
    var r = checkinToday(SS, F.EMP.staff, { geo: null });
    x.ok(r.ok, 'ห้ามบล็อกการเช็คอินเพราะไม่มีพิกัด');
    x.eq(r.rec.geo, null);
    x.eq(SS.core.distanceOf(r.rec), null, 'ไม่มีพิกัดก็ไม่ต้องคิดระยะ');
  });

  test('CI-28', 'มีพิกัดแล้วคิดระยะห่างจากไซต์เป็นเมตรได้', function () {
    var SS = F.boot();
    var pj = SS.project('PRJ-CRR');
    var r = checkinToday(SS, F.EMP.staff, { geo: { lat: pj.lat, lng: pj.lng } });
    x.eq(SS.core.distanceOf(r.rec), 0, 'ยืนที่พิกัดไซต์พอดี');
    var r2 = { empId: F.EMP.staff, projectId: 'PRJ-CRR', geo: { lat: pj.lat + 0.01, lng: pj.lng } };
    var d = SS.core.distanceOf(r2);
    x.ok(d > 1000 && d < 1200, 'ห่างจากไซต์ราว 1.1 กม. — ได้ ' + d + ' เมตร');
  });

  test('CI-28', 'ประกาศเรื่องพิกัดขึ้นครั้งเดียว และข้อความแก้ได้จากหน้าตั้งค่า', function () {
    var SS = F.boot();
    x.no(SS.store.geoNoticeSeen(), 'ครั้งแรกยังไม่เคยเห็น');
    SS.store.markGeoNotice();
    x.ok(SS.store.geoNoticeSeen(), 'เห็นแล้วต้องไม่ขึ้นอีก');
    x.ok(SS.store.get().params.geoNotice.length > 20, 'ข้อความประกาศต้องอยู่ในค่าตั้งค่า ไม่ใช่ในโค้ด');
  });

  test('CI-28', 'รัศมีที่ถือว่าอยู่หน้างานเป็นค่าตั้งค่า และห้ามใช้บล็อกการเช็คอิน', function () {
    var SS = F.boot();
    x.ok(SS.store.get().params.siteRadiusMeters > 0, 'ต้องมีค่ารัศมีให้ตั้ง');
    var pj = SS.project('PRJ-CRR');
    var r = checkinToday(SS, F.EMP.staff, { geo: { lat: pj.lat + 1, lng: pj.lng + 1 } });
    x.ok(r.ok, 'อยู่ไกลไซต์มากก็ต้องยังเช็คอินได้');
  });
});
