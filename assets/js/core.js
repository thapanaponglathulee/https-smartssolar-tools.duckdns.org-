/* ==========================================================================
   core.js — บริการกลาง
   รวมกติกาที่หลายเมนูใช้ร่วมกันไว้ที่เดียว ตามหลักการข้อ 1 ของสัญญากลาง
   ห้ามเมนูใดคำนวณเรื่องเหล่านี้เอง:
     · S5  สถานะรายวัน            (CI-14)
     · S15 ถังวันลาและลำดับการตัด (BR-01)
     · โควตา ยอดใช้ไป/ยอดจอง      (BR-12)
     · S2  ผู้อนุมัติ              (APV-01/02/03 · J4)
     · ขั้นตรวจอัตโนมัติ           (APV-04)
     · เบี้ยเลี้ยงรายวัน            (ALW-06)

   หมายเหตุ: เจ้าของ S5 ยังไม่เคาะ (สัญญากลาง ข้อ 6.3)
   mockup เลือกทำเป็นบริการกลาง รอยืนยันก่อนพัฒนาจริง
   ========================================================================== */
window.SS = window.SS || {};

SS.core = (function () {
  function db() { return SS.store.get(); }
  function P() { return db().params; }

  /* ======================================================================
     S3 · ปฏิทิน
     ====================================================================== */
  function calendar(date) {
    var c = db().calendar[date];
    if (c) { var t = SS.dayType(c.type) || {}; return { type: c.type, name: c.name || '', working: !!t.working, comp: !!t.comp }; }
    var dow = SS.d.dow(date);
    var type = dow === 0 ? 'sunday' : dow === 6 ? 'sat-off' : 'work';
    var t2 = SS.dayType(type);
    return { type: type, name: '', working: t2.working, comp: t2.comp };
  }
  function isWorkingDay(date) { return calendar(date).working; }

  /* BR-06 · วันหยุดที่คั่นกลางไม่นับเป็นวันลา (ยกเว้นหน่วยนับแบบวันปฏิทิน) */
  function countDays(from, to, unit) {
    var n = 0;
    SS.d.eachDay(from, to, function (d) { if (unit === 'cal' || isWorkingDay(d)) n++; });
    return n;
  }

  /* จำนวนวันของใบลาหนึ่งใบ */
  function leaveDays(lv) {
    if (lv.halfDay) return 0.5;
    var t = SS.leaveType(lv.type) || { unit: 'work' };
    return countDays(lv.from, lv.to, t.unit);
  }

  /* BR-08 · ใบลาคร่อมสิ้นปี — แยกจำนวนวันตามปีของแต่ละวัน */
  function daysByYear(lv) {
    var t = SS.leaveType(lv.type) || { unit: 'work' }, out = {};
    if (lv.halfDay) { out[SS.d.year(lv.from)] = 0.5; return out; }
    SS.d.eachDay(lv.from, lv.to, function (d) {
      if (t.unit !== 'cal' && !isWorkingDay(d)) return;
      var y = SS.d.year(d); out[y] = (out[y] || 0) + 1;
    });
    return out;
  }

  /* ======================================================================
     S5 · สถานะรายวัน (CI-14)
     *** คำนวณจากข้อมูลดิบทุกครั้งที่แสดงผล ไม่บันทึกทับตอนสิ้นวัน ***
     ลำดับ: เช็คอิน → ลาอนุมัติ → ลารออนุมัติ → วันหยุด → ยกเว้น → ขาดงาน
     ====================================================================== */
  function dayStatus(empId, date) {
    var emp = SS.store.employee(empId);
    var cal = calendar(date);
    var ci = checkinOf(empId, date);
    var leaves = db().leaves.filter(function (l) {
      return l.empId === empId && l.from <= date && l.to >= date;
    });
    var approved = leaves.filter(function (l) { return l.status === 'approved' || l.status === 'used'; })[0];
    var pending  = leaves.filter(function (l) { return l.status === 'pending'; })[0];

    /* 1 · เช็คอินชนะเสมอ — แต่ถ้าไปถึงแล้วทำงานไม่ได้ ให้เป็นสถานะที่ 8 (CI-26) */
    if (ci) {
      return {
        status: ci.siteStop ? 'sitestop' : 'work', checkin: ci, leave: approved || null, day: cal,
        /* ครึ่งวัน: ทำงานครึ่งวัน + ลาครึ่งวัน (LV-06 · CI-14) */
        half: approved && approved.halfDay ? approved.halfDay : null,
        workDays: approved && approved.halfDay ? 0.5 : 1,
        note: cal.comp ? 'ทำงานในวันหยุด' : ''
      };
    }
    /* 2 · ใบลาที่อนุมัติแล้ว */
    if (approved) return { status: 'leave', leave: approved, day: cal, workDays: 0 };
    /* 3 · ใบลาที่ยังรออนุมัติ — เลยวันลาแล้วยังไม่ตัดสิน = รอตรวจสอบ */
    if (pending) {
      if (date < SS.d.today()) return { status: 'review', leave: pending, day: cal, workDays: 0 };
      return { status: 'pending', leave: pending, day: cal, workDays: 0 };
    }
    /* 4 · วันหยุดตามปฏิทิน */
    if (!cal.working) return { status: 'holiday', day: cal, workDays: 0 };
    /* 5 · ยกเว้นการเช็คอินรายบุคคล (CI-07) */
    if (emp && emp.exemptCheckin) return { status: 'exempt', day: cal, workDays: 0 };
    /* วันในอนาคตยังไม่ตัดสินว่าขาดงาน */
    if (date > SS.d.today()) return { status: 'holiday', future: true, day: cal, workDays: 0 };
    /* 6 · ขาดงาน + สาเหตุประกอบ
       CI-14 ยกตัวอย่างว่าสถานะ "ขาดงาน" เกิดตอน "สิ้นวัน" — ระหว่างวันจึงยังไม่ตัดสิน
       เก็บสถานะเดิมไว้เป็น absent (คงไว้ที่ 7 สถานะ) แต่ติดธง notYet ให้หน้าจอ
       แสดงว่า "ยังไม่เช็คอิน" จนกว่าจะเลยเวลาเลิกงาน */
    var rejected  = leaves.filter(function (l) { return l.status === 'rejected'; })[0];
    var cancelled = leaves.filter(function (l) { return l.status === 'cancelled'; })[0];
    var notYet = (date === SS.d.today()) && SS.d.min(SS.d.now()) < SS.d.min(P().workEnd);
    return {
      status: 'absent', day: cal, workDays: 0, notYet: notYet,
      cause: rejected ? 'rejected' : cancelled ? 'cancelled' : 'none',
      causeLeave: rejected || cancelled || null
    };
  }

  function checkinOf(empId, date) {
    return db().checkins.filter(function (c) {
      return c.empId === empId && c.date === date && c.status === 'active';
    })[0] || null;
  }

  /* มาสายกี่นาที — กะกลางคืนเทียบเวลาเริ่มกะ (CI-13) */
  function lateMinutes(ci) {
    if (!ci || !ci.time) return 0;
    var emp = SS.store.employee(ci.empId) || {};
    var start = emp.shift === 'night' ? P().nightStart : P().workStart;
    var limit = SS.d.min(start) + (+P().graceMinutes || 0);
    var t = SS.d.min(ci.time);
    if (emp.shift === 'night' && t < 720) return 0;   /* เช็คอินหลังเที่ยงคืนของกะเดิม */
    return Math.max(0, t - limit);
  }

  /* ======================================================================
     S15 · ถังวันลา และลำดับการตัด (BR-01)
     ลำดับตายตัว 4 ถัง: ① ลาชดเชยปีก่อน ② พักร้อนสะสมปีก่อน
                        ③ ลาชดเชยปีนี้  ④ พักร้อนปีนี้
     โควตาพิเศษแทรกตามวันหมดอายุที่ระบุ · ถังที่หมดพร้อมกันตัดลาชดเชยก่อน
     ====================================================================== */
  function expiryOf(year) {
    var r = SS.EXPIRY_RULES.filter(function (x) { return x.id === P().expiryRule; })[0] || SS.EXPIRY_RULES[0];
    return r.calc(year);
  }

  function buckets(empId) {
    var thisYear = SS.d.year(SS.d.today()), today = SS.d.today();
    var s = db().balances[empId] || { comp: {}, annualCarry: {}, annual: 0, special: [] };
    var out = [];

    Object.keys(s.comp || {}).forEach(function (y) {
      out.push({ key: 'comp-' + y, kind: 'comp', year: +y, label: 'ลาชดเชยวันทำงาน ถังปี ' + (+y + 543),
                 days: s.comp[y], expiry: expiryOf(+y), order: (+y < thisYear ? 1 : 3) });
    });
    Object.keys(s.annualCarry || {}).forEach(function (y) {
      out.push({ key: 'carry-' + y, kind: 'annual', year: +y, label: 'พักร้อนสะสมจากปี ' + (+y + 543),
                 days: s.annualCarry[y], expiry: expiryOf(+y), order: 2 });
    });
    out.push({ key: 'annual-' + thisYear, kind: 'annual', year: thisYear, label: 'พักร้อนของปีนี้',
               days: s.annual || 0, expiry: expiryOf(thisYear), order: 4 });
    (s.special || []).forEach(function (sp, i) {
      out.push({ key: 'special-' + i, kind: 'special', year: SS.d.year(sp.expiry), label: 'โควตาพิเศษ · ' + sp.reason,
                 days: sp.days, expiry: sp.expiry, order: 0, special: true });
    });

    out.forEach(function (b) { b.expired = b.expiry < today; });
    /* โควตาพิเศษแทรกตามวันหมดอายุ · ที่เหลือเรียงตามลำดับตายตัว */
    return out.sort(function (a, b) {
      if (a.special !== b.special) {
        var sp = a.special ? a : b, other = a.special ? b : a;
        return sp.expiry <= other.expiry ? (a.special ? -1 : 1) : (a.special ? 1 : -1);
      }
      if (a.expiry !== b.expiry) return a.expiry < b.expiry ? -1 : 1;
      return a.order - b.order;
    });
  }

  /* พรีวิวว่าจะตัดจากถังไหนบ้าง — ต้องแสดงก่อนกดส่ง (BR-01) */
  function allocate(empId, days) {
    var left = days, plan = [], bs = buckets(empId);
    bs.forEach(function (b) {
      if (left <= 0 || b.expired || b.days <= 0) return;
      var take = Math.min(b.days, left);
      plan.push({ key: b.key, label: b.label, days: take, expiry: b.expiry });
      left -= take;
    });
    return { plan: plan, shortfall: Math.round(left * 10) / 10 };
  }

  /* ======================================================================
     BR-12 · โควตา — แยก "ยอดใช้ไป" ออกจาก "ยอดจอง"
     ====================================================================== */
  function quota(empId, typeId) {
    var t = SS.leaveType(typeId), year = String(SS.d.year(SS.d.today()));
    var emp = SS.store.employee(empId) || {};
    var mine = db().leaves.filter(function (l) {
      return l.empId === empId && l.type === typeId && String(SS.d.year(l.from)) === year;
    });
    function sum(sts) {
      return mine.filter(function (l) { return sts.indexOf(l.status) >= 0; })
                 .reduce(function (a, l) { return a + (l.paidDays !== undefined ? l.days : leaveDays(l)); }, 0);
    }
    var used = sum(['approved', 'used']);
    var reserved = sum(['pending']);

    /* ถังจริงสำหรับพักร้อนและลาชดเชย · ประเภทอื่นใช้โควตาตรง ๆ */
    var total = null;
    if (t.bucket === 'annual' || t.bucket === 'comp') {
      total = buckets(empId).filter(function (b) { return !b.expired && (t.bucket === 'comp' ? b.kind === 'comp' : b.kind !== 'comp'); })
                            .reduce(function (a, b) { return a + b.days; }, 0) + used;
    } else if (t.quota !== null && t.quota !== undefined) {
      total = t.quota;
    }

    return {
      type: t, total: total, paidDays: t.paidDays, used: used, reserved: reserved,
      remaining: total === null ? null : Math.max(0, total - used - reserved),
      unlimited: total === null,
      /* BR-09 · พักร้อนต้องผ่านการประเมินก่อน */
      locked: !!(t.needProbation && !emp.probationPassedDate),
      lockReason: t.needProbation && !emp.probationPassedDate ? 'ยังไม่บันทึกวันที่ผ่านการประเมิน จึงยังไม่ได้รับสิทธิ์ลาพักร้อน (BR-09)' : ''
    };
  }

  /* BR-02 · แยกวันที่ได้ค่าจ้าง / ไม่ได้ค่าจ้าง */
  function splitPaid(empId, typeId, days) {
    var t = SS.leaveType(typeId), q = quota(empId, typeId);
    var paidLimit;
    if (t.paidDays !== null && t.paidDays !== undefined) {
      paidLimit = Math.max(0, t.paidDays - q.used - q.reserved);
    } else if (q.total !== null) {
      paidLimit = q.remaining;
    } else { paidLimit = days; }
    var paid = Math.min(days, paidLimit);
    return { paid: paid, unpaid: Math.round((days - paid) * 10) / 10, rate: t.payRate };
  }

  /* ======================================================================
     S2 · ผู้อนุมัติ (APV-01/02/03 · J4)
     ตารางอำนาจอยู่ที่เดียว ห้ามเมนูอื่นเขียนเงื่อนไขซ้ำ
     ====================================================================== */
  function authorityRow(subject) {
    return db().authority.filter(function (a) { return a.subject === subject; })[0] || null;
  }

  function approverOf(empId, subject) {
    var row = authorityRow(subject) || { primary: 'manager', backup: 'backup', fallback: 'hr' };
    var emp = SS.store.employee(empId);
    if (!emp) return { approver: null, why: 'ไม่พบพนักงาน' };

    if (row.primary === 'hr') {
      var hr = SS.store.byRole('hr').filter(function (h) { return h.id !== empId; })[0];
      /* APV-03 · เรื่องของฝ่ายบุคคลเอง → ผู้บริหาร */
      if (emp.role === 'hr') return { approver: SS.store.byRole('exec')[0] || null, why: 'APV-03 · เรื่องของฝ่ายบุคคลเอง ขึ้นผู้บริหาร', escalated: true };
      return { approver: hr || null, why: 'ตารางอำนาจ · เบี้ยเลี้ยงไปที่ฝ่ายบุคคล' };
    }
    if (row.primary === 'exec') {
      return { approver: SS.store.byRole('exec')[0] || null, why: 'ตารางอำนาจ · เรื่องนี้ขึ้นผู้บริหาร' };
    }

    /* ใบลาและเรื่องที่เกี่ยวกับเวลาทำงาน → หัวหน้างานของผู้ยื่น */
    var mgr = emp.managerId ? SS.store.employee(emp.managerId) : null;
    /* APV-03 · ห้ามอนุมัติของตัวเอง */
    if (mgr && mgr.id === empId) mgr = null;
    if (!mgr && (emp.role === 'manager' || emp.role === 'hr')) {
      return { approver: SS.store.byRole('exec')[0] || null, why: 'APV-03 · ผู้ยื่นเป็นผู้อนุมัติเอง จึงขึ้นผู้บริหาร', escalated: true };
    }
    /* APV-02 · ผู้อนุมัติหลักลา → ผู้สำรอง */
    if (mgr && onLeaveToday(mgr.id)) {
      var backup = emp.backupApproverId ? SS.store.employee(emp.backupApproverId) : null;
      if (backup && !onLeaveToday(backup.id)) return { approver: backup, why: 'ผู้อนุมัติหลักลา · ผู้สำรองรับแทน', onBehalf: mgr };
      /* J4 · ผู้สำรองเว้นว่าง → ฝ่ายบุคคล */
      var hr2 = SS.store.byRole('hr').filter(function (h) { return h.id !== empId; })[0];
      return { approver: hr2 || null, why: 'J4 · ไม่มีผู้สำรอง ตกมาที่ฝ่ายบุคคล', fallback: true, onBehalf: mgr };
    }
    if (!mgr) {
      var hr3 = SS.store.byRole('hr').filter(function (h) { return h.id !== empId; })[0];
      return { approver: hr3 || null, why: 'J4 · ไม่มีหัวหน้างานในทะเบียน ตกมาที่ฝ่ายบุคคล', fallback: true };
    }
    return { approver: mgr, why: 'หัวหน้างานของผู้ยื่น' };
  }

  function onLeaveToday(empId) {
    var t = SS.d.today();
    return db().leaves.some(function (l) {
      return l.empId === empId && (l.status === 'approved' || l.status === 'used') && l.from <= t && l.to >= t;
    });
  }

  /* ======================================================================
     APV-04 · ขั้นตรวจอัตโนมัติก่อนถึงคน
     ตีกลับ ≠ ปฏิเสธ — คืนสถานะ bounced
     ====================================================================== */
  function autoCheckLeave(lv) {
    var issues = [], warns = [];
    var t = SS.leaveType(lv.type), today = SS.d.today();
    var days = leaveDays(lv);

    /* BR-07 · ห้ามทับกับใบที่อนุมัติแล้วหรือรออนุมัติ */
    var clash = db().leaves.filter(function (l) {
      return l.empId === lv.empId && l.id !== lv.id &&
             ['pending', 'approved', 'used'].indexOf(l.status) >= 0 &&
             !(l.to < lv.from || l.from > lv.to);
    });
    if (clash.length) issues.push({ code: 'BR-07', msg: 'ช่วงวันทับกับใบลาเลขที่ ' + clash.map(function (c) { return c.id; }).join(', ') });

    /* BR-05 · ยื่นย้อนหลัง */
    if (lv.from < today) {
      var back = SS.d.diff(lv.from, today);
      if (!t.backdate) issues.push({ code: 'BR-05', msg: SS.name(SS.leaveType, lv.type) + ' ยื่นย้อนหลังไม่ได้ ต้องให้แอดมินบันทึกให้' });
      else if (back > t.backdate) issues.push({ code: 'BR-05', msg: 'ยื่นย้อนหลังได้ไม่เกิน ' + t.backdate + ' วัน (ใบนี้ย้อนหลัง ' + back + ' วัน)' });
    }
    /* BR-05 · ยื่นกระชั้น — ยังยื่นได้ แต่ติดป้าย */
    if (lv.from >= today && t.advance) {
      var lead = countDays(today, lv.from, 'work') - 1;
      if (lead < t.advance) warns.push({ code: 'BR-05', msg: 'ยื่นกระชั้น — กำหนดล่วงหน้า ' + t.advance + ' วันทำการ แต่ยื่นก่อนเพียง ' + lead + ' วัน' });
    }
    /* วันที่เลือกเป็นวันหยุดทั้งหมด */
    if (days <= 0) issues.push({ code: 'BR-06', msg: 'ช่วงวันที่เลือกไม่มีวันทำงานเลย ตามปฏิทินบริษัท' });

    /* BR-09 · สิทธิ์ยังไม่ปลด */
    var q = quota(lv.empId, lv.type);
    if (q.locked) issues.push({ code: 'BR-09', msg: q.lockReason });

    /* BR-02 · เกินสิทธิ์ — เตือน ไม่บล็อก */
    var sp = splitPaid(lv.empId, lv.type, days);
    if (sp.unpaid > 0) warns.push({ code: 'BR-02', msg: 'เกินสิทธิ์ ' + sp.unpaid + ' วัน — ส่วนนี้จะไม่ได้รับค่าจ้าง' });

    /* LV-07 · เอกสารประกอบ */
    if (t.id === 'LT-SICK' && days >= 3 && !lv.attachment) warns.push({ code: 'LV-07', msg: 'ลาป่วยตั้งแต่ 3 วันทำงาน ต้องแนบใบรับรองแพทย์' });

    /* BR-07 · ชนกับเช็คอินที่ลงไว้แล้ว */
    var ciClash = [];
    SS.d.eachDay(lv.from, lv.to, function (d) { if (checkinOf(lv.empId, d)) ciClash.push(d); });
    if (ciClash.length && !lv.halfDay) warns.push({ code: 'BR-07', msg: 'วันที่เลือกมีการเช็คอินแล้ว ' + ciClash.length + ' วัน — ต้องเลือกว่าจะลาครึ่งวันหรือยกเลิกเช็คอิน' });

    /* LV-09 · เพดานคนลาต่อวัน (ยังไม่เคาะตัวเลข) */
    if (P().maxLeavePerDay) {
      var over = null;
      SS.d.eachDay(lv.from, lv.to, function (d) {
        if (over || !isWorkingDay(d)) return;
        var n = db().leaves.filter(function (l) {
          var e = SS.store.employee(l.empId);
          return e && SS.store.employee(lv.empId) && e.dept === SS.store.employee(lv.empId).dept &&
                 ['pending', 'approved', 'used'].indexOf(l.status) >= 0 && l.from <= d && l.to >= d;
        }).length;
        if (n >= P().maxLeavePerDay) over = d;
      });
      /* BR-10 · ลาป่วย ลาคลอด บาดเจ็บ แทรกได้เสมอ */
      if (over && ['LT-SICK', 'LT-MATERNITY', 'LT-INJURY'].indexOf(lv.type) < 0)
        issues.push({ code: 'LV-09', msg: 'วันที่ ' + over + ' มีคนลาครบเพดานแล้ว' });
    }

    return { pass: issues.length === 0, issues: issues, warns: warns, days: days, split: sp };
  }

  /* ======================================================================
     ALW-06 · เบี้ยเลี้ยงรายวัน
     ยอด = อัตราต่อมื้อของไซต์ ณ วันนั้น × จำนวนมื้อสุดท้าย
     กะกลางคืน 3 มื้อ ทับทุกอย่าง · นอกเวลา +1 · นอกนั้นตามลักษณะการไปงาน
     *** ห้ามแสดงตัวเลขเหล่านี้ในหน้าเช็คอิน (CI-03 · ALW-13) ***
     ====================================================================== */
  function mealCount(travelIds) {
    var ids = [].concat(travelIds || []);
    var night = ids.filter(function (i) { var t = SS.travelType(i); return t && t.replacesAll; })[0];
    if (night) return SS.travelType(night).meals;
    var base = 0, add = 0;
    ids.forEach(function (i) {
      var t = SS.travelType(i); if (!t) return;
      if (t.additive) add += t.meals; else base = t.meals;
    });
    return base + add;
  }

  /* ----------------------------------------------------------------------
     CI-18 (ฉบับ 8 ก.ย. 2569) · ธงอัตโนมัติแทนช่องเหตุผลที่ถูกตัดออก
     ขึ้นธงเฉพาะรายการที่ "จำนวนมื้อเปลี่ยนจากค่าตั้งต้นของประเภทงาน"
     สลับระหว่างแบบที่ให้มื้อเท่ากันไม่ขึ้นธง เพราะเงินไม่เปลี่ยน จึงไม่มีอะไรให้กัน
     คำนวณตอนอ่าน ไม่บันทึกทับ — ตารางกลางแก้เมื่อไร ธงถูกต้องตามทันที
     ---------------------------------------------------------------------- */
  function defaultTravelFor(empId, jobTypeId) {
    var emp = SS.store.employee(empId) || {};
    if (emp.shift === 'night') return 'night';
    var jt = SS.jobType(jobTypeId);
    return jt ? jt.defaultTravel : 'office';
  }

  function mealFlag(ci) {
    if (!ci) return null;
    var def = defaultTravelFor(ci.empId, ci.jobType);
    var base = mealCount([def]);
    var actual = mealCount(ci.overtime ? [ci.travelType, 'overtime'] : [ci.travelType]);
    if (actual === base) return null;
    return {
      from: base, to: actual,
      why: 'จำนวนมื้อต่างจากค่าตั้งต้นของ ' + SS.name(SS.jobType, ci.jobType) +
           ' (' + SS.name(SS.travelType, def) + ')'
    };
  }

  /* ----------------------------------------------------------------------
     CI-25 · การแวะไซต์เพิ่ม
     ไม่เพิ่มมื้อ — แต่ถ้าประเภทงานของไซต์ที่แวะ "ควรได้มื้อมากกว่า" ไซต์หลัก
     ให้ขึ้นธงให้หัวหน้าเห็น ระบบไม่ตัดสินเอง (กติกาเดียวกับ CI-18)
     ---------------------------------------------------------------------- */
  function visitFlag(ci) {
    if (!ci || !ci.visits || !ci.visits.length) return null;
    var base = mealCount([ci.travelType]);
    var top = base, who = null;
    ci.visits.forEach(function (v) {
      var jt = SS.jobType(v.jobType);
      var m = jt ? mealCount([jt.defaultTravel]) : 0;
      if (m > top) { top = m; who = v; }
    });
    if (!who) return null;
    return {
      from: base, to: top, visit: who,
      why: 'ไซต์ที่แวะเป็น ' + SS.name(SS.jobType, who.jobType) + ' ซึ่งค่าตั้งต้นได้ ' + top +
           ' มื้อ มากกว่าไซต์หลักที่ได้ ' + base + ' มื้อ — ระบบไม่เปลี่ยนจำนวนมื้อให้เอง'
    };
  }

  /* คน-วัน (CI-25) — 1.0 ยกให้ไซต์หลักเสมอ ไซต์ที่แวะนับเป็นจำนวนครั้ง ไม่ใช่คน-วัน */
  function manDay(ci) {
    if (!ci || ci.status !== 'active') return null;
    return {
      mainSite: ci.projectId || null,
      manDays: 1.0,
      visits: (ci.visits || []).map(function (v) { return { projectId: v.projectId, entries: 1 }; })
    };
  }

  /* CI-28 · ระยะจากพิกัดไซต์ · หน่วยเมตร — ใช้ในรายงานเท่านั้น ห้ามแสดงให้พนักงานเห็น */
  function distanceOf(ci) {
    if (!ci || !ci.geo || ci.geo.lat === undefined || ci.geo.lat === null) return null;
    var pj = ci.projectId ? SS.project(ci.projectId) : null;
    if (!pj || pj.lat === undefined || pj.lat === null) return null;
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (pj.lat - ci.geo.lat) * rad, dLng = (pj.lng - ci.geo.lng) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(ci.geo.lat * rad) * Math.cos(pj.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  /* ชุดลักษณะการไปที่ประเภทงานนั้นเลือกได้ (CI-18 · FB-2) */
  function travelsFor(jobTypeId) {
    var jt = SS.jobType(jobTypeId);
    if (!jt || jt.travelLocked) return [];
    var allow = jt.allowedTravel || [];
    return db().travelTypes.filter(function (t) {
      return t.enabled && !t.additive && allow.indexOf(t.id) >= 0;
    });
  }

  function rateAt(projectId, date) {
    var rows = db().rates.filter(function (r) {
      return r.projectId === projectId && r.from <= date && (!r.to || r.to >= date);
    });
    if (rows.length) return { rate: rows[0].rate, rowId: rows[0].id, isDefault: false };
    return { rate: P().defaultMealRate, rowId: null, isDefault: true };
  }

  function allowanceOf(ci) {
    if (!ci) return null;
    var st = dayStatus(ci.empId, ci.date);
    /* ALW-10 · วันที่ลาอนุมัติแล้วไม่เกิดรายการ
       ข้อสรุป 3 ก.ย. 2569: ครอบคลุมลาครึ่งวันด้วย (ยึด ALW-10 เหนือ CI-14) */
    if (st.leave) return { skip: true, reason: 'วันนี้มีใบลาที่อนุมัติแล้ว จึงไม่เกิดรายการเบี้ยเลี้ยง (ALW-10)' };
    var travels = [ci.travelType];
    if (ci.overtime) travels.push('overtime');
    var meals = mealCount(travels);
    var r = ci.projectId ? rateAt(ci.projectId, ci.date) : { rate: P().defaultMealRate, rowId: null, isDefault: true };
    return { meals: meals, rate: r.rate, rowId: r.rowId, isDefault: r.isDefault, amount: meals * r.rate };
  }

  /* ======================================================================
     CI-16 · ลิสต์ไซต์กรองตามประเภทงาน
     ====================================================================== */
  function sitesFor(jobTypeId) {
    var jt = SS.jobType(jobTypeId);
    if (!jt || !jt.requireSite) return [];
    return db().projects.filter(function (p) { return jt.siteFilter.indexOf(p.status) >= 0; });
  }

  /* ======================================================================
     S11 · สถานะใบรับรอง (C1 · C2)
     สี่ค่า — ใช้ได้ · ใกล้หมด · หมดอายุ · ยังไม่เคยมี
     ค่าสุดท้ายไม่ได้มาจากตารางใบ ต้องเทียบกับรายการใบบังคับ
     ====================================================================== */
  function certStatus(cert) {
    if (!cert) return 'missing';
    if (!cert.expiry) return 'valid';                       /* ไม่หมดอายุ */
    var t = SS.certType(cert.typeId) || {};
    var today = SS.d.today();
    if (cert.expiry < today) return 'expired';
    if (SS.d.diff(today, cert.expiry) <= (+t.warnDays || 60)) return 'soon';
    return 'valid';
  }

  /* ใบล่าสุดของคนนั้นในชนิดนั้น — ต่ออายุคือเพิ่มฉบับใหม่ ฉบับเก่ายังอยู่เป็นประวัติ */
  function latestCert(empId, typeId) {
    var rows = db().certs.filter(function (c) { return c.empId === empId && c.typeId === typeId; });
    if (!rows.length) return null;
    return rows.slice().sort(function (a, b) {
      if (a.issued !== b.issued) return a.issued < b.issued ? 1 : -1;
      return (b.version || 1) - (a.version || 1);
    })[0];
  }
  function certHistory(empId, typeId) {
    return db().certs.filter(function (c) { return c.empId === empId && c.typeId === typeId; })
      .sort(function (a, b) { return a.issued < b.issued ? 1 : -1; });
  }
  function latestSensitive(empId, typeId) {
    var rows = db().sensitive.filter(function (c) { return c.empId === empId && c.typeId === typeId; });
    if (!rows.length) return null;
    return rows.slice().sort(function (a, b) { return a.checked < b.checked ? 1 : -1; })[0];
  }

  /* ชนิดใบที่บังคับกับคนนี้ — 'all' · 'job:<id>' ตามประเภทงานตั้งต้น · 'pos:<id>' ตามตำแหน่ง */
  function requiredCertTypes(empId) {
    var emp = SS.store.employee(empId);
    if (!emp) return [];
    return db().certTypes.filter(function (t) {
      if (!t.enabled) return false;
      if (t.requiredFor === 'all') return true;
      if (t.requiredFor.indexOf('job:') === 0) return emp.defaultJobType === t.requiredFor.slice(4);
      if (t.requiredFor.indexOf('pos:') === 0) return emp.positionId === t.requiredFor.slice(4);
      return false;
    });
  }

  /* สรุปใบของคนหนึ่ง — ใบที่มี + ใบบังคับที่ยังไม่เคยมี */
  function certsOf(empId) {
    var out = [], seen = {};
    db().certTypes.forEach(function (t) {
      var rec = t.sensitive ? latestSensitive(empId, t.id) : latestCert(empId, t.id);
      if (!rec) return;
      seen[t.id] = 1;
      var st;
      if (t.sensitive) {
        st = !rec.next ? 'valid'
           : rec.next < SS.d.today() ? 'expired'
           : SS.d.diff(SS.d.today(), rec.next) <= (+t.warnDays || 30) ? 'soon' : 'valid';
      } else { st = certStatus(rec); }
      out.push({ type: t, rec: rec, status: st, sensitive: !!t.sensitive });
    });
    /* ใบบังคับที่ยังไม่เคยมี — การ์ดที่สำคัญที่สุดและมักถูกลืม */
    requiredCertTypes(empId).forEach(function (t) {
      if (seen[t.id]) return;
      out.push({ type: t, rec: null, status: 'missing', sensitive: !!t.sensitive });
    });
    return out;
  }

  /* ใบบังคับที่หมดอายุแล้วและมีระดับการกัน — ใช้ตอนเช็คอินเข้าไซต์ (C6) */
  function blockingCerts(empId) {
    return certsOf(empId).filter(function (c) {
      return (c.status === 'expired' || c.status === 'missing') && c.type.block !== 'none';
    });
  }
  function exemptedToday(empId) {
    return db().certExemptions.filter(function (x) {
      return x.empId === empId && x.date === SS.d.today();
    })[0] || null;
  }

  /* ======================================================================
     O5 · ความผิดปกติของโครงสร้างองค์กร
     ====================================================================== */
  function orgIssues() {
    var emps = SS.store.counted();
    function cycle(e) {
      var seen = {}, cur = e, guard = 0;
      while (cur && cur.managerId && guard++ < 50) {
        if (seen[cur.id]) return true;
        seen[cur.id] = 1;
        cur = SS.store.employee(cur.managerId);
        if (cur && cur.id === e.id) return true;
      }
      return false;
    }
    var noPos = emps.filter(function (e) { return !e.positionId; });
    var noDept = emps.filter(function (e) { return !e.dept; });
    var noMgr = emps.filter(function (e) { return !e.managerId; });
    var deadMgr = emps.filter(function (e) {
      var m = e.managerId ? SS.store.employee(e.managerId) : null;
      return m && !m.active;
    });
    var cycles = emps.filter(cycle);
    var emptyDiv = db().divisions.filter(function (d) {
      return d.enabled && !SS.store.orgCount('division', d.id);
    });
    return [
      { key: 'pos',   label: 'คนที่ยังไม่มีตำแหน่ง',              rows: noPos,   unit: 'คน' },
      { key: 'dept',  label: 'คนที่ยังไม่ได้จัดแผนก',             rows: noDept,  unit: 'คน' },
      { key: 'mgr',   label: 'คนที่ไม่มีหัวหน้างาน',               rows: noMgr,   unit: 'คน' },
      { key: 'dead',  label: 'หัวหน้างานที่พ้นสภาพแต่ยังมีลูกทีม',  rows: deadMgr, unit: 'คน' },
      { key: 'cycle', label: 'สายหัวหน้างานที่วนกลับมาหาตัวเอง',    rows: cycles,  unit: 'จุด' },
      { key: 'div',   label: 'ฝ่ายที่ไม่มีใครอยู่เลย',             rows: emptyDiv, unit: 'ฝ่าย' }
    ];
  }

  /* ======================================================================
     CAL-02 · แถบตอบทันที "เสาร์นี้ทำงานไหม"
     ====================================================================== */
  function quickBar(empId) {
    var today = SS.d.today(), rows = [];
    function row(label, date) {
      var c = calendar(date), st = dayStatus(empId, date);
      return { label: label, date: date, cal: c, status: st };
    }
    rows.push(row('วันนี้', today));
    rows.push(row('พรุ่งนี้', SS.d.add(today, 1)));
    var d = SS.d.add(today, 1), guard = 0;
    while (SS.d.dow(d) !== 6 && guard++ < 10) d = SS.d.add(d, 1);
    if (d !== SS.d.add(today, 1)) rows.push(row('เสาร์ถัดไป', d));
    return rows;
  }

  return {
    calendar: calendar, isWorkingDay: isWorkingDay, countDays: countDays,
    leaveDays: leaveDays, daysByYear: daysByYear,
    dayStatus: dayStatus, checkinOf: checkinOf, lateMinutes: lateMinutes,
    buckets: buckets, allocate: allocate, expiryOf: expiryOf,
    quota: quota, splitPaid: splitPaid,
    approverOf: approverOf, authorityRow: authorityRow, onLeaveToday: onLeaveToday,
    autoCheckLeave: autoCheckLeave,
    mealCount: mealCount, rateAt: rateAt, allowanceOf: allowanceOf,
    sitesFor: sitesFor, travelsFor: travelsFor, defaultTravelFor: defaultTravelFor,
    mealFlag: mealFlag, visitFlag: visitFlag, manDay: manDay, distanceOf: distanceOf,
    certStatus: certStatus, latestCert: latestCert, certHistory: certHistory,
    latestSensitive: latestSensitive, requiredCertTypes: requiredCertTypes,
    certsOf: certsOf, blockingCerts: blockingCerts, exemptedToday: exemptedToday,
    orgIssues: orgIssues, quickBar: quickBar
  };
})();
