/* ==========================================================================
   masters.js — ตารางของกลาง (S1–S20) และพารามิเตอร์ระบบ
   อ้างอิง: สัญญากลาง-โมดูลบุคคล ข้อ 2
   กติกา: ห้าม hardcode ค่าตั้ง — ทุกค่าในไฟล์นี้แก้ได้จากหน้าตั้งค่า
   ========================================================================== */
window.SS = window.SS || {};

/* ---------- date helpers (S14 · แสดงผลเป็น พ.ศ.) ---------- */
SS.d = {
  pad: function (n) { return n < 10 ? '0' + n : '' + n; },
  iso: function (dt) { return dt.getFullYear() + '-' + SS.d.pad(dt.getMonth() + 1) + '-' + SS.d.pad(dt.getDate()); },
  parse: function (s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); },
  add: function (s, n) { var dt = SS.d.parse(s); dt.setDate(dt.getDate() + n); return SS.d.iso(dt); },
  today: function () { return SS.d.iso(new Date()); },
  dow: function (s) { return SS.d.parse(s).getDay(); },
  year: function (s) { return +String(s).slice(0, 4); },
  month: function (s) { return String(s).slice(0, 7); },
  diff: function (a, b) { return Math.round((SS.d.parse(b) - SS.d.parse(a)) / 86400000); },
  min: function (hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1]); },
  hhmm: function (m) { m = ((m % 1440) + 1440) % 1440; return SS.d.pad(Math.floor(m / 60)) + ':' + SS.d.pad(m % 60); },
  now: function () { var n = new Date(); return SS.d.pad(n.getHours()) + ':' + SS.d.pad(n.getMinutes()); },
  eachDay: function (from, to, fn) { var c = from, g = 0; while (c <= to && g++ < 800) { fn(c); c = SS.d.add(c, 1); } }
};

/* ==========================================================================
   S8 · สิทธิ์ตามบทบาท
   สเปกกำหนด 5 บทบาท — APV-11 บังคับให้แยก "สิทธิ์แก้ข้อมูล" (แอดมิน)
   ออกจาก "สิทธิ์อนุมัติ" (หัวหน้างาน/ผู้บริหาร) จึงรวมเป็นบทบาทเดียวไม่ได้
   ========================================================================== */
SS.ROLES = [
  { id: 'employee', name: 'พนักงาน',     short: 'พนักงาน' },
  { id: 'manager',  name: 'หัวหน้างาน',   short: 'หัวหน้า' },
  { id: 'hr',       name: 'ฝ่ายบุคคล',    short: 'ฝ่ายบุคคล' },
  { id: 'exec',     name: 'ผู้บริหาร',    short: 'ผู้บริหาร' },
  { id: 'admin',    name: 'แอดมินระบบ',   short: 'แอดมิน' }
];

/* ==========================================================================
   S19 · ทะเบียนประเภทงาน — ตารางกลางของ spec-checkin-dropdown.md
   siteFilter    = สถานะโครงการที่แสดงในลิสต์ไซต์ (CI-16)
   allowedTravel = ชุดลักษณะการไปที่เลือกได้ของประเภทงานนั้น
                   แก้ 8 ก.ย. 2569 · เดิมเป็นแค่ "แก้ได้ / ล็อก" ทำให้งานหน้าไซต์
                   เลือก "ประจำออฟฟิศ" ได้ ซึ่ง UAT FB-2 ทักว่าไม่ควรเป็นไปได้
   *** meals ห้ามแสดงให้พนักงานเห็น (CI-03) ***
   ========================================================================== */
SS.JOB_TYPES = [
  { id: 'office', code: 'Office/Store', name: 'ประจำออฟฟิศ', requireSite: false,
    siteFilter: [], otherPlace: false, defaultTravel: 'office', travelLocked: true, enabled: true,
    allowedTravel: [], emptyMsg: '' },
  { id: 'onsite', code: 'Onsite', name: 'งานหน้าไซต์', requireSite: true,
    siteFilter: ['active'], otherPlace: false, defaultTravel: 'onsite', travelLocked: false, enabled: true,
    allowedTravel: ['onsite', 'daytrip', 'am', 'pm', 'night'],
    emptyMsg: 'ยังไม่มีโครงการสถานะ "กำลังดำเนินการ" ในระบบ — ติดต่อแอดมินเพื่อเปิดโครงการก่อน' },
  { id: 'om', code: 'O&M', name: 'ซ่อมบำรุง', requireSite: true,
    siteFilter: ['done', 'active'], otherPlace: false, defaultTravel: 'daytrip', travelLocked: false, enabled: true,
    allowedTravel: ['daytrip', 'am', 'pm', 'onsite', 'night'],
    emptyMsg: 'ยังไม่มีโครงการที่ส่งมอบแล้วหรือกำลังดำเนินการในระบบ' },
  { id: 'survey', code: 'Survey', name: 'สำรวจ', requireSite: true,
    siteFilter: ['plan'], otherPlace: true, defaultTravel: 'daytrip', travelLocked: false, enabled: true,
    allowedTravel: ['daytrip', 'am', 'pm', 'onsite', 'night'],
    emptyMsg: 'ยังไม่มีโครงการสถานะ "แผนงาน" — เลือก "สถานที่อื่น" แล้วพิมพ์ชื่อสถานที่ได้' },
  /* CI-15 · CI-19: ปิดการใช้งาน ห้ามลบ ข้อมูลเก่ายังอ้างอิงอยู่ */
  { id: 'logistic', code: 'Logistic/Store', name: 'ขนส่ง/คลัง', requireSite: true,
    siteFilter: ['active'], otherPlace: false, defaultTravel: 'daytrip', travelLocked: false, enabled: false,
    allowedTravel: ['daytrip', 'am', 'pm'], emptyMsg: '' }
];

/* ==========================================================================
   S20 · ลักษณะการไปงาน + จำนวนมื้อ (CI-19 · ALW-04)
   additive   = เป็นตัวบวก ไม่ใช่ค่าที่มาแทน
   replacesAll = ทับค่าอื่นทั้งหมด ไม่บวกมื้อนอกเวลาซ้ำ
   ========================================================================== */
SS.TRAVEL_TYPES = [
  { id: 'onsite',   name: 'ประจำไซต์',              meals: 3, additive: false, replacesAll: false, enabled: true },
  { id: 'office',   name: 'ประจำออฟฟิศ',            meals: 0, additive: false, replacesAll: false, enabled: true },
  { id: 'daytrip',  name: 'ไปเช้า-เย็นกลับ',        meals: 1, additive: false, replacesAll: false, enabled: true },
  { id: 'am',       name: 'ไปเช้า-บ่ายกลับ',        meals: 1, additive: false, replacesAll: false, enabled: true },
  { id: 'pm',       name: 'ไปบ่าย-เย็นกลับ',        meals: 1, additive: false, replacesAll: false, enabled: true },
  /* เปลี่ยนชื่อ 8 ก.ย. 2569 · ชื่อเดิม "ทำงานนอกเวลาปฏิบัติงาน" ชนกับฟอร์มชั่วโมง OT ใน CI-10
     ตัวเลือกนี้ตอบเรื่องค่าอาหารเท่านั้น ไม่เก็บชั่วโมง ไม่ทำให้ได้วันชดเชย (UAT FB-7) */
  { id: 'overtime', name: 'อยู่หน้างานนอกเวลา',      meals: 1, additive: true,  replacesAll: false, enabled: true },
  { id: 'night',    name: 'กะกลางคืน',              meals: 3, additive: false, replacesAll: true,  enabled: true }
];

/* ==========================================================================
   S10 · ทะเบียนโครงการ/ไซต์งาน   [เจ้าของจริง = เมนูโครงการ/ไซต์งาน — ยังไม่ทำ]
   status: plan แผนงาน · active กำลังดำเนินการ · done เสร็จสิ้น/ส่งมอบแล้ว
   ========================================================================== */
SS.PROJECTS = [
  { id: 'PRJ-CRR',   code: 'CRR',          name: 'CRR Solar Farm (ฉะเชิงเทรา)',       status: 'active' , lat: 13.6904, lng: 101.0779 },
  { id: 'PRJ-MVP',   code: 'MVP',          name: 'MVP Rooftop 1.2 MWp (สมุทรปราการ)', status: 'active' , lat: 13.5990, lng: 100.6010 },
  { id: 'PRJ-TPC2',  code: 'TPC2',         name: 'TPC2 Carport (ระยอง)',              status: 'active' , lat: 12.6810, lng: 101.2750 },
  { id: 'PRJ-SWF',   code: 'SWF',          name: 'SWF Floating Solar (สระบุรี)',      status: 'active' , lat: 14.5290, lng: 100.9100 },
  { id: 'PRJ-HYS',   code: 'HYS',          name: 'HYS Factory Rooftop (ชลบุรี)',      status: 'done'   , lat: 13.3611, lng: 100.9847 },
  { id: 'PRJ-HYATT', code: 'HYATT',        name: 'HYATT Hotel Rooftop (กรุงเทพฯ)',    status: 'done'   , lat: 13.7440, lng: 100.5480 },
  { id: 'PRJ-LAG',   code: 'LAGUNA',       name: 'LAGUNA Resort (ภูเก็ต)',            status: 'done'   , lat: 8.0000, lng: 98.2960 },
  { id: 'PRJ-GAL',   code: 'GALLERY',      name: 'GALLERY Community Mall (นนทบุรี)',  status: 'done'   , lat: 13.8620, lng: 100.5140 },
  { id: 'PRJ-OPK',   code: 'OPEN KITCHEN', name: 'OPEN KITCHEN Central Kitchen',      status: 'done'   , lat: 13.7500, lng: 100.5300 },
  { id: 'PRJ-NECA',  code: 'NECA',         name: 'NECA Warehouse (สมุทรสาคร)',        status: 'plan'   , lat: 13.5470, lng: 100.2740 },
  { id: 'PRJ-CASIA', code: 'Casia',        name: 'Casia Industrial (ปราจีนบุรี)',     status: 'plan'   , lat: 14.0510, lng: 101.3700 },
  { id: 'PRJ-OFF',   code: 'Office',       name: 'สำนักงานใหญ่ ปทุมธานี',             status: 'active' , lat: 14.0208, lng: 100.5250 }
];

/* ==========================================================================
   S17 · อัตราเบี้ยเลี้ยงต่อมื้อรายไซต์ + วันเริ่มมีผล (ALW-02)
   หนึ่งแถว = ไซต์ + อัตรา + วันเริ่มใช้ + วันสิ้นสุด (ว่าง = ยังมีผล)
   ค่าตั้งต้น: 40 บาททั่วไป · 75 บาทที่ MVP และ SWF
   *** วันเริ่มใช้ของแถวแรก ยังรอฝ่ายบุคคลยืนยัน (tasks.md) ***
   ========================================================================== */
SS.ALLOWANCE_RATES = [
  { id: 'R-01', projectId: 'PRJ-MVP',   rate: 75, from: '2026-01-01', to: null },
  { id: 'R-02', projectId: 'PRJ-SWF',   rate: 75, from: '2026-01-01', to: null },
  { id: 'R-03', projectId: 'PRJ-HYS',   rate: 40, from: '2026-01-01', to: null },
  { id: 'R-04', projectId: 'PRJ-HYATT', rate: 40, from: '2026-01-01', to: null },
  { id: 'R-05', projectId: 'PRJ-LAG',   rate: 40, from: '2026-01-01', to: null },
  { id: 'R-06', projectId: 'PRJ-GAL',   rate: 40, from: '2026-01-01', to: null },
  { id: 'R-07', projectId: 'PRJ-OPK',   rate: 40, from: '2026-01-01', to: null },
  { id: 'R-08', projectId: 'PRJ-NECA',  rate: 40, from: '2026-01-01', to: null },
  { id: 'R-09', projectId: 'PRJ-CASIA', rate: 40, from: '2026-01-01', to: null }
  /* CRR · TPC2 · Office ยังไม่มีอัตรา → ALW-02 บังคับให้เตือน ห้ามคิดเป็น 0 เงียบ ๆ */
];

/* ==========================================================================
   ประเภทการลา (LV-01) — แยก "วันที่ลาได้" ออกจาก "วันที่ได้ค่าจ้าง"
   unit: work = วันทำงาน · cal = วันปฏิทิน (กลุ่มลาคลอดตามกฎหมาย)
   refusable: yes ปฏิเสธได้ · doc เฉพาะเอกสารไม่ครบ · no ปฏิเสธไม่ได้ (BR-04)
   ========================================================================== */
SS.LEAVE_TYPES = [
  { id: 'LT-SICK', name: 'ลาป่วย', quota: null, paidDays: 30, payRate: 100, unit: 'work',
    advance: 0, backdate: 3, refusable: 'doc', bucket: 'sick', legalMin: 'จ่าย 30 วัน',
    docRule: 'ลาตั้งแต่ 3 วันทำงานขึ้นไป ต้องแนบใบรับรองแพทย์', law: 'ม.32/57' },
  { id: 'LT-PERSONAL', name: 'ลากิจธุระจำเป็น', quota: 6, paidDays: 6, payRate: 100, unit: 'work',
    advance: 1, backdate: 0, refusable: 'yes', bucket: 'personal', legalMin: '3 วัน · จ่าย 3 วัน',
    docRule: '', law: 'ม.34/57/1' },
  { id: 'LT-ANNUAL', name: 'ลาพักผ่อนประจำปี', quota: 8, paidDays: null, payRate: 100, unit: 'work',
    advance: 3, backdate: 0, refusable: 'yes', bucket: 'annual', legalMin: '6 วัน',
    docRule: '', law: 'ม.30/56', needProbation: true },
  { id: 'LT-COMP', name: 'ลาชดเชยวันทำงาน', quota: null, paidDays: null, payRate: 100, unit: 'work',
    advance: 1, backdate: 0, refusable: 'yes', bucket: 'comp', legalMin: 'นโยบายบริษัท',
    docRule: '', law: 'นโยบายบริษัท' },
  { id: 'LT-MATERNITY', name: 'ลาคลอด', quota: 120, paidDays: 60, payRate: 100, unit: 'cal',
    advance: 0, backdate: 7, refusable: 'no', bucket: null, legalMin: '120 วัน · จ่าย 60 วัน',
    docRule: 'ใบรับรองแพทย์', law: 'ม.41/59' },
  { id: 'LT-NEWBORN', name: 'ลาดูแลบุตรแรกคลอดที่ป่วย', quota: 15, paidDays: 15, payRate: 50, unit: 'cal',
    advance: 0, backdate: 7, refusable: 'doc', bucket: null, legalMin: '15 วัน · จ่าย 50%',
    docRule: 'ใบรับรองแพทย์', law: 'ม.41 วรรคสี่/59/1' },
  { id: 'LT-PATERNITY', name: 'ลาช่วยเหลือคู่สมรสคลอดบุตร', quota: 15, paidDays: 15, payRate: 100, unit: 'cal',
    advance: 0, backdate: 7, refusable: 'doc', bucket: null, legalMin: '15 วัน · จ่ายเต็ม',
    docRule: 'ทะเบียนสมรส + สูติบัตร · ใช้ภายใน 90 วันนับแต่วันคลอด', law: 'ม.41/1, 59/2' },
  { id: 'LT-STERILIZE', name: 'ลาทำหมัน', quota: null, paidDays: null, payRate: 100, unit: 'work',
    advance: 1, backdate: 3, refusable: 'no', bucket: null, legalMin: 'ตามที่แพทย์กำหนด',
    docRule: 'ใบรับรองแพทย์', law: 'ม.33/57 วรรคสอง' },
  { id: 'LT-MILITARY', name: 'ลารับราชการทหาร', quota: null, paidDays: 60, payRate: 100, unit: 'work',
    advance: 7, backdate: 0, refusable: 'no', bucket: null, legalMin: 'จ่าย 60 วัน/ปี',
    docRule: 'หมายเรียก', law: 'ม.35/58' },
  { id: 'LT-TRAINING', name: 'ลาฝึกอบรม', quota: 30, paidDays: 0, payRate: 0, unit: 'work',
    advance: 7, backdate: 0, refusable: 'yes', bucket: null, legalMin: '≤ 3 ครั้ง หรือ 30 วัน/ปี',
    docRule: 'เอกสารหลักสูตร · แจ้งล่วงหน้า 7 วัน', law: 'ม.36' },
  { id: 'LT-INJURY', name: 'บาดเจ็บจากการทำงาน', quota: null, paidDays: null, payRate: 100, unit: 'work',
    advance: 0, backdate: 7, refusable: 'no', bucket: null, legalMin: 'กองทุนเงินทดแทน',
    docRule: 'ใบรับรองแพทย์ · แบบ กท.', law: 'ม.32 วรรคท้าย', noQuota: true },
  { id: 'LT-UNPAID', name: 'ลาไม่รับค่าจ้าง', quota: null, paidDays: 0, payRate: 0, unit: 'work',
    advance: 3, backdate: 0, refusable: 'yes', bucket: null, legalMin: '—', docRule: '', law: '—' }
];

/* ==========================================================================
   สถานะใบลา
   BR-12 กำหนด 6 สถานะ · APV-04 เพิ่ม "ตีกลับให้แก้ไข" เป็นสถานะที่ 7
   *** BR-12 ยังไม่ได้ลิสต์สถานะที่ 7 ไว้ — ต้องตามแก้ในสเปก ***
   ========================================================================== */
SS.LEAVE_STATUS = [
  { id: 'pending',   name: 'รออนุมัติ',      pill: 'pill-yellow', used: 0,  reserved: 1 },
  { id: 'approved',  name: 'อนุมัติแล้ว',    pill: 'pill-green',  used: 1,  reserved: 0 },
  { id: 'used',      name: 'ใช้แล้ว',        pill: 'pill-blue',   used: 1,  reserved: 0 },
  { id: 'rejected',  name: 'ไม่อนุมัติ',     pill: 'pill-red',    used: 0,  reserved: 0 },
  { id: 'cancelled', name: 'ยกเลิกแล้ว',     pill: 'pill-gray',   used: 0,  reserved: 0 },
  { id: 'lapsed',    name: 'ตกไป',           pill: 'pill-gray',   used: 0,  reserved: 0 },
  { id: 'bounced',   name: 'ตีกลับให้แก้ไข', pill: 'pill-orange', used: 0,  reserved: 0 }
];

/* ==========================================================================
   S5 · สถานะรายวัน (CI-14) — ลำดับตัดสิน สำคัญมาก
   เช็คอิน → ใบลาอนุมัติ → ใบลารออนุมัติ → วันหยุดตามปฏิทิน → ยกเว้น → ขาดงาน
   ========================================================================== */
SS.DAY_STATUS = [
  { id: 'work',    name: 'ทำงาน',       pill: 'pill-green',  countWork: true,  allowance: true,  inList: false },
  /* สถานะที่ 8 · เพิ่ม 8 ก.ย. 2569 จาก CI-26 — ไปถึงไซต์แล้วทำงานไม่ได้
     ยังได้มื้อ ไม่นับขาดงาน ไม่หักวันลา ไม่กระทบสถิติมาสาย · แยกจาก "ทำงาน" และจาก "วันหยุด" */
  { id: 'sitestop', name: 'หยุดงานที่ไซต์', pill: 'pill-orange', countWork: true, allowance: true, inList: true },
  { id: 'leave',   name: 'ลา',          pill: 'pill-blue',   countWork: false, allowance: false, inList: false },
  { id: 'holiday', name: 'วันหยุด',     pill: 'pill-gray',   countWork: false, allowance: false, inList: false },
  { id: 'pending', name: 'รออนุมัติลา', pill: 'pill-yellow', countWork: false, allowance: false, inList: true  },
  { id: 'review',  name: 'รอตรวจสอบ',   pill: 'pill-orange', countWork: false, allowance: false, inList: true  },
  { id: 'absent',  name: 'ขาดงาน',      pill: 'pill-red',    countWork: false, allowance: false, inList: true  },
  { id: 'exempt',  name: 'ยกเว้น',      pill: 'pill-gray',   countWork: false, allowance: false, inList: false }
];

/* สาเหตุประกอบของ "ขาดงาน" (CI-14) — ไม่ใช่สถานะใหม่ */
SS.ABSENT_CAUSE = {
  none:      'ไม่แจ้ง',
  rejected:  'ถูกปฏิเสธแล้วยังไม่มา',
  cancelled: 'ยกเลิกเองแล้วไม่มา'
};

/* ==========================================================================
   S21 · ทะเบียนเหตุผลไซต์หยุดงาน (CI-26)
   ตั้งค่าได้ ห้าม hardcode · เลือกจากรายการเท่านั้น เพื่อให้ออกรายงานได้
   free = พิมพ์เพิ่มได้เฉพาะข้อนี้
   ========================================================================== */
SS.SITE_STOP_REASONS = [
  { id: 'rain',     name: 'ฝนตก',                 free: false, enabled: true },
  { id: 'customer', name: 'ลูกค้าสั่งหยุด',        free: false, enabled: true },
  { id: 'material', name: 'รอวัสดุ/อุปกรณ์',       free: false, enabled: true },
  { id: 'access',   name: 'เข้าพื้นที่ไม่ได้',     free: false, enabled: true },
  { id: 'power',    name: 'ไฟฟ้า/ระบบไม่พร้อม',    free: false, enabled: true },
  { id: 'other',    name: 'เหตุอื่น',              free: true,  enabled: true }
];

/* ==========================================================================
   S3 · ประเภทวันในปฏิทิน (CI-04)
   ========================================================================== */
SS.DAY_TYPES = [
  { id: 'work',     name: 'วันทำงานปกติ',  working: true,  comp: false, color: '#FFFFFF' },
  { id: 'sat-work', name: 'เสาร์ทำงาน',    working: true,  comp: false, color: '#E6F3EC' },
  { id: 'sat-off',  name: 'เสาร์หยุด',     working: false, comp: true,  color: '#FFF4D6' },
  { id: 'holiday',  name: 'วันหยุดบริษัท', working: false, comp: true,  color: '#FCE7E4' },
  { id: 'sunday',   name: 'วันอาทิตย์',    working: false, comp: true,  color: '#EDF1F6' }
];

/* ==========================================================================
   S4 · เวลาทำงานมาตรฐาน · S18 รอบตัดจ่าย · พารามิเตอร์ทั้งหมด
   ห้าม hardcode — ทุกค่าต้องแก้ได้จากหน้าตั้งค่า
   ========================================================================== */
SS.DEFAULT_PARAMS = {
  /* S4 · เวลาทำงาน */
  workStart: '08:30',
  workEnd: '17:30',
  graceMinutes: 0,          /* ⚠ ยังไม่เคาะ — DSH-02 · ระบบจริงน่าจะยังใช้ 08:00 */
  nightStart: '20:00',
  nightEnd: '05:00',

  /* CI-08 · CI-09 · CI-10 */
  holidayCompRate: 1.0,     /* เต็มวัน 1.0 · ครึ่งวัน 0.5 */
  otHoursPerDay: 8,         /* 8 ชม. = 1 วัน · เศษยกไป ไม่ปัดทิ้ง */
  expiryRule: 'dec31-next', /* ทั้งลาชดเชยและพักร้อนสะสม */
  compWarnFrom: '10-01',    /* เตือนตั้งแต่ 1 ต.ค. แล้วซ้ำที่ 60 และ 30 วัน */

  /* CI-06 · CI-12 · CI-22 */
  selfEditHours: 12,
  notifyTime: '09:00',
  historyPageSize: 31,      /* จำนวนวันที่แสดงต่อหน้าในประวัติเช็คอิน — ห้ามเป็นค่าตายในโค้ด */

  /* BR-09 · LV-02 */
  quotaCycle: 'calendar',   /* ปีปฏิทิน 1 ม.ค. – 31 ธ.ค. */
  probationDays: 119,       /* วันเริ่มงาน + 119 วัน (แก้ทับได้รายคน) */

  /* APV-07 · APV-08 */
  reminderEveryHours: 24,
  lapseAfterDays: 30,       /* เลยวันลาเกินเท่านี้ → ตกไป + คืนยอดจอง */

  /* LV-09 · BR-10 */
  maxLeavePerDay: null,     /* ⚠ ยังไม่เคาะ — null = ยังไม่บังคับเพดาน */

  /* S18 · ALW-12 */
  payCycleStartDay: 16,     /* รอบ 16 ถึง 15 ของเดือนถัดไป */

  /* CI-19 · FB-6 */
  officeOvertimeMeals: 0,   /* ⚠ ยังไม่เคาะ — ประจำออฟฟิศอยู่หน้างานนอกเวลาได้กี่มื้อ รอผู้บริหารยืนยัน */

  /* CI-25 · CI-28 */
  maxVisitsPerDay: 4,       /* จำนวนไซต์ที่แวะเพิ่มได้ต่อวัน · ตั้ง 0 = ปิดฟีเจอร์ทั้งปุ่ม */
  siteRadiusMeters: 500,    /* รัศมีที่ถือว่าอยู่หน้างาน — ใช้คิดระยะในรายงานเท่านั้น ห้ามใช้บล็อกการเช็คอิน */
  geoNotice: 'ระบบจะบันทึกพิกัดที่ตั้งตอนกดเช็คอิน เพื่อใช้เป็นหลักฐานประกอบการคำนวณค่าอาหารเท่านั้น ' +
             'ไม่ได้ใช้ติดตามตัวพนักงาน และไม่มีการแสดงระยะทางให้พนักงานเห็น',

  /* S17 · ALW-02 */
  defaultMealRate: 40,      /* อัตราเริ่มต้นของบริษัท ใช้เมื่อไซต์ยังไม่ตั้งค่า */

  /* ALW-07 · ตัดออกแล้ว เก็บไว้เพื่อแสดงว่าปิดใช้งาน */
  distanceRateEnabled: false,
  distanceRate: 4
};

/* วันหมดอายุของถัง (CI-09 · LV-12 · BR-01)
   ทุกถังหมด 31 ธ.ค. ของปีถัดจากปีที่ได้มา */
SS.EXPIRY_RULES = [
  { id: 'dec31-next', name: '31 ธ.ค. ของปีถัดจากปีที่ได้มา  (ข้อสรุป 1 ก.ย. 2569)',
    calc: function (year) { return (year + 1) + '-12-31'; } },
  { id: 'jun30-next', name: '30 มิ.ย. ของปีถัดไป  (ของเดิม ยกเลิกแล้ว)',
    calc: function (year) { return (year + 1) + '-06-30'; } },
  { id: 'dec31-same', name: '31 ธ.ค. ของปีที่ได้มา  (ไม่ยกข้ามปี)',
    calc: function (year) { return year + '-12-31'; } }
];

SS.DEPTS = [
  { id: 'ENG', name: 'วิศวกรรมและติดตั้ง' },
  { id: 'OM',  name: 'ปฏิบัติการและบำรุงรักษา' },
  { id: 'ADM', name: 'บริหารและธุรการ' }
];

/* ---------- lookup ---------- */
function finder(list) { return function (id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }; }
SS.jobType     = finder(SS.JOB_TYPES);
SS.travelType  = finder(SS.TRAVEL_TYPES);
SS.project     = finder(SS.PROJECTS);
SS.leaveType   = finder(SS.LEAVE_TYPES);
SS.dayType     = finder(SS.DAY_TYPES);
SS.dayStatus   = finder(SS.DAY_STATUS);
SS.leaveStatus = finder(SS.LEAVE_STATUS);
SS.role        = finder(SS.ROLES);
SS.dept        = finder(SS.DEPTS);
SS.stopReason  = finder(SS.SITE_STOP_REASONS);
SS.name = function (fn, id) { var o = fn(id); return o ? o.name : (id || '—'); };
