/* ==========================================================================
   store.js — สถานะระบบ + การกระทำ + S7 audit log
   mockup ไม่มี backend · เก็บใน localStorage ของเครื่องผู้ทดสอบเท่านั้น
   ========================================================================== */
window.SS = window.SS || {};

SS.store = (function () {
  var KEY = 'ss-hr-uat-v2';
  var state = null, listeners = [];

  /* ---------- สร้างข้อมูลเช็คอินย้อนหลัง ---------- */
  function seedCheckins(leaves) {
    var rnd = SS.rng(20690903), T = SS.d.today(), rows = [];
    var blocked = {};
    leaves.forEach(function (l) {
      if (l.status !== 'approved' && l.status !== 'used') return;
      if (l.halfDay) return;                       /* ลาครึ่งวันยังเช็คอินได้ */
      SS.d.eachDay(l.from, l.to, function (d) { blocked[l.empId + '|' + d] = 1; });
    });

    /* สถานะ "วันนี้" จัดไว้ให้ทดสอบได้ครบทุกกรณี */
    var todayPlan = {
      'EMP-100': { t: '08:12', job: 'office' },
      'EMP-101': { t: '08:05', job: 'onsite', prj: 'PRJ-CRR' },
      'EMP-102': { t: '07:58', job: 'om', prj: 'PRJ-HYATT' },
      'EMP-103': { t: '08:22', job: 'office' },
      'EMP-201': null,                                              /* ยังไม่เช็คอิน — ใช้ทดสอบฟอร์ม */
      'EMP-202': { t: '08:26', job: 'office' },
      'EMP-203': { t: '08:58', job: 'onsite', prj: 'PRJ-MVP' },     /* เข้าสาย */
      'EMP-204': { t: '08:33', job: 'onsite', prj: 'PRJ-CRR' },
      'EMP-205': { t: '09:12', job: 'om', prj: 'PRJ-HYS' },         /* เข้าสาย */
      'EMP-206': { t: '20:05', job: 'office' },                     /* กะกลางคืน — ไม่ถือว่าสาย */
      'EMP-207': null                                               /* ยังไม่เช็คอิน */
    };

    SS.SEED_EMPLOYEES.forEach(function (emp) {
      if (emp.isTest) return;
      for (var back = 44; back >= 0; back--) {
        var date = SS.d.add(T, -back);
        var cal = SS.SEED_CAL_CACHE[date];
        var working = cal ? (SS.dayType(cal.type) || {}).working : true;
        if (blocked[emp.id + '|' + date]) continue;

        if (date === T) {
          var p = todayPlan[emp.id];
          if (p) rows.push(mk(emp, date, p.t, p.job, p.prj, false));
          continue;
        }
        if (!working) {
          /* CI-08 · มีคนทำงานในวันหยุดบ้าง เพื่อให้มีคำขอวันชดเชยให้ทดสอบ */
          if (emp.id === 'EMP-203' && back === 6) rows.push(mk(emp, date, '08:20', 'onsite', 'PRJ-MVP', true));
          continue;
        }
        var r = rnd();
        if (r < 0.02) continue;                                     /* ขาดงาน */
        var late = r < 0.11;
        var t = emp.shift === 'night'
          ? SS.d.hhmm(1200 + Math.floor(rnd() * 20))
          : SS.d.hhmm(late ? 526 + Math.floor(rnd() * 40) : 478 + Math.floor(rnd() * 44));
        var job = emp.defaultJobType;
        if (job !== 'office' && rnd() < 0.18) job = rnd() < 0.5 ? 'om' : 'survey';
        var sites = SS.JOB_TYPES.filter(function (j) { return j.id === job; })[0];
        var pool = SS.PROJECTS.filter(function (pr) { return sites.siteFilter.indexOf(pr.status) >= 0; });
        var prj = sites.requireSite && pool.length ? pool[Math.floor(rnd() * pool.length)].id : null;
        rows.push(mk(emp, date, t, job, prj, false));
      }
    });
    return rows;

    function mk(emp, date, time, job, prj, holidayWork) {
      var jt = SS.jobType(job);
      return {
        id: 'CI-' + emp.id + '-' + date, empId: emp.id, date: date, time: time,
        jobType: job, projectId: prj, otherPlace: '',
        travelType: emp.shift === 'night' ? 'night' : jt.defaultTravel,
        travelChanged: false, siteStop: null, visits: [], geo: null, overtime: false,
        detail: holidayWork ? 'เร่งงานติดตั้งก่อนส่งมอบ' : '',
        status: 'active', rawSite: null, createdAt: date + ' ' + time, editLog: []
      };
    }
  }

  function fresh() {
    var T = SS.d.today(), y = SS.d.year(T);
    SS.SEED_CAL_CACHE = SS.SEED_CALENDAR(y);
    var leaves = SS.SEED_LEAVES(T);
    return {
      currentUserId: 'EMP-201',
      seededOn: T,
      params: JSON.parse(JSON.stringify(SS.DEFAULT_PARAMS)),
      employees: JSON.parse(JSON.stringify(SS.SEED_EMPLOYEES)),
      projects: JSON.parse(JSON.stringify(SS.PROJECTS)),
      rates: JSON.parse(JSON.stringify(SS.ALLOWANCE_RATES)),
      jobTypes: JSON.parse(JSON.stringify(SS.JOB_TYPES)),
      travelTypes: JSON.parse(JSON.stringify(SS.TRAVEL_TYPES)),
      stopReasons: JSON.parse(JSON.stringify(SS.SITE_STOP_REASONS)),   /* S21 · CI-26 */
      authority: JSON.parse(JSON.stringify(SS.SEED_AUTHORITY)),
      calendar: SS.SEED_CAL_CACHE,
      balances: SS.SEED_BALANCES(y),
      events: SS.SEED_EVENTS(T),
      leaves: leaves,
      checkins: seedCheckins(leaves),
      compRequests: [],
      otRequests: [],
      editRequests: [],
      audit: [],
      feedback: [],
      lastChoice: {},
      geoNoticeSeen: false          /* CI-28 · ประกาศ PDPA ขึ้นครั้งเดียว */
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      var s = JSON.parse(raw);
      if (!s || s.seededOn !== SS.d.today()) {      /* seed อิงวันที่ — ข้ามวันแล้วสร้างใหม่ */
        var n = fresh();
        n.feedback = (s && s.feedback) || [];
        n.currentUserId = (s && s.currentUserId) || n.currentUserId;
        return n;
      }
      return s;
    } catch (e) { return fresh(); }
  }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function emit() { save(); listeners.forEach(function (f) { f(state); }); }

  /* ---------- S7 · audit log — ลบไม่ได้ แก้ไม่ได้ (APV-13) ---------- */
  function log(action, target, detail, snapshot) {
    state.audit.push({
      id: 'AU-' + (state.audit.length + 1),
      at: new Date().toISOString(),
      by: state.currentUserId,
      byName: (employee(state.currentUserId) || {}).name || '',
      action: action, target: target, detail: detail,
      snapshot: snapshot === undefined ? null : snapshot
    });
  }

  function employee(id) { for (var i = 0; i < state.employees.length; i++) if (state.employees[i].id === id) return state.employees[i]; return null; }
  function byRole(r) { return state.employees.filter(function (e) { return e.role === r && e.active; }); }

  var api = {
    init: function () { state = load(); return state; },
    get: function () { return state; },
    onChange: function (f) { listeners.push(f); },
    reset: function () { var fb = state.feedback, u = state.currentUserId; state = fresh(); state.feedback = fb; state.currentUserId = u; emit(); },
    log: log, emit: emit,

    /* ---------- ผู้ใช้ ---------- */
    user: function () { return employee(state.currentUserId); },
    setUser: function (id) { state.currentUserId = id; emit(); },
    employee: employee,
    byRole: byRole,
    team: function (mgrId) { return state.employees.filter(function (e) { return e.managerId === mgrId && e.active && !e.isTest; }); },
    /* DSH-03 · ตัดบัญชีทดสอบออกจากทุกตัวเลข ห้ามลบบัญชี */
    counted: function () { return state.employees.filter(function (e) { return e.active && !e.isTest; }); },

    /* ---------- CI-11 · จำค่าล่าสุด ---------- */
    lastChoice: function (empId) { return state.lastChoice[empId] || null; },

    /* ---------- เช็คอิน ---------- */
    checkIn: function (data) {
      var T = SS.d.today();
      if (SS.core.checkinOf(data.empId, T)) return { ok: false, msg: 'วันนี้ลงเวลาไปแล้ว' };
      var st = SS.core.dayStatus(data.empId, T);
      /* BR-07 · เช็คอินในวันที่มีใบลาอนุมัติแล้ว */
      if (st.leave && !st.leave.halfDay) {
        return { ok: false, needCancelLeave: st.leave,
                 msg: 'วันนี้มีใบลา ' + st.leave.id + ' ที่อนุมัติแล้ว — ต้องยกเลิกใบลาเพื่อคืนยอดก่อน จึงจะเช็คอินได้ (BR-07)' };
      }
      var rec = {
        id: 'CI-' + data.empId + '-' + T, empId: data.empId, date: T, time: SS.d.now(),
        jobType: data.jobType, projectId: data.projectId || null, otherPlace: data.otherPlace || '',
        travelType: data.travelType, travelChanged: !!data.travelChanged,
        /* ช่องเหตุผลถูกตัดออกทั้งช่องเมื่อ 8 ก.ย. 2569 (CI-18) — การควบคุมย้ายไปที่ธงอัตโนมัติ
           ที่ core.mealFlag() คำนวณตอนอ่าน จึงไม่มี travelReason ในรายการใหม่อีก */
        siteStop: null,
        visits: [],                       /* CI-25 · ไซต์ที่แวะเพิ่ม ไม่สร้างวันใหม่ ไม่เพิ่มมื้อ */
        geo: data.geo || null,            /* CI-28 · บันทึกอย่างเดียว ห้ามบล็อก ห้ามแสดงให้พนักงานเห็น */
        overtime: !!data.overtime, detail: data.detail || '', status: 'active',
        rawSite: null, createdAt: T + ' ' + SS.d.now(), editLog: []
      };
      state.checkins.push(rec);
      state.lastChoice[data.empId] = { jobType: data.jobType, projectId: data.projectId || null, travelType: data.travelType };
      log('เช็คอิน', rec.id, 'ประเภทงาน ' + SS.name(SS.jobType, data.jobType) + (data.projectId ? ' · ' + SS.name(SS.project, data.projectId) : ''));

      /* CI-08 · เช็คอินในวันที่ปฏิทินระบุว่าหยุด → สร้างคำขอลาชดเชยเข้าคิวอนุมัติ */
      var cal = SS.core.calendar(T), comp = null;
      if (cal.comp) {
        comp = {
          id: 'CP-' + (state.compRequests.length + 1001), empId: data.empId, date: T,
          days: state.params.holidayCompRate, source: 'วันหยุดตามปฏิทิน (' + SS.name(SS.dayType, cal.type) + ')',
          status: 'pending', createdAt: T, approverId: null, note: ''
        };
        state.compRequests.push(comp);
        log('สร้างคำขอวันชดเชย', comp.id, 'จากการเช็คอินในวันหยุด');
      }
      emit();
      return { ok: true, rec: rec, comp: comp, late: SS.core.lateMinutes(rec) };
    },

    /* CI-06 · แก้ไขเช็คอิน — ห้ามแก้เวลา ห้ามลบ */
    editCheckin: function (id, patch, reason) {
      var c = state.checkins.filter(function (x) { return x.id === id; })[0];
      if (!c) return { ok: false, msg: 'ไม่พบรายการ' };
      var hrs = (SS.d.diff(c.date, SS.d.today())) * 24 + (SS.d.min(SS.d.now()) - SS.d.min(c.time)) / 60;
      var within = hrs <= state.params.selfEditHours;
      var before = { jobType: c.jobType, projectId: c.projectId, travelType: c.travelType, detail: c.detail };
      if (!within) {
        var req = {
          id: 'ER-' + (state.editRequests.length + 1001), checkinId: id, empId: c.empId, date: c.date,
          before: before, after: patch, reason: reason || '', status: 'pending', createdAt: SS.d.today()
        };
        state.editRequests.push(req);
        log('ยื่นขอแก้เช็คอิน', req.id, 'เกิน ' + state.params.selfEditHours + ' ชั่วโมง จึงต้องผ่านหัวหน้างาน');
        emit();
        return { ok: true, needApproval: true, req: req };
      }
      Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
      c.editLog.push({ at: new Date().toISOString(), by: state.currentUserId, before: before, after: patch, reason: reason || '' });
      log('แก้ไขเช็คอิน', id, JSON.stringify(before) + ' → ' + JSON.stringify(patch), before);
      emit();
      return { ok: true, needApproval: false };
    },

    /* ---------- CI-25 · แวะไซต์เพิ่ม ----------
       วันยังเป็นหน่วยเดียว — การแวะไม่สร้างวันใหม่ ไม่เพิ่มมื้อ ไม่เพิ่มวันชดเชย
       การนับคน-วัน: 1.0 ยกให้ไซต์หลักเสมอ ไซต์ที่แวะนับเป็น "จำนวนครั้งที่เข้าไซต์"
       ห้ามนับ 1 คน-วันให้ทุกไซต์ ต้นทุนโครงการจะบวมเกินจริง */
    addVisit: function (checkinId, data) {
      var c = state.checkins.filter(function (x) { return x.id === checkinId; })[0];
      if (!c) return { ok: false, msg: 'ไม่พบรายการเช็คอิน' };
      if (c.status !== 'active') return { ok: false, msg: 'รายการนี้ถูกยกเลิกไปแล้ว' };
      var cap = +state.params.maxVisitsPerDay || 0;
      if (!cap) return { ok: false, msg: 'ปิดการใช้งานการแวะไซต์เพิ่มอยู่ (ตั้งค่าเป็น 0)' };
      if ((c.visits || []).length >= cap) return { ok: false, msg: 'แวะได้ไม่เกิน ' + cap + ' ไซต์ต่อวัน' };
      if (!data.projectId) return { ok: false, msg: 'กรุณาเลือกไซต์ที่แวะ' };
      if (!String(data.detail || '').trim()) return { ok: false, msg: 'กรุณากรอกงานที่ทำที่ไซต์นี้' };
      if (data.projectId === c.projectId) return { ok: false, msg: 'ไซต์นี้เป็นไซต์หลักของวันนี้อยู่แล้ว' };
      if ((c.visits || []).some(function (v) { return v.projectId === data.projectId; }))
        return { ok: false, msg: 'บันทึกการแวะไซต์นี้ไปแล้ววันนี้' };
      c.visits = c.visits || [];
      var v = {
        id: 'VS-' + c.id + '-' + (c.visits.length + 1),
        projectId: data.projectId, jobType: data.jobType || c.jobType,
        time: data.time || SS.d.now(), detail: String(data.detail).trim(),
        by: state.currentUserId, at: new Date().toISOString()
      };
      c.visits.push(v);
      log('บันทึกแวะไซต์เพิ่ม', c.id, SS.name(SS.project, v.projectId) + ' · ' + v.time + ' · ' + v.detail);
      emit();
      return { ok: true, visit: v };
    },
    removeVisit: function (checkinId, visitId, reason) {
      var c = state.checkins.filter(function (x) { return x.id === checkinId; })[0];
      if (!c || !c.visits) return { ok: false };
      var v = c.visits.filter(function (x) { return x.id === visitId; })[0];
      c.visits = c.visits.filter(function (x) { return x.id !== visitId; });
      log('ลบรายการแวะไซต์', c.id, (v ? SS.name(SS.project, v.projectId) + ' · ' : '') + (reason || 'ไม่ระบุเหตุผล'));
      emit();
      return { ok: true };
    },

    /* ---------- CI-28 · ประกาศเรื่องการเก็บพิกัด ----------
       ขึ้นครั้งเดียวตอนใช้ครั้งแรก ไม่ใช่ถามทุกวัน */
    geoNoticeSeen: function () { return !!state.geoNoticeSeen; },
    markGeoNotice: function () { state.geoNoticeSeen = true; emit(); },

    /* ---------- CI-26 · หยุดงานที่ไซต์ ----------
       กดได้หลังเช็คอินแล้วเท่านั้น — ต้องไปถึงก่อนถึงจะหยุดได้
       ยังได้มื้อ ไม่นับขาดงาน ไม่หักวันลา และไม่ถือเป็นการเปลี่ยนจำนวนมื้อ จึงไม่ขึ้นธงตาม CI-18 */
    setSiteStop: function (checkinId, data) {
      var c = state.checkins.filter(function (x) { return x.id === checkinId; })[0];
      if (!c) return { ok: false, msg: 'ไม่พบรายการเช็คอิน' };
      if (c.status !== 'active') return { ok: false, msg: 'รายการนี้ถูกยกเลิกไปแล้ว' };
      var r = SS.stopReason(data.reason);
      if (!r) return { ok: false, msg: 'กรุณาเลือกเหตุผลจากรายการ' };
      if (r.free && !String(data.note || '').trim()) return { ok: false, msg: 'เลือก "เหตุอื่น" ต้องระบุว่าเหตุอะไร' };
      c.siteStop = {
        reason: data.reason, note: data.note || '',
        allDay: !!data.allDay, from: data.allDay ? null : (data.from || null),
        by: state.currentUserId, at: new Date().toISOString()
      };
      log('บันทึกหยุดงานที่ไซต์', checkinId,
          SS.name(SS.stopReason, data.reason) + (data.note ? ' · ' + data.note : '') +
          (data.allDay ? ' · ทั้งวัน' : ' · ตั้งแต่ ' + (data.from || '—')) +
          (state.currentUserId !== c.empId ? ' · หัวหน้ากดแทน ' + (employee(c.empId) || {}).name : ''));
      emit();
      return { ok: true, rec: c };
    },
    clearSiteStop: function (checkinId, reason) {
      var c = state.checkins.filter(function (x) { return x.id === checkinId; })[0];
      if (!c || !c.siteStop) return { ok: false };
      c.siteStop = null;
      log('ยกเลิกการหยุดงานที่ไซต์', checkinId, reason || '');
      emit();
      return { ok: true };
    },

    cancelCheckin: function (id, reason) {
      var c = state.checkins.filter(function (x) { return x.id === id; })[0];
      if (!c) return { ok: false };
      c.status = 'cancelled';
      c.editLog.push({ at: new Date().toISOString(), by: state.currentUserId, before: { status: 'active' }, after: { status: 'cancelled' }, reason: reason || '' });
      log('ยกเลิกเช็คอิน', id, reason || '');
      emit();
      return { ok: true };
    },

    /* ---------- ใบลา ---------- */
    submitLeave: function (data) {
      var id = 'LV-' + (1013 + state.leaves.filter(function (l) { return l.id.indexOf('LV-') === 0; }).length);
      var lv = {
        id: id, empId: data.empId, type: data.type, from: data.from, to: data.to,
        halfDay: data.halfDay || null, reason: data.reason, status: 'pending',
        approverId: null, approverNote: '', onBehalfOf: null,
        attachment: data.attachment || '', ackOverQuota: !!data.ackOverQuota,
        createdAt: SS.d.today(), decidedAt: null, bucketPlan: data.bucketPlan || null,
        lateNotice: !!data.lateNotice, lateReason: data.lateReason || ''
      };
      /* APV-04 · ขั้นตรวจอัตโนมัติก่อนถึงคน */
      var chk = SS.core.autoCheckLeave(lv);
      if (!chk.pass) {
        lv.status = 'bounced';
        lv.bounceIssues = chk.issues;
        state.leaves.push(lv);
        log('ตีกลับใบลาอัตโนมัติ', id, chk.issues.map(function (i) { return i.code + ' ' + i.msg; }).join(' · '));
        emit();
        return { ok: false, bounced: true, leave: lv, check: chk };
      }
      lv.warns = chk.warns;
      state.leaves.push(lv);
      log('ยื่นใบลา', id, SS.name(SS.leaveType, data.type) + ' ' + data.from + ' – ' + data.to);
      emit();
      return { ok: true, leave: lv, check: chk };
    },

    decideLeave: function (id, decision, note) {
      var lv = state.leaves.filter(function (l) { return l.id === id; })[0];
      if (!lv) return null;
      var me = state.currentUserId;
      var route = SS.core.approverOf(lv.empId, 'leave');
      lv.status = decision;
      lv.approverId = me;
      lv.approverNote = note || '';
      lv.decidedAt = SS.d.today();
      if (route.onBehalf) lv.onBehalfOf = route.onBehalf.id;
      /* BR-01 · บันทึกแผนการตัดถังไว้กับใบ เพื่อคืนเข้าถังเดิมได้ (BR-12) */
      if (decision === 'approved') {
        var t = SS.leaveType(lv.type);
        if (t.bucket === 'annual' || t.bucket === 'comp') {
          var alloc = SS.core.allocate(lv.empId, SS.core.leaveDays(lv));
          lv.bucketPlan = alloc.plan;
          applyBuckets(lv.empId, alloc.plan, -1);
        }
      }
      log(decision === 'approved' ? 'อนุมัติใบลา' : 'ไม่อนุมัติใบลา', id,
          (note || '') + (route.onBehalf ? ' · อนุมัติแทน ' + route.onBehalf.name : ''),
          { status: lv.status, days: SS.core.leaveDays(lv) });
      emit();
      return lv;
    },

    cancelLeave: function (id, reason) {
      var lv = state.leaves.filter(function (l) { return l.id === id; })[0];
      if (!lv) return null;
      var wasApproved = lv.status === 'approved';
      lv.status = 'cancelled';
      lv.cancelReason = reason || '';
      /* BR-12 · ยกเลิกหลังอนุมัติ → คืนเข้าถังเดิมที่ตัดมา */
      if (wasApproved && lv.bucketPlan) applyBuckets(lv.empId, lv.bucketPlan, +1);
      log('ยกเลิกใบลา', id, reason || '');
      emit();
      return lv;
    },

    /* คืน/ตัดยอดตามแผนถัง (BR-12 · คืนเข้าถังเดิมเสมอ) */
    applyBuckets: applyBuckets,

    /* ---------- CI-08 · วันชดเชย ---------- */
    decideComp: function (id, decision, note) {
      var c = state.compRequests.filter(function (x) { return x.id === id; })[0];
      if (!c) return null;
      c.status = decision; c.approverId = state.currentUserId; c.note = note || '';
      if (decision === 'approved') {
        var y = SS.d.year(c.date), b = state.balances[c.empId];
        b.comp[y] = (b.comp[y] || 0) + c.days;
        log('อนุมัติวันชดเชย', id, '+' + c.days + ' วัน · หมดอายุ ' + SS.core.expiryOf(y));
      } else { log('ไม่อนุมัติวันชดเชย', id, note || ''); }
      emit();
      return c;
    },

    /* ---------- CI-10 · ทำงานนอกเวลา ---------- */
    submitOT: function (data) {
      var mins = SS.d.min(data.end) - SS.d.min(data.start);
      if (mins < 0) mins += 1440;
      var req = {
        id: 'OT-' + (state.otRequests.length + 1001), empId: data.empId, date: data.date,
        projectId: data.projectId || null, start: data.start, end: data.end,
        hours: Math.round(mins / 6) / 10, reason: data.reason, status: 'pending', approverId: null, note: ''
      };
      state.otRequests.push(req);
      log('ยื่นทำงานนอกเวลา', req.id, req.hours + ' ชั่วโมง');
      emit();
      return req;
    },
    decideOT: function (id, decision, note) {
      var r = state.otRequests.filter(function (x) { return x.id === id; })[0];
      if (!r) return null;
      r.status = decision; r.approverId = state.currentUserId; r.note = note || '';
      if (decision === 'approved') {
        var b = state.balances[r.empId];
        b.otCarry = (b.otCarry || 0) + r.hours;
        var per = state.params.otHoursPerDay, gained = Math.floor(b.otCarry / per);
        if (gained > 0) {
          b.otCarry = Math.round((b.otCarry - gained * per) * 10) / 10;
          var y = SS.d.year(r.date);
          b.comp[y] = (b.comp[y] || 0) + gained;
        }
        log('อนุมัติทำงานนอกเวลา', id, r.hours + ' ชม. · แปลงเป็น ' + gained + ' วัน · ค้าง ' + b.otCarry + ' ชม.');
      } else { log('ไม่อนุมัติทำงานนอกเวลา', id, note || ''); }
      emit();
      return r;
    },

    decideEditRequest: function (id, decision, note) {
      var r = state.editRequests.filter(function (x) { return x.id === id; })[0];
      if (!r) return null;
      r.status = decision; r.approverId = state.currentUserId; r.note = note || '';
      if (decision === 'approved') {
        var c = state.checkins.filter(function (x) { return x.id === r.checkinId; })[0];
        if (c) {
          Object.keys(r.after).forEach(function (k) { c[k] = r.after[k]; });
          c.editLog.push({ at: new Date().toISOString(), by: state.currentUserId, before: r.before, after: r.after, reason: r.reason });
        }
      }
      log(decision === 'approved' ? 'อนุมัติการแก้เช็คอิน' : 'ไม่อนุมัติการแก้เช็คอิน', id, note || '');
      emit();
      return r;
    },

    /* ---------- ตั้งค่า ---------- */
    setParam: function (k, v) {
      var old = state.params[k];
      state.params[k] = v;
      log('แก้พารามิเตอร์', k, old + ' → ' + v);
      emit();
    },
    setDayType: function (date, type, name) {
      var old = state.calendar[date];
      state.calendar[date] = { type: type, name: name || '' };
      log('แก้ปฏิทินทำงาน', date, (old ? old.type : '-') + ' → ' + type);
      emit();
    },
    setEmployee: function (id, patch) {
      var e = employee(id); if (!e) return;
      var before = {};
      Object.keys(patch).forEach(function (k) { before[k] = e[k]; e[k] = patch[k]; });
      log('แก้ทะเบียนพนักงาน', id, JSON.stringify(before) + ' → ' + JSON.stringify(patch), before);
      emit();
    },
    setProjectStatus: function (id, status) {
      var p = state.projects.filter(function (x) { return x.id === id; })[0];
      if (!p) return;
      log('แก้สถานะโครงการ', id, p.status + ' → ' + status);
      p.status = status;
      emit();
    },

    /* ---------- UAT feedback ---------- */
    addFeedback: function (fb) {
      /* เลขที่ห้ามซ้ำแม้ลบรายการกลาง ๆ ไปแล้ว — ปุ่มแก้ไขอ้างอิงเลขที่นี้ */
      var max = 0;
      state.feedback.forEach(function (f) { var n = +String(f.id).replace('FB-', ''); if (n > max) max = n; });
      fb.id = 'FB-' + (max + 1);
      fb.at = new Date().toISOString();
      fb.editedAt = null;
      state.feedback.push(fb); emit(); return fb;
    },
    updateFeedback: function (id, patch) {
      var f = state.feedback.filter(function (x) { return x.id === id; })[0];
      if (!f) return null;
      Object.keys(patch).forEach(function (k) { f[k] = patch[k]; });
      f.editedAt = new Date().toISOString();   /* เก็บเวลาที่บันทึกครั้งแรกไว้ ไม่ทับ */
      emit(); return f;
    },
    feedbackItem: function (id) {
      return state.feedback.filter(function (f) { return f.id === id; })[0] || null;
    },
    removeFeedback: function (id) {
      state.feedback = state.feedback.filter(function (f) { return f.id !== id; }); emit();
    }
  };

  function applyBuckets(empId, plan, sign) {
    var b = state.balances[empId]; if (!b || !plan) return;
    plan.forEach(function (p) {
      var parts = p.key.split('-');
      if (parts[0] === 'comp') b.comp[parts[1]] = (b.comp[parts[1]] || 0) + sign * p.days;
      else if (parts[0] === 'carry') b.annualCarry[parts[1]] = (b.annualCarry[parts[1]] || 0) + sign * p.days;
      else if (parts[0] === 'annual') b.annual = (b.annual || 0) + sign * p.days;
      else if (parts[0] === 'special') { var sp = b.special[+parts[1]]; if (sp) sp.days += sign * p.days; }
    });
  }

  return api;
})();
