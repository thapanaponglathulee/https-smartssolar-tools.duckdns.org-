/* ==========================================================================
   seed.js — ข้อมูลจำลองสำหรับ UAT
   ⚠ ข้อมูลสมมติทั้งหมด ไม่ใช่ข้อมูลจริงของบริษัท
   ตั้งใจวางให้ทดสอบเกณฑ์ตรวจรับในสเปกได้ครบ — ดู docs/uat-checklist.md
   ========================================================================== */
window.SS = window.SS || {};

/* S1 · ทะเบียนพนักงาน  [เจ้าของจริง = เมนู Staff/Account ซึ่งยังไม่ถูกสร้าง] */
SS.SEED_EMPLOYEES = [
  { id: 'EMP-001', name: 'ธเนศ วรพัฒน์', position: 'กรรมการผู้จัดการ', dept: 'ADM',
    managerId: null, backupApproverId: null, role: 'exec', shift: 'day',
    exemptCheckin: true, startDate: '2018-03-01', probationPassedDate: '2018-06-28', positionId: 'POS-10', rawDept: null, empStatus: 'regular', isTest: false, active: true, defaultJobType: 'office' },

  { id: 'EMP-002', name: 'ณัฐพล เทคโนดล', position: 'เจ้าหน้าที่สารสนเทศ (แอดมินระบบ)', dept: 'ADM',
    managerId: 'EMP-100', backupApproverId: 'EMP-103', role: 'admin', shift: 'day',
    exemptCheckin: true, startDate: '2022-01-10', probationPassedDate: '2022-05-09', positionId: 'POS-07', rawDept: null, empStatus: 'regular', isTest: false, active: true, defaultJobType: 'office' },

  { id: 'EMP-100', name: 'ปวีณา ทองมั่น', position: 'เจ้าหน้าที่ทรัพยากรบุคคลอาวุโส', dept: 'ADM',
    managerId: null, backupApproverId: 'EMP-103', role: 'hr', shift: 'day',
    exemptCheckin: false, startDate: '2020-02-03', probationPassedDate: '2020-06-01', positionId: 'POS-06', rawDept: null, empStatus: 'regular', isTest: false, active: true, defaultJobType: 'office' },

  { id: 'EMP-103', name: 'อรวรรณ สุขเจริญ', position: 'เจ้าหน้าที่ทรัพยากรบุคคล (ผู้สำรอง)', dept: 'ADM',
    managerId: 'EMP-100', backupApproverId: 'EMP-100', role: 'hr', shift: 'day',
    exemptCheckin: false, startDate: '2023-05-15', probationPassedDate: '2023-09-11', positionId: 'POS-06', rawDept: null, empStatus: 'probation', isTest: false, active: true, defaultJobType: 'office' },

  { id: 'EMP-101', name: 'กิตติพงษ์ ศรีวรรณา', position: 'ผู้จัดการฝ่ายวิศวกรรม', dept: 'ENG',
    managerId: null, backupApproverId: 'EMP-102', role: 'manager', shift: 'day',
    exemptCheckin: false, startDate: '2019-07-01', probationPassedDate: '2019-10-28', positionId: 'POS-09', rawDept: null, empStatus: 'regular', isTest: false, active: true, defaultJobType: 'onsite' },

  { id: 'EMP-102', name: 'สุรเดช พงษ์ไพบูลย์', position: 'ผู้จัดการฝ่ายปฏิบัติการ', dept: 'OM',
    managerId: null, backupApproverId: 'EMP-101', role: 'manager', shift: 'day',
    exemptCheckin: false, startDate: '2019-11-04', probationPassedDate: '2020-03-02', positionId: 'POS-09', rawDept: null, empStatus: 'regular', isTest: false, active: true, defaultJobType: 'om' },

  { id: 'EMP-201', name: 'ธนากร ใจดี', position: 'วิศวกรไฟฟ้า', dept: 'ENG',
    managerId: 'EMP-101', backupApproverId: 'EMP-102', role: 'employee', shift: 'day',
    exemptCheckin: false, startDate: '2021-04-01', probationPassedDate: '2021-07-29', positionId: 'POS-05', rawDept: null, empStatus: 'regular', isTest: false, active: true, defaultJobType: 'onsite' },

  { id: 'EMP-202', name: 'ชนิดา แก้วประเสริฐ', position: 'วิศวกรออกแบบระบบ', dept: null,
    managerId: 'EMP-101', backupApproverId: 'EMP-102', role: 'employee', shift: 'day',
    exemptCheckin: false, startDate: '2022-08-16', probationPassedDate: '2022-12-13', positionId: null, rawDept: 'Project-Coordination', empStatus: 'regular', isTest: false, active: true, defaultJobType: 'office' },

  { id: 'EMP-203', name: 'วีระพล อินทรสุข', position: 'หัวหน้าช่างติดตั้ง', dept: 'ENG',
    managerId: 'EMP-101', backupApproverId: 'EMP-102', role: 'employee', shift: 'day',
    exemptCheckin: false, startDate: '2020-06-01', probationPassedDate: '2020-09-28', positionId: 'POS-03', rawDept: null, empStatus: 'regular', isTest: false, active: true, defaultJobType: 'onsite' },

  /* BR-09 · ยังไม่ผ่านการประเมิน → ยื่นลาพักร้อนไม่ได้ แต่ลาป่วย/ลากิจได้ */
  { id: 'EMP-204', name: 'อนุชา ทับทิมทอง', position: 'ช่างเทคนิคติดตั้ง', dept: null,
    managerId: 'EMP-101', backupApproverId: 'EMP-102', role: 'employee', shift: 'day',
    exemptCheckin: false, startDate: '2026-06-15', probationPassedDate: '', positionId: null, rawDept: 'Project Manager', empStatus: 'probation', isTest: false, active: true, defaultJobType: 'onsite' },

  { id: 'EMP-205', name: 'สมชาย เรืองฤทธิ์', position: 'ช่างเทคนิค O&M', dept: 'OM',
    managerId: 'EMP-102', backupApproverId: 'EMP-101', role: 'employee', shift: 'day',
    exemptCheckin: false, startDate: '2021-02-01', probationPassedDate: '2021-05-31', positionId: 'POS-02', rawDept: null, empStatus: 'regular', isTest: false, active: true, defaultJobType: 'om' },

  /* CI-13 · กะกลางคืน — คิดมาสายเทียบ 20:00 ไม่ใช่ 08:30 */
  { id: 'EMP-206', name: 'พิมพ์ชนก วัฒนกุล', position: 'เจ้าหน้าที่ Monitoring (กะกลางคืน)', dept: 'OM',
    managerId: 'EMP-102', backupApproverId: 'EMP-101', role: 'employee', shift: 'night',
    exemptCheckin: false, startDate: '2023-01-09', probationPassedDate: '2023-05-08', positionId: 'POS-08', rawDept: null, empStatus: 'regular', isTest: false, active: true, defaultJobType: 'office' },

  { id: 'EMP-207', name: 'กมลชนก ศิริพร', position: 'เจ้าหน้าที่ธุรการ', dept: null,
    managerId: 'EMP-100', backupApproverId: 'EMP-103', role: 'employee', shift: 'day',
    exemptCheckin: false, startDate: '2022-03-01', probationPassedDate: '2022-06-28', positionId: null, rawDept: 'Opeartion&Maintenance', empStatus: 'regular', isTest: false, active: true, defaultJobType: 'office' },

  /* DSH-03 · บัญชีทดสอบ ห้ามลบ ต้องไม่อยู่ในตัวเลขใด ๆ */
  { id: 'EMP-900', name: 'ผู้ใช้งาน ทดสอบ #test', position: 'บัญชีสำหรับทดสอบระบบ', dept: null,
    managerId: 'EMP-100', backupApproverId: 'EMP-103', role: 'employee', shift: 'day',
    exemptCheckin: true, startDate: '2024-01-01', probationPassedDate: '2024-04-29', positionId: null, rawDept: 'Project Manager', empStatus: 'suspended', isTest: true, active: true, defaultJobType: 'office' }
];

/* APV-01 · ตารางอำนาจอนุมัติ — ทุกที่ที่ถามว่า "ใครอนุมัติเรื่องนี้" ต้องถามตารางนี้ */
SS.SEED_AUTHORITY = [
  { subject: 'leave',          name: 'ใบลา ทุกประเภท ทุกจำนวนวัน',   primary: 'manager', backup: 'backup', fallback: 'hr',   note: 'ประเภทที่กฎหมายห้ามปฏิเสธ = รับทราบเท่านั้น (BR-04)' },
  { subject: 'leave-cancel',   name: 'ยกเลิกใบลาที่อนุมัติแล้ว',     primary: 'manager', backup: 'backup', fallback: 'hr',   note: 'คืนโควตาอัตโนมัติเมื่ออนุมัติ' },
  { subject: 'checkin-edit',   name: 'แก้เช็คอินข้ามวัน',            primary: 'manager', backup: 'backup', fallback: 'hr',   note: 'แก้ในวันเดียวกันไม่ต้องอนุมัติ (CI-06)' },
  { subject: 'comp-day',       name: 'วันชดเชย (วันหยุด/นอกเวลา)',   primary: 'manager', backup: 'backup', fallback: 'hr',   note: 'สร้างสิทธิ์วันลาใหม่ (CI-08/CI-10)' },
  { subject: 'allowance',      name: 'เบี้ยเลี้ยงรายรอบ',            primary: 'hr',      backup: 'hr2',    fallback: 'exec', note: 'หัวหน้างานไม่เห็นเรื่องนี้ (APV-05)' },
  { subject: 'pay-close',      name: 'ปิดรอบจ่าย',                   primary: 'hr',      backup: 'hr2',    fallback: 'exec', note: 'ต้องเคลียร์รายการค้างก่อน' },
  { subject: 'allowance-adj',  name: 'ปรับยอดเบี้ยเลี้ยงด้วยมือ',    primary: 'exec',    backup: null,     fallback: null,   note: 'ต้องมีเหตุผล เก็บทั้งสองยอด' },
  { subject: 'checkin-exempt', name: 'ยกเว้นการเช็คอินรายบุคคล',     primary: 'exec',    backup: null,     fallback: null,   note: 'มีผลถาวร (APV-11)' },
  { subject: 'leave-quota',    name: 'แก้สิทธิ์วันลารายคน',          primary: 'exec',    backup: null,     fallback: null,   note: 'APV-11' },
  { subject: 'allowance-rate', name: 'แก้อัตราเบี้ยเลี้ยงรายไซต์',   primary: 'exec',    backup: null,     fallback: null,   note: 'กระทบทุกคนในไซต์ ทุกวัน' },
  { subject: 'calendar-year',  name: 'ประกาศปฏิทินทำงานทั้งปี',      primary: 'exec',    backup: null,     fallback: null,   note: 'อนุมัติครั้งเดียวตอนประกาศ' },
  { subject: 'role-change',    name: 'เปลี่ยนบทบาทผู้ใช้',           primary: 'exec',    backup: null,     fallback: null,   note: 'โดยเฉพาะการตั้งแอดมิน' }
];

/* S15 · ยอดคงเหลือรายคน — ถังละปี ไม่ใช่ถังละวัน (CI-09)
   EMP-201 ตั้งค่าให้ตรงกับเกณฑ์ตรวจรับของ BR-01 พอดี:
   ชดเชยปีก่อน 2 · สะสมปีก่อน 2 · พักร้อนปีนี้ 8 */
SS.SEED_BALANCES = function (y) {
  var prev = y - 1;
  function b(compPrev, compNow, carry, annual, special) {
    var o = { comp: {}, annualCarry: {}, annual: annual, special: special || [] };
    if (compPrev) o.comp[prev] = compPrev;
    if (compNow) o.comp[y] = compNow;
    if (carry) o.annualCarry[prev] = carry;
    return o;
  }
  return {
    'EMP-001': b(0, 0, 0, 8),
    'EMP-002': b(0, 0, 0, 8),
    'EMP-100': b(0, 1, 1, 8),
    'EMP-103': b(0, 0, 0, 8),
    'EMP-101': b(1, 2, 0, 8),
    'EMP-102': b(0, 1, 2, 8),
    'EMP-201': b(2, 0, 2, 8),
    'EMP-202': b(0, 1, 0, 8),
    'EMP-203': b(1, 3, 1, 8),
    'EMP-204': b(0, 0, 0, 0),          /* ยังไม่ผ่านประเมิน — ยังไม่ปลดสิทธิ์พักร้อน */
    'EMP-205': b(0, 2, 1, 8),
    'EMP-206': b(0, 4, 0, 8),
    'EMP-207': b(0, 0, 3, 8, [{ days: 2, reason: 'ชดเชยช่วงงานว่าง ก.ค. 2569', expiry: y + '-12-31' }]),
    'EMP-900': b(0, 0, 0, 8)
  };
};

/* CAL-04 · กิจกรรมและประกาศจาก HR */
SS.SEED_EVENTS = function (T) {
  return [
    { id: 'EV-01', title: 'ประชุมทบทวนแผนงานประจำเดือน', from: SS.d.add(T, 2), to: SS.d.add(T, 2),
      detail: 'ห้องประชุมใหญ่ 09:00–11:00 · หัวหน้าทุกฝ่ายเข้าร่วม', scope: 'all', countsAsWorkday: false },
    { id: 'EV-02', title: 'อบรมความปลอดภัยในการทำงานบนที่สูง', from: SS.d.add(T, 9), to: SS.d.add(T, 9),
      detail: 'ภาคบังคับสำหรับช่างติดตั้งทุกคน · เริ่ม 08:30', scope: 'dept:ENG', countsAsWorkday: false },
    { id: 'EV-03', title: 'Outing ประจำปี', from: SS.d.add(T, 24), to: SS.d.add(T, 25),
      detail: 'จัดตรงกับวันหยุด — ผู้เข้าร่วมได้ลาชดเชยวันทำงานโดยไม่ต้องเช็คอินที่ไซต์', scope: 'all', countsAsWorkday: true }
  ];
};

/* ==========================================================================
   ใบรับรองของพนักงาน (C2 · C3) — ข้อมูลสมมติ
   วางให้ครบทุกสถานะที่หน้าจอต้องรองรับ: ใช้ได้ · ใกล้หมด · หมดอายุ · ยังไม่เคยมี
   ========================================================================== */
SS.SEED_CERTS = function (T) {
  var A = SS.d.add;
  var n = 0;
  function C(o) {
    n++;
    return {
      id: 'CF-' + (1000 + n), empId: o.emp, typeId: o.type,
      issuer: o.issuer || '', certNo: o.no || '',
      issued: o.issued, expiry: o.expiry === undefined ? null : o.expiry,
      attachment: o.file || '', note: o.note || '',
      version: o.version || 1, supersededBy: null,
      by: 'EMP-100', at: T
    };
  }
  return [
    /* EMP-201 ธนากร — ครบเกือบหมด มีใบหนึ่งใกล้หมดอายุ */
    C({ emp: 'EMP-201', type: 'CT-09', issuer: 'ศูนย์ฝึกอบรมความปลอดภัย ก', no: 'HW-6801', issued: A(T, -700), expiry: A(T, 30), file: 'สูง-ธนากร.pdf' }),
    C({ emp: 'EMP-201', type: 'CT-08', issuer: 'ศูนย์ฝึกอบรมความปลอดภัย ก', no: '4P-6802', issued: A(T, -400), expiry: A(T, 330), file: '4ผู้-ธนากร.pdf' }),
    C({ emp: 'EMP-201', type: 'CT-10', issuer: 'บริษัท (จัดอบรมภายใน)', issued: A(T, -900), expiry: null, file: '' }),
    C({ emp: 'EMP-201', type: 'CT-02', issuer: 'สภากาชาดไทย', issued: A(T, -300), expiry: A(T, 430), file: 'ปฐมพยาบาล.pdf' }),

    /* EMP-204 อนุชา — ใบบังคับหมดอายุแล้ว แต่ยังลงไซต์อยู่ → เคสของ C6 */
    C({ emp: 'EMP-204', type: 'CT-09', issuer: 'ศูนย์ฝึกอบรมความปลอดภัย ข', no: 'HW-6612', issued: A(T, -742), expiry: A(T, -12), file: '' }),
    C({ emp: 'EMP-204', type: 'CT-10', issuer: 'บริษัท (จัดอบรมภายใน)', issued: A(T, -200), expiry: null, file: '' }),

    /* EMP-203 วีระพล หัวหน้าชุด — มี จป. และมีประวัติต่ออายุสองฉบับ */
    C({ emp: 'EMP-203', type: 'CT-05', issuer: 'กรมสวัสดิการและคุ้มครองแรงงาน', no: 'SO-6501', issued: A(T, -1100), expiry: null, file: 'จป-วีระพล.pdf' }),
    C({ emp: 'EMP-203', type: 'CT-09', issuer: 'ศูนย์ฝึกอบรมความปลอดภัย ก', no: 'HW-6501', issued: A(T, -1100), expiry: A(T, -370), file: '', version: 1 }),
    C({ emp: 'EMP-203', type: 'CT-09', issuer: 'ศูนย์ฝึกอบรมความปลอดภัย ก', no: 'HW-6811', issued: A(T, -360), expiry: A(T, 370), file: 'สูง-วีระพล.pdf', version: 2 }),
    C({ emp: 'EMP-203', type: 'CT-08', issuer: 'ศูนย์ฝึกอบรมความปลอดภัย ก', no: '4P-6810', issued: A(T, -360), expiry: A(T, 370), file: '' }),

    /* EMP-205 สมชาย O&M */
    C({ emp: 'EMP-205', type: 'CT-10', issuer: 'บริษัท (จัดอบรมภายใน)', issued: A(T, -600), expiry: null, file: '' }),
    C({ emp: 'EMP-205', type: 'CT-04', issuer: 'ศูนย์ฝึกอบรม ค', no: 'FL-6702', issued: A(T, -500), expiry: A(T, 595), file: 'forklift.pdf' }),

    /* EMP-202 ชนิดา วิศวกรออกแบบ — ยังไม่มีใบ กว. ซึ่งเป็นใบบังคับตามตำแหน่ง */
    C({ emp: 'EMP-202', type: 'CT-10', issuer: 'บริษัท (จัดอบรมภายใน)', issued: A(T, -700), expiry: null, file: '' })
  ];
};

/* เอกสารอ่อนไหวตาม PDPA (C4) — เก็บได้เฉพาะ ผ่าน/ไม่ผ่าน + วันที่ + ครบกำหนดถัดไป
   *** ห้ามมีไฟล์แนบ ห้ามมีรายละเอียดผล *** */
SS.SEED_SENSITIVE = function (T) {
  var A = SS.d.add, n = 0;
  function S2(emp, type, pass, checked, next) {
    n++;
    return { id: 'SD-' + (2000 + n), empId: emp, typeId: type, pass: pass,
             checked: checked, next: next, by: 'EMP-100', at: T };
  }
  return [
    S2('EMP-201', 'CT-12', true,  A(T, -250), A(T, 115)),
    S2('EMP-201', 'CT-13', true,  A(T, -900), null),
    S2('EMP-203', 'CT-12', true,  A(T, -100), A(T, 265)),
    S2('EMP-204', 'CT-12', true,  A(T, -356), A(T, 9)),      /* ครบกำหนดใน 9 วัน */
    S2('EMP-205', 'CT-14', false, A(T, -30),  A(T, 335))     /* ไม่ผ่าน — ต้องเห็นว่าระบบเก็บได้ */
  ];
};

/* ---------- ตัวสุ่มแบบคงที่ ---------- */
SS.rng = function (a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ปฏิทินทั้งปี (CI-04) — เสาร์ตั้งต้นเป็น "เสาร์หยุด" แล้วเปิดเสาร์เว้นเสาร์ */
SS.SEED_CALENDAR = function (year) {
  var cal = {}, cur = year + '-01-01', end = year + '-12-31', g = 0;
  var hol = {};
  [['01-01', 'วันขึ้นปีใหม่'], ['04-13', 'วันสงกรานต์'], ['04-14', 'วันสงกรานต์'], ['04-15', 'วันสงกรานต์'],
   ['05-01', 'วันแรงงานแห่งชาติ'], ['07-28', 'วันเฉลิมพระชนมพรรษา ร.10'], ['08-12', 'วันแม่แห่งชาติ'],
   ['10-13', 'วันนวมินทรมหาราช'], ['10-23', 'วันปิยมหาราช'], ['12-05', 'วันคล้ายวันพระบรมราชสมภพ ร.9'],
   ['12-10', 'วันรัฐธรรมนูญ'], ['12-31', 'วันสิ้นปี']
  ].forEach(function (h) { hol[year + '-' + h[0]] = h[1]; });

  while (cur <= end && g++ < 400) {
    var dow = SS.d.dow(cur), type = 'work', name = '';
    if (dow === 0) type = 'sunday';
    else if (dow === 6) {
      var wk = Math.round((SS.d.parse(cur) - SS.d.parse(year + '-01-03')) / 604800000);
      type = (wk % 2 === 0) ? 'sat-work' : 'sat-off';
    }
    if (hol[cur]) { type = 'holiday'; name = hol[cur]; }
    cal[cur] = { type: type, name: name };
    cur = SS.d.add(cur, 1);
  }
  return cal;
};

/* ใบลา — วางให้มีครบทุกสถานะและทุกกรณีที่ต้องทดสอบ */
SS.SEED_LEAVES = function (T) {
  var A = SS.d.add;
  function L(o) {
    return {
      id: o.id, empId: o.emp, type: o.type, from: o.from, to: o.to, halfDay: o.half || null,
      reason: o.reason, status: o.status, approverId: o.by || null, approverNote: o.note || '',
      onBehalfOf: o.onBehalf || null, attachment: o.doc || '', ackOverQuota: !!o.ack,
      createdAt: o.created, decidedAt: o.decided || null, bucketPlan: o.plan || null
    };
  }
  return [
    /* รออนุมัติ — คิวของหัวหน้า EMP-101 */
    L({ id: 'LV-1012', emp: 'EMP-201', type: 'LT-ANNUAL', from: A(T, 4), to: A(T, 5),
        reason: 'พาครอบครัวไปต่างจังหวัด', status: 'pending', created: A(T, -2) }),
    L({ id: 'LV-1011', emp: 'EMP-203', type: 'LT-PERSONAL', from: A(T, 1), to: A(T, 1), half: 'PM',
        reason: 'ไปทำธุรกรรมที่ธนาคาร', status: 'pending', created: A(T, -1) }),
    /* BR-04 · ลาป่วย ปฏิเสธไม่ได้ → ปุ่มต้องเป็น "รับทราบ / ขอเอกสารเพิ่ม" */
    L({ id: 'LV-1010', emp: 'EMP-205', type: 'LT-SICK', from: A(T, -1), to: A(T, -1),
        reason: 'ไข้หวัด ปวดศีรษะ', status: 'pending', created: A(T, -1) }),
    /* คิวของ HR (EMP-100 เป็นหัวหน้าสายธุรการ) */
    L({ id: 'LV-1009', emp: 'EMP-207', type: 'LT-ANNUAL', from: A(T, 11), to: A(T, 13),
        reason: 'ลาพักร้อนประจำปี', status: 'pending', created: A(T, -3) }),
    /* CI-14 · ใบลาค้างจนเลยวันลา → สถานะรายวันต้องเป็น "รอตรวจสอบ" ไม่ใช่ขาดงาน */
    L({ id: 'LV-1008', emp: 'EMP-202', type: 'LT-PERSONAL', from: A(T, -9), to: A(T, -9),
        reason: 'ธุระครอบครัว', status: 'pending', created: A(T, -12) }),

    /* อนุมัติแล้ว */
    L({ id: 'LV-1007', emp: 'EMP-204', type: 'LT-SICK', from: A(T, -8), to: A(T, -8),
        reason: 'ปวดท้อง พบแพทย์', status: 'approved', by: 'EMP-101',
        note: 'อนุมัติ ขอให้พักผ่อนให้เพียงพอ', created: A(T, -9), decided: A(T, -8) }),
    L({ id: 'LV-1006', emp: 'EMP-202', type: 'LT-ANNUAL', from: A(T, -17), to: A(T, -15),
        reason: 'เดินทางต่างประเทศ', status: 'used', by: 'EMP-101',
        note: 'อนุมัติแล้ว ฝากงานให้ทีมเรียบร้อย', created: A(T, -25), decided: A(T, -22) }),
    /* CI-14 · ถูกปฏิเสธก่อนถึงวัน แล้วไม่มาทำงาน → ขาดงานแบบ "ถูกปฏิเสธแล้วยังไม่มา" */
    L({ id: 'LV-1005', emp: 'EMP-206', type: 'LT-PERSONAL', from: A(T, -6), to: A(T, -6), half: 'AM',
        reason: 'ธุระส่วนตัวช่วงเช้า', status: 'rejected', by: 'EMP-102',
        note: 'ติดรอบส่งรายงาน Monitoring รายเดือน ขอให้เลื่อนเป็นสัปดาห์หน้า', created: A(T, -8), decided: A(T, -7) }),
    L({ id: 'LV-1004', emp: 'EMP-201', type: 'LT-SICK', from: A(T, -24), to: A(T, -23),
        reason: 'ไข้หวัดใหญ่', status: 'used', by: 'EMP-101', note: 'อนุมัติ',
        doc: 'ใบรับรองแพทย์.pdf', created: A(T, -25), decided: A(T, -24) }),
    L({ id: 'LV-1003', emp: 'EMP-203', type: 'LT-ANNUAL', from: A(T, -31), to: A(T, -31),
        reason: 'ธุระส่วนตัว', status: 'cancelled', created: A(T, -34) })
  ];
};
