/* ==========================================================================
   views-admin.js — Dashboard · ตั้งค่า · ปฏิทินทำงานรายปี · ทะเบียน · audit
                    และแผนที่ข้อกำหนดสำหรับ UAT
   ========================================================================== */
window.SS = window.SS || {}; SS.views = SS.views || {};
(function () {
  var U = SS.ui, C = SS.core, S = SS.store;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(x) { return U.esc(x); }

  /* ======================================================================
     Dashboard (DSH-03 · DSH-06 · DSH-14)
     ====================================================================== */
  SS.views.dashboard = function (host) {
    var me = S.user(), T = SS.d.today();
    var people = S.counted();                      /* DSH-03 · ตัดบัญชีทดสอบออกแล้ว */
    var counts = {}, list = {};
    people.forEach(function (p) {
      var s = C.dayStatus(p.id, T);
      counts[s.status] = (counts[s.status] || 0) + 1;
      (list[s.status] = list[s.status] || []).push({ p: p, s: s });
    });
    var testCount = S.get().employees.filter(function (e) { return e.isTest; }).length;

    var h = U.note('cant', 'ตัวเลขเบี้ยเลี้ยงยังไม่นำมาแสดงในรอบนี้ — ชุดเดิมคำนวณด้วยค่ากลาง 240 บาท/วัน ซึ่งหน่วยผิด และถูกลบตาม ALW-07 แล้ว (DSH-01)');

    h += '<div class="grid g4">';
    var absentLabel = (list.absent || []).some(function (x) { return x.s.notYet; }) ? 'ยังไม่เช็คอิน' : 'ขาดงาน';
    [['work', 'ทำงาน', 'g'], ['leave', 'ลา', ''], ['pending', 'รออนุมัติลา', 'y'], ['absent', absentLabel, 'r']].forEach(function (x) {
      h += '<div class="stat ' + x[2] + ' click" data-drill="' + x[0] + '"><div class="l">' + x[1] + '</div>' +
        '<div class="v">' + (counts[x[0]] || 0) + '<small>คน</small></div>' +
        '<div class="n">จากพนักงานที่ต้องเช็คอิน ' + people.length + ' คน</div></div>';
    });
    h += '</div>';
    h += '<div class="grid g4" style="margin-top:16px">';
    [['review', 'รอตรวจสอบ', 'o'], ['holiday', 'วันหยุด', 'k'], ['exempt', 'ยกเว้นเช็คอิน', 'k']].forEach(function (x) {
      h += '<div class="stat ' + x[2] + ' click" data-drill="' + x[0] + '"><div class="l">' + x[1] + '</div>' +
        '<div class="v">' + (counts[x[0]] || 0) + '<small>คน</small></div></div>';
    });
    h += '<div class="stat k"><div class="l">บัญชีทดสอบที่ตัดออก</div><div class="v">' + testCount + '<small>บัญชี</small></div>' +
      '<div class="n">ไม่นับในตัวหาร และไม่ขึ้นในรายชื่อใด ๆ</div></div>';
    h += '</div>';

    h += U.note('mock', 'การ์ดทุกใบเป็นขอบเขต "ทั้งบริษัท" และแตกตามสถานะรายวันของ CI-14 ครบทั้ง 7 สถานะ — ไม่มีการเอาคนลาไปกองรวมกับคนที่ยังไม่เช็คอิน (DSH-06)');

    h += '<div id="drill"></div>';

    /* คิวค้าง */
    var q = SS.views._queueFor(me);
    h += '<div class="card"><div class="chead"><h2>คิวที่รอคุณตัดสิน</h2><span class="sp"></span>' + U.ref('DSH-12') + '</div>' +
      '<div class="grid g4">' +
      '<div class="stat"><div class="l">ใบลา</div><div class="v">' + q.leaves.length + '</div></div>' +
      '<div class="stat o"><div class="l">วันชดเชย</div><div class="v">' + q.comps.length + '</div></div>' +
      '<div class="stat y"><div class="l">ทำงานนอกเวลา</div><div class="v">' + q.ots.length + '</div></div>' +
      '<div class="stat"><div class="l">ขอแก้เช็คอิน</div><div class="v">' + q.edits.length + '</div></div>' +
      '</div></div>';

    host.innerHTML = h;
    $$('[data-drill]').forEach(function (b) {
      b.addEventListener('click', function () { drill(b.getAttribute('data-drill'), list); });
    });
  };

  function drill(k, list) {
    var g = list[k] || [], d = SS.dayStatus(k);
    var h = '<div class="card"><div class="chead"><h2>' + esc(d.name) + ' · ' + g.length + ' คน</h2><span class="sp"></span>' + U.ref('DSH-08') + '</div>';
    if (!g.length) h += U.empty('ไม่มีรายการ');
    else {
      h += '<div class="tw"><table class="t"><tbody>';
      g.forEach(function (x) {
        h += '<tr><td style="width:40%">' + U.person(x.p, SS.name(SS.dept, x.p.dept)) + '</td>' +
          '<td>' + (x.s.checkin ? esc(SS.name(SS.jobType, x.s.checkin.jobType)) + (x.s.checkin.projectId ? ' · ' + esc(SS.name(SS.project, x.s.checkin.projectId)) : '') + ' · ' + esc(x.s.checkin.time)
            : x.s.leave ? esc(SS.name(SS.leaveType, x.s.leave.type)) + ' · ' + esc(U.range(x.s.leave.from, x.s.leave.to))
            : x.s.status === 'absent' ? esc(x.s.notYet ? 'ยังไม่ถึงเวลาเลิกงาน จึงยังไม่ตัดสินว่าขาดงาน' : SS.ABSENT_CAUSE[x.s.cause]) : '—') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    $('#drill').innerHTML = h;
    $('#drill').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ======================================================================
     CI-04 · หน้าตั้งค่าปฏิทินทำงานรายปี
     ====================================================================== */
  var calYear = null;
  SS.views.workcal = function (host) {
    var y = calYear || SS.d.year(SS.d.today());
    calYear = y;
    var h = '<div class="card"><div class="chead"><h2>ปฏิทินทำงาน ปี ' + (y + 543) + '</h2>' +
      '<span class="sub">คลิกที่วันเพื่อสลับประเภท</span><span class="sp"></span>' +
      '<button class="btn btn-ghost btn-sm" id="cyPrev">‹ ปีก่อน</button>' +
      '<button class="btn btn-ghost btn-sm" id="cyNext">ปีถัดไป ›</button>' +
      '<button class="btn btn-ghost btn-sm" id="cyCopy">ก๊อบปี้จากปีก่อนหน้า</button>' + U.ref('CI-04') + '</div>' +
      U.note('mock', 'เสาร์ทั้งปีตั้งต้นเป็น "เสาร์หยุด" แล้วแอดมินคลิกเปิดเฉพาะเสาร์ที่ทำงาน — ไม่ใช้สูตรเสาร์เว้นเสาร์อัตโนมัติ · แก้วันใดกลางปีแล้วมีผลกับการเช็คอินของวันนั้นทันที') +
      '<div class="legend" style="margin:0 0 12px">' + SS.DAY_TYPES.map(function (t) {
        return '<span><i style="background:' + t.color + '"></i>' + esc(t.name) + '</span>'; }).join('') + '</div>';

    h += '<div class="grid g3">';
    for (var mo = 1; mo <= 12; mo++) {
      var m = y + '-' + SS.d.pad(mo);
      var days = new Date(y, mo, 0).getDate(), dow0 = SS.d.dow(m + '-01');
      h += '<div class="calwrap" style="box-shadow:none"><div style="font-weight:700;color:#162E70;margin-bottom:6px;font-size:14px">' + esc(U.M_FULL[mo - 1]) + '</div>' +
        '<div class="calgrid">' + U.DAY_FULL.map(function (d) { return '<div class="dh">' + d.slice(0, 1) + '</div>'; }).join('');
      for (var i = 0; i < dow0; i++) h += '<div></div>';
      for (var d2 = 1; d2 <= days; d2++) {
        var date = m + '-' + SS.d.pad(d2);
        var cal = C.calendar(date), dt = SS.dayType(cal.type) || {};
        h += '<button class="cell" data-wd="' + date + '" style="min-height:34px;background:' + dt.color + '" title="' + esc(cal.name || dt.name) + '">' +
          '<span class="dn" style="font-size:11.5px">' + d2 + '</span></button>';
      }
      h += '</div></div>';
    }
    h += '</div></div>';
    host.innerHTML = h;
    $('#cyPrev').addEventListener('click', function () { calYear = y - 1; SS.app.refresh(); });
    $('#cyNext').addEventListener('click', function () { calYear = y + 1; SS.app.refresh(); });
    $('#cyCopy').addEventListener('click', function () {
      var src = y - 1, db = S.get(), n = 0;
      Object.keys(db.calendar).forEach(function (d) {
        if (SS.d.year(d) !== src) return;
        var target = (y) + d.slice(4);
        if (db.calendar[target]) { db.calendar[target] = { type: db.calendar[d].type, name: db.calendar[d].name }; n++; }
      });
      S.log('ก๊อบปี้ปฏิทิน', String(y), 'จากปี ' + (src + 543) + ' จำนวน ' + n + ' วัน');
      S.emit(); U.toast('ก๊อบปี้ ' + n + ' วันจากปี ' + (src + 543) + ' แล้ว', 'ok'); SS.app.refresh();
    });
    $$('[data-wd]').forEach(function (b) {
      b.addEventListener('click', function () { dayTypeModal(b.getAttribute('data-wd')); });
    });
  };

  function dayTypeModal(date) {
    var cur = C.calendar(date);
    U.modal({
      title: U.date(date, 'full'),
      body: '<div class="field"><label>ประเภทวัน</label><div class="choices">' +
        SS.DAY_TYPES.map(function (t) {
          return '<label class="choice' + (t.id === cur.type ? ' on' : '') + '"><input type="radio" name="dt" value="' + t.id + '"' +
            (t.id === cur.type ? ' checked' : '') + '> ' + esc(t.name) + '</label>'; }).join('') + '</div></div>' +
        '<div class="field"><label>ชื่อวันหยุด</label><input type="text" id="dtName" value="' + esc(cur.name) + '" placeholder="เช่น วันสงกรานต์"></div>' +
        U.note('open', 'ถ้าเปลี่ยนวันหยุดย้อนหลังหลังจากมีใบลาคร่อมวันนั้นแล้ว จะคำนวณใบลาใหม่หรือคงเดิม — จุดเชื่อม J2 ยังไม่เคาะ · mockup เลือกคงตามที่อนุมัติแล้ว'),
      buttons: [{ label: 'ยกเลิก', cls: 'btn-ghost' },
        { label: 'บันทึก', cls: 'btn', onClick: function () {
            var v = ($$('[name=dt]').filter(function (r) { return r.checked; })[0] || {}).value;
            S.setDayType(date, v, $('#dtName').value);
            U.toast('บันทึกแล้ว · มีผลกับการเช็คอินและการนับวันลาทันที', 'ok');
            SS.app.refresh();
          } }]
    });
  }

  /* ======================================================================
     ตั้งค่าพารามิเตอร์ — ห้าม hardcode
     ====================================================================== */
  SS.views.settings = function (host) {
    var p = S.get().params;
    function f(k, label, type, hint, opts) {
      var v = p[k];
      var input = opts
        ? '<select data-p="' + k + '">' + U.options(opts, v, 'id', 'name') + '</select>'
        : '<input type="' + type + '" data-p="' + k + '" value="' + esc(v === null ? '' : v) + '">';
      return '<div class="field"><label>' + esc(label) + '</label>' + input +
        (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
    }
    var h = '<div class="card"><div class="chead"><h2>เวลาทำงานมาตรฐาน</h2><span class="sp"></span>' + U.ref(['S4', 'CI-13', 'DSH-02']) + '</div>' +
      '<div class="frow3">' +
      f('workStart', 'เวลาเข้างานมาตรฐาน', 'time') +
      f('workEnd', 'เวลาเลิกงานมาตรฐาน', 'time', 'จุดเริ่มนับการทำงานนอกเวลา') +
      f('graceMinutes', 'ผ่อนผันก่อนนับสาย (นาที)', 'number') +
      '</div><div class="frow">' +
      f('nightStart', 'กะกลางคืน เวลาเริ่ม', 'time') +
      f('nightEnd', 'กะกลางคืน เวลาสิ้นสุด', 'time') +
      '</div>' +
      U.note('open', 'ค่าผ่อนผันยังไม่เคาะ — บันทึก 31 ส.ค. พบว่าระบบจริงน่าจะยังใช้ 08:00 อยู่ (คนหนึ่งขึ้นว่าสาย 20 จาก 21 วัน แต่เฉลี่ยสายแค่ 27 นาที) ลองเปลี่ยนค่าแล้วดูผลย้อนหลังที่หน้าประวัติเช็คอินได้ทันที') +
      '</div>';

    h += '<div class="card"><div class="chead"><h2>วันชดเชยและวันหมดอายุ</h2><span class="sp"></span>' + U.ref(['CI-08', 'CI-09', 'CI-10', 'LV-12']) + '</div>' +
      '<div class="frow3">' +
      f('holidayCompRate', 'อัตราชดเชยวันหยุด (วัน)', 'number', 'เต็มวัน 1.0 · ครึ่งวัน 0.5') +
      f('otHoursPerDay', 'ชั่วโมง OT ต่อ 1 วันหยุด', 'number', 'เศษยกไป ไม่ปัดทิ้ง') +
      f('compWarnFrom', 'เริ่มเตือนใกล้หมดอายุ (MM-DD)', 'text', 'แล้วซ้ำที่ 60 และ 30 วัน') +
      '</div>' +
      f('expiryRule', 'กติกาวันหมดอายุ', 'text', 'ใช้กับทั้งลาชดเชยและพักร้อนที่ยกข้ามปี', SS.EXPIRY_RULES) +
      U.note('mock', 'ไม่มีเพดานการสะสม ตามข้อสรุป 1 ก.ย. 2569 — จึงไม่มีช่องให้ตั้ง · LV-12 ยังเขียนค้างว่า "ตั้งเพดานจำนวนวันที่สะสมได้" ควรลบประโยคนั้นออกจากสเปก') +
      '</div>';

    h += '<div class="card"><div class="chead"><h2>ใบลาและการอนุมัติ</h2><span class="sp"></span>' + U.ref(['BR-09', 'APV-07', 'APV-08', 'LV-09']) + '</div>' +
      '<div class="frow3">' +
      f('probationDays', 'วันทดลองงาน (วัน)', 'number', 'วันเริ่มงาน + N วัน = วันที่ผ่านการประเมินโดยประมาณ') +
      f('lapseAfterDays', 'ใบลาตกไปหลังเลยวันลา (วัน)', 'number', 'ค่าตั้งต้น 30 วัน · คืนยอดจองเมื่อตกไป') +
      f('reminderEveryHours', 'รอบเตือนใบลาค้าง (ชั่วโมง)', 'number', 'ไม่ส่งต่ออัตโนมัติ เตือนซ้ำอย่างเดียว') +
      '</div>' +
      '<div class="frow">' +
      f('maxLeavePerDay', 'เพดานคนลาพร้อมกันต่อวัน', 'number', 'เว้นว่าง = ยังไม่บังคับ · <b>ตัวเลขนี้ยังไม่เคาะ</b> · เป็นเพดานรายทีม ไม่ใช่รายไซต์') +
      f('quotaCycle', 'รอบโควตาวันลา', 'text', 'ปีปฏิทิน 1 ม.ค. – 31 ธ.ค.', [{ id: 'calendar', name: 'ปีปฏิทิน (1 ม.ค. – 31 ธ.ค.)' }, { id: 'hire', name: 'นับจากวันเริ่มงานรายคน' }]) +
      '</div></div>';

    h += '<div class="card"><div class="chead"><h2>หน้าเช็คอินและประวัติ</h2><span class="sp"></span>' + U.ref(['CI-06', 'CI-22', 'CI-25', 'CI-28']) + '</div>' +
      '<div class="frow3">' +
      f('selfEditHours', 'แก้เช็คอินเองได้ภายใน (ชั่วโมง)', 'number', 'เกินกว่านี้ต้องยื่นขอแก้ไขให้หัวหน้าอนุมัติ') +
      f('historyPageSize', 'จำนวนวันต่อหน้าในประวัติ', 'number', 'ลองตั้งเป็น 5 แล้วดูว่าหน้าประวัติแบ่งหน้าตาม') +
      f('maxVisitsPerDay', 'แวะไซต์เพิ่มได้ต่อวัน (ไซต์)', 'number', 'ตั้ง 0 = ปุ่ม "แวะไซต์เพิ่ม" หายไปทั้งปุ่ม') +
      '</div><div class="frow">' +
      f('notifyTime', 'เวลาส่งเตือนคนยังไม่เช็คอิน', 'time', 'ต้นแบบส่งจริงไม่ได้ — ค่านี้ไว้พิสูจน์ว่าตั้งได้') +
      f('siteRadiusMeters', 'รัศมีที่ถือว่าอยู่หน้างาน (เมตร)', 'number', 'ใช้คิดระยะในรายงานเท่านั้น <b>ห้ามใช้บล็อกการเช็คอิน</b>') +
      '</div>' +
      '<div class="field"><label>ข้อความประกาศเรื่องการเก็บพิกัด (PDPA)</label>' +
      '<textarea data-p="geoNotice">' + esc(p.geoNotice || '') + '</textarea>' +
      '<div class="hint">ขึ้นครั้งเดียวตอนพนักงานเช็คอินครั้งแรก ไม่ใช่ถามทุกวัน (CI-28)</div></div>' +
      U.note('mock', 'พิกัดเป็นการบันทึกอย่างเดียว ไม่บล็อกการเช็คอิน ไม่เตือนพนักงาน และไม่แสดงระยะให้พนักงานเห็น — หัวหน้างานและฝ่ายบุคคลเห็นในรายงานเท่านั้น') +
      '</div>';

    h += '<div class="card"><div class="chead"><h2>เบี้ยเลี้ยง</h2><span class="sp"></span>' + U.ref(['S17', 'S18', 'ALW-02', 'ALW-07', 'ALW-12']) + '</div>' +
      '<div class="frow">' +
      f('defaultMealRate', 'อัตราเริ่มต้นของบริษัท (บาท/มื้อ)', 'number', 'ใช้เมื่อไซต์ยังไม่ตั้งอัตรา และต้องแสดงว่ากำลังใช้ค่าเริ่มต้น') +
      f('payCycleStartDay', 'วันเริ่มรอบตัดจ่าย', 'number', 'รอบ 16 ถึง 15 ของเดือนถัดไป') +
      '</div><div class="frow">' +
      f('officeOvertimeMeals', 'ประจำออฟฟิศ อยู่หน้างานนอกเวลาได้กี่มื้อ', 'number', '<b>ยังไม่เคาะ</b> · ค่าตั้งต้น 0 ตามกติกาเดิมที่ว่าประจำออฟฟิศไม่ได้ค่าอาหาร') +
      '</div>' +
      U.note('open', 'UAT FB-6 ถามว่าพนักงานออฟฟิศทำงานนอกเวลาได้มื้อเพิ่มไหม — ผู้บริหารยังยืนยันไม่ได้ · แนวทางที่เสนอคือถ้าออกไปทำงานหน้างานนอกเวลา ให้เลือกประเภทงานเป็นงานหน้าไซต์ ไม่ใช่ประจำออฟฟิศ · ส่วนการยื่นชั่วโมง OT เพื่อได้วันชดเชย พนักงานออฟฟิศทำได้อยู่แล้ว ไม่ขึ้นกับประเภทงาน') +
      U.note('mock', 'ค่ากลางเบี้ยเลี้ยง 240 บาท/วัน ถูกลบออกจากทุกเส้นทางคำนวณตาม ALW-07 แล้ว — หน่วยผิดตั้งแต่ต้น ระบบคิดรายมื้อ ไม่ใช่รายวัน · ค่าระยะทางปิดใช้งานอยู่') +
      '</div>';

    host.innerHTML = h;
    $$('[data-p]').forEach(function (el) {
      el.addEventListener('change', function () {
        var k = el.getAttribute('data-p');
        var v = el.value;
        if (el.type === 'number') v = v === '' ? null : +v;
        S.setParam(k, v);
        U.toast('บันทึก ' + k + ' แล้ว · มีผลกับการคำนวณย้อนหลังทันที', 'ok');
        SS.app.refresh();
      });
    });
  };

  /* ======================================================================
     ทะเบียนพนักงาน (S1 · CI-07 · CI-13 · LV-02 · LV-05)
     ====================================================================== */
  SS.views.staffops = function (host) {
    var h = U.note('mock', 'หน้านี้เป็นตารางตั้งค่าเชิงปฏิบัติการที่เมนูเช็คอินและเมนูลาต้องใช้ (กะ · ยกเว้นเช็คอิน · ผู้อนุมัติสำรอง · วันผ่านประเมิน) — ' +
      'ส่วนทะเบียนพนักงานเต็มรูปแบบตามข้อกำหนดหน้าจอ A1–A7 อยู่ที่เมนู <b>ทะเบียนพนักงาน</b>');
    h += '<div class="card"><div class="chead"><h2>ทะเบียนพนักงาน</h2><span class="sp"></span>' + U.ref(['S1', 'CI-07', 'CI-13', 'LV-02', 'LV-05']) + '</div>' +
      '<div class="tw"><table class="t"><thead><tr><th>รหัส</th><th>ชื่อ</th><th>แผนก</th><th>บทบาท</th><th>หัวหน้า / ผู้สำรอง</th><th>กะ</th><th>ยกเว้นเช็คอิน</th><th>ผ่านประเมิน</th><th></th></tr></thead><tbody>';
    S.get().employees.forEach(function (e) {
      h += '<tr' + (e.isTest ? ' style="background:#FFF8F7"' : '') + '><td>' + esc(e.id) + '</td>' +
        '<td>' + U.person(e) + (e.isTest ? ' ' + U.pill('pill-red', 'บัญชีทดสอบ') : '') + '</td>' +
        '<td>' + esc(SS.name(SS.dept, e.dept)) + '</td>' +
        '<td>' + esc(SS.name(SS.role, e.role)) + '</td>' +
        '<td><small>' + esc(e.managerId ? (S.employee(e.managerId) || {}).name : '—') +
          '<br>สำรอง: ' + esc(e.backupApproverId ? (S.employee(e.backupApproverId) || {}).name : '— ยังไม่ตั้ง') + '</small></td>' +
        '<td>' + (e.shift === 'night' ? U.pill('pill-blue', 'กะกลางคืน') : 'กะปกติ') + '</td>' +
        '<td>' + (e.exemptCheckin ? U.pill('pill-gray', 'ยกเว้น') : '—') + '</td>' +
        '<td>' + (e.probationPassedDate ? esc(U.date(e.probationPassedDate)) : U.pill('pill-orange', 'ยังไม่บันทึก')) + '</td>' +
        '<td style="text-align:right"><button class="btn btn-ghost btn-sm" data-emp="' + e.id + '">แก้ไข</button></td></tr>';
    });
    h += '</tbody></table></div></div>';

    /* LV-02 · หน้าตรวจสอบข้อมูลไม่ครบ */
    var bad = S.get().employees.filter(function (e) { return !e.backupApproverId || !e.probationPassedDate; });
    h += '<div class="card"><div class="chead"><h2>รายชื่อที่ข้อมูลยังไม่ครบ</h2><span class="sp"></span>' + U.ref('LV-02') + '</div>';
    if (!bad.length) h += U.empty('ข้อมูลครบทุกคน');
    else {
      h += '<div class="tw"><table class="t"><tbody>';
      bad.forEach(function (e) {
        var miss = [];
        if (!e.backupApproverId) miss.push('ยังไม่ตั้งผู้อนุมัติสำรอง');
        if (!e.probationPassedDate) miss.push('ยังไม่บันทึกวันที่ผ่านการประเมิน จึงยังไม่ได้รับสิทธิ์ลาพักร้อน');
        h += '<tr><td style="width:36%">' + U.person(e) + '</td><td>' + esc(miss.join(' · ')) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';

    host.innerHTML = h;
    $$('[data-emp]').forEach(function (b) {
      b.addEventListener('click', function () { empModal(S.employee(b.getAttribute('data-emp'))); });
    });
  };

  function empModal(e) {
    U.modal({
      title: 'แก้ไข ' + e.name,
      body: '<div class="frow">' +
        '<div class="field"><label>กะการทำงาน</label><select id="mShift">' +
          '<option value="day"' + (e.shift === 'day' ? ' selected' : '') + '>กะปกติ</option>' +
          '<option value="night"' + (e.shift === 'night' ? ' selected' : '') + '>กะกลางคืน</option></select>' +
          '<div class="hint">กะกลางคืนคิดมาสายเทียบเวลาเริ่มกะ ไม่ใช่ 08:30 · กะที่ข้ามเที่ยงคืนนับเป็นวันที่เริ่มกะ</div></div>' +
        '<div class="field"><label>ผู้อนุมัติสำรอง</label><select id="mBackup"><option value="">— ยังไม่ตั้ง —</option>' +
          S.get().employees.filter(function (x) { return x.id !== e.id; })
            .map(function (x) { return '<option value="' + x.id + '"' + (x.id === e.backupApproverId ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') +
          '</select></div></div>' +
        '<div class="field"><label>วันที่ผ่านการประเมิน</label><input type="date" id="mProb" value="' + esc(e.probationPassedDate || '') + '">' +
          '<div class="hint">ค่าเสนอ = วันเริ่มงาน + ' + S.get().params.probationDays + ' วัน (' +
          esc(U.date(SS.d.add(e.startDate, S.get().params.probationDays), 'long')) + ') · พิมพ์ทับด้วยวันที่หัวหน้าเซ็นจริงได้</div></div>' +
        '<label class="choice' + (e.exemptCheckin ? ' on' : '') + '"><input type="checkbox" id="mExempt"' + (e.exemptCheckin ? ' checked' : '') + '> ยกเว้นการเช็คอิน</label>' +
        U.note('open', 'การยกเว้นเช็คอินรายบุคคลต้องผ่านผู้บริหาร ไม่ใช่แอดมินทำเองได้ (APV-11) — ใน mockup ยังกดได้ทันทีเพื่อให้ทดสอบผลลัพธ์'),
      buttons: [{ label: 'ยกเลิก', cls: 'btn-ghost' },
        { label: 'บันทึก', cls: 'btn', onClick: function () {
            S.setEmployee(e.id, { shift: $('#mShift').value, backupApproverId: $('#mBackup').value || null,
                                  probationPassedDate: $('#mProb').value, exemptCheckin: $('#mExempt').checked });
            U.toast('บันทึกแล้ว', 'ok'); SS.app.refresh();
          } }]
    });
  }

  /* ======================================================================
     ทะเบียนของกลาง S19 · S20 · S10 · S17 · APV-01
     ====================================================================== */
  SS.views.tables = function (host) {
    var db = S.get();
    var h = '<div class="card"><div class="chead"><h2>S19 · ทะเบียนประเภทงาน</h2><span class="sp"></span>' + U.ref(['CI-15', 'CI-16', 'CI-18']) + '</div>' +
      '<div class="tw"><table class="t"><thead><tr><th>ประเภทงาน</th><th>รหัส</th><th>เลือกไซต์</th><th>ลิสต์ไซต์ที่แสดง</th><th>ลักษณะการไปตั้งต้น</th><th class="n">มื้อ</th><th>ลักษณะการไปที่เลือกได้</th><th>สถานะ</th></tr></thead><tbody>' +
      db.jobTypes.map(function (j) {
        return '<tr' + (j.enabled ? '' : ' style="opacity:.55"') + '><td><b>' + esc(j.name) + '</b></td><td>' + esc(j.code) + '</td>' +
          '<td>' + (j.requireSite ? 'ต้องเลือก' : 'ไม่ต้อง (ซ่อนช่อง)') + '</td>' +
          '<td>' + esc(j.siteFilter.map(function (s) { return s === 'active' ? 'กำลังดำเนินการ' : s === 'done' ? 'เสร็จแล้ว' : 'แผนงาน'; }).join(' + ') || '—') +
            (j.otherPlace ? ' + สถานที่อื่น' : '') + '</td>' +
          '<td>' + esc(SS.name(SS.travelType, j.defaultTravel)) + (j.travelLocked ? ' ' + U.pill('pill-gray', 'ล็อก') : '') + '</td>' +
          '<td class="n">' + C.mealCount([j.defaultTravel]) + '</td>' +
          /* คอลัมน์นี้แทนคอลัมน์ "แก้ได้ / ล็อก" เดิม ตามมติ 8 ก.ย. 2569 */
          '<td><small>' + (j.travelLocked ? 'ล็อก · ซ่อนช่อง'
            : esc((j.allowedTravel || []).map(function (t) { return SS.name(SS.travelType, t); }).join(' · '))) + '</small></td>' +
          '<td>' + (j.enabled ? U.pill('pill-green', 'ใช้งาน') : U.pill('pill-gray', 'ปิดใช้งาน ห้ามลบ')) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
      U.note('mock', 'จำนวนมื้อแสดงได้เฉพาะหน้านี้ — ห้ามแสดงในหน้าเช็คอินหรือที่ใดที่พนักงานทั่วไปเห็น (CI-03 · CI-19)') + '</div>';

    h += '<div class="card"><div class="chead"><h2>S20 · ลักษณะการไปงานและจำนวนมื้อ</h2><span class="sp"></span>' + U.ref(['CI-19', 'ALW-04']) + '</div>' +
      '<div class="tw"><table class="t"><thead><tr><th>ลักษณะการไปงาน</th><th class="n">มื้อ</th><th>ลักษณะพิเศษ</th><th>สถานะ</th></tr></thead><tbody>' +
      db.travelTypes.map(function (t) {
        return '<tr><td>' + esc(t.name) + '</td><td class="n">' + (t.additive ? '+' : '') + t.meals + '</td>' +
          '<td>' + (t.additive ? 'ตัวบวก ไม่ใช่ค่าที่มาแทน' : t.replacesAll ? 'ทับค่าอื่นทั้งหมด ไม่บวกมื้อนอกเวลาซ้ำ' : '—') + '</td>' +
          '<td>' + (t.enabled ? U.pill('pill-green', 'ใช้งาน') : U.pill('pill-gray', 'ปิด')) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';

    h += '<div class="card"><div class="chead"><h2>S21 · ทะเบียนเหตุผลไซต์หยุดงาน</h2><span class="sub">ใช้กับปุ่ม "หยุดงานที่ไซต์" ในหน้าเช็คอิน</span><span class="sp"></span>' + U.ref(['CI-26', 'S21']) + '</div>' +
      '<div class="tw"><table class="t"><thead><tr><th>เหตุผล</th><th>พิมพ์เพิ่มได้</th><th>สถานะ</th></tr></thead><tbody>' +
      db.stopReasons.map(function (r) {
        return '<tr><td>' + esc(r.name) + '</td>' +
          '<td>' + (r.free ? 'ได้ — ต้องระบุเหตุ' : '—') + '</td>' +
          '<td>' + (r.enabled ? U.pill('pill-green', 'ใช้งาน') : U.pill('pill-gray', 'ปิด')) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
      U.note('mock', 'เหตุผลต้องเลือกจากรายการนี้เท่านั้น ห้ามพิมพ์อิสระ เพื่อให้สรุปได้ว่าไซต์ไหนเสียเวลาไปกับอะไร — วันที่หยุดงานที่ไซต์ยังได้ค่าอาหารตามปกติ ไม่นับขาดงาน ไม่หักวันลา') + '</div>';

    h += '<div class="card"><div class="chead"><h2>S10 · ทะเบียนโครงการ/ไซต์งาน</h2><span class="sub">เปลี่ยนสถานะแล้วลิสต์ในหน้าเช็คอินเปลี่ยนทันที</span><span class="sp"></span>' + U.ref(['CI-01', 'CI-16', 'ALW-02']) + '</div>' +
      '<div class="tw"><table class="t"><thead><tr><th>รหัส</th><th>ชื่อโครงการ</th><th>สถานะ</th><th>อัตราเบี้ยเลี้ยง (บาท/มื้อ)</th><th>พิกัดไซต์</th></tr></thead><tbody>' +
      db.projects.map(function (p) {
        var r = C.rateAt(p.id, SS.d.today());
        return '<tr><td>' + esc(p.code) + '</td><td>' + esc(p.name) + '</td>' +
          '<td><select data-prj="' + p.id + '">' +
            '<option value="plan"' + (p.status === 'plan' ? ' selected' : '') + '>แผนงาน</option>' +
            '<option value="active"' + (p.status === 'active' ? ' selected' : '') + '>กำลังดำเนินการ</option>' +
            '<option value="done"' + (p.status === 'done' ? ' selected' : '') + '>เสร็จสิ้น</option></select></td>' +
          '<td>' + r.rate + (r.isDefault ? ' ' + U.pill('pill-orange', 'ใช้อัตราเริ่มต้นของบริษัท') : '') + '</td>' +
          /* CI-28 · ต้องมีพิกัดไซต์ก่อนถึงจะเทียบระยะได้ — เป็นฟิลด์ในหน้าจัดการโครงการที่มีอยู่แล้ว */
          '<td><small>' + (p.lat === undefined || p.lat === null
            ? U.pill('pill-gray', 'ยังไม่มีพิกัด')
            : esc(p.lat.toFixed(4) + ', ' + p.lng.toFixed(4))) + '</small></td></tr>'; }).join('') +
      '</tbody></table></div>' +
      U.note('mock', 'ไซต์ที่ยังไม่ตั้งอัตราต้องขึ้นเตือนว่ากำลังใช้ค่าเริ่มต้น ห้ามคิดเป็น 0 เงียบ ๆ (ALW-02) · CRR และ TPC2 จงใจเว้นไว้ให้เห็นกรณีนี้') + '</div>';

    h += '<div class="card"><div class="chead"><h2>APV-01 · ตารางอำนาจอนุมัติ</h2><span class="sp"></span>' + U.ref(['APV-01', 'APV-02', 'APV-03', 'J4']) + '</div>' +
      '<div class="tw"><table class="t"><thead><tr><th>เรื่อง</th><th>ผู้อนุมัติ</th><th>ผู้สำรอง</th><th>ข้อยกเว้น</th></tr></thead><tbody>' +
      db.authority.map(function (a) {
        var nm = { manager: 'หัวหน้างานของผู้ยื่น', hr: 'ฝ่ายบุคคล', exec: 'ผู้บริหาร', backup: 'ผู้อนุมัติสำรอง', hr2: 'ฝ่ายบุคคลสำรอง' };
        return '<tr><td>' + esc(a.name) + '</td><td>' + esc(nm[a.primary] || a.primary) + '</td>' +
          '<td>' + esc(a.backup ? (nm[a.backup] || a.backup) + (a.fallback ? ' → ' + (nm[a.fallback] || a.fallback) : '') : '—') + '</td>' +
          '<td><small>' + esc(a.note) + '</small></td></tr>'; }).join('') +
      '</tbody></table></div>' +
      U.note('mock', 'ทุกที่ที่ถามว่า "ใครอนุมัติเรื่องนี้" ต้องถามตารางนี้ที่เดียว — ใน mockup ทุกหน้าจอเรียก SS.core.approverOf() ตัวเดียว ไม่มีเมนูไหนเขียนเงื่อนไขเอง') + '</div>';

    host.innerHTML = h;
    $$('[data-prj]').forEach(function (s) {
      s.addEventListener('change', function () {
        S.setProjectStatus(s.getAttribute('data-prj'), s.value);
        U.toast('เปลี่ยนสถานะโครงการแล้ว · ลิสต์ไซต์ในหน้าเช็คอินอัปเดตทันที (CI-01)', 'ok');
        SS.app.refresh();
      });
    });
  };

  /* ======================================================================
     S7 · audit log
     ====================================================================== */
  SS.views.audit = function (host) {
    var rows = S.get().audit.slice().reverse();
    var h = '<div class="card"><div class="chead"><h2>บันทึกการใช้งาน (audit log)</h2><span class="sp"></span>' +
      '<button class="btn btn-ghost btn-sm" id="auCsv">ส่งออก CSV</button>' + U.ref(['S7', 'APV-13']) + '</div>' +
      U.note('cant', 'ข้อกำหนดคือบันทึกนี้ลบไม่ได้ แก้ไม่ได้ แม้แต่แอดมิน และต้องเก็บสำเนาข้อมูลที่ผู้อนุมัติเห็น ณ เวลานั้น — การบังคับเรื่องนี้ต้องทำที่สิทธิ์ในฐานข้อมูล ทดสอบใน mockup ไม่ได้') +
      '<div class="tw"><table class="t"><thead><tr><th>เวลา</th><th>ผู้ทำ</th><th>การกระทำ</th><th>เป้าหมาย</th><th>รายละเอียด</th></tr></thead><tbody>';
    if (!rows.length) h += '<tr><td colspan="5">' + U.empty('ยังไม่มีบันทึก', 'ลองเช็คอิน ยื่นใบลา หรือแก้ค่าตั้งค่าดู') + '</td></tr>';
    rows.slice(0, 200).forEach(function (a) {
      h += '<tr><td><small>' + esc(a.at.slice(0, 19).replace('T', ' ')) + '</small></td><td>' + esc(a.byName) + '</td>' +
        '<td>' + esc(a.action) + '</td><td>' + esc(a.target) + '</td><td><small>' + esc(a.detail) + '</small></td></tr>';
    });
    h += '</tbody></table></div></div>';
    host.innerHTML = h;
    $('#auCsv').addEventListener('click', function () {
      U.csv('audit-log.csv', [['เวลา', 'ผู้ทำ', 'การกระทำ', 'เป้าหมาย', 'รายละเอียด']].concat(
        rows.map(function (a) { return [a.at, a.byName, a.action, a.target, a.detail]; })));
    });
  };

  /* ======================================================================
     แผนที่ข้อกำหนด — ใช้ระหว่าง UAT
     ====================================================================== */
  var MAP = [
    ['CI-01', 'รายชื่อไซต์อัปเดตหลังแก้ข้อมูลโครงการ', 'ทะเบียนของกลาง → เปลี่ยนสถานะโครงการ แล้วกลับไปหน้าเช็คอิน', 'partial', 'การเรียก API ซ้ำต้องทดสอบบนระบบจริง'],
    ['CI-02', 'แสดงเฉพาะโครงการที่กำลังดำเนินการ', '—', 'dropped', 'ถูกแทนที่ด้วย CI-16 ห้ามทำตามของเดิม'],
    ['CI-03', 'ไม่แสดงข้อมูลเบี้ยเลี้ยงในหน้าเช็คอิน', 'หน้าเช็คอิน', 'done', ''],
    ['CI-04', 'หน้าตั้งค่าปฏิทินทำงานรายปี', 'ปฏิทินทำงาน (แอดมิน)', 'done', ''],
    ['CI-05', 'ระบบระบุประเภทวันให้เอง + รายละเอียดงานบังคับกรอก', 'หน้าเช็คอิน — เว้นรายละเอียดงานว่างแล้วบันทึกไม่ได้', 'done', 'ช่องบังคับกรอกเพิ่ม 8 ก.ย. 2569 · UAT FB-1'],
    ['CI-06', 'แก้ไขเช็คอินที่กรอกผิด', 'ประวัติเช็คอินของฉัน → แก้ไข', 'done', ''],
    ['CI-07', 'ยกเว้นการเช็คอินเป็นรายบุคคล', 'ทะเบียนพนักงาน → แก้ไข', 'done', ''],
    ['CI-08', 'ลาชดเชยวันทำงาน', 'เช็คอินในวันหยุด → คิวอนุมัติ', 'done', ''],
    ['CI-09', 'วันหมดอายุของสิทธิ์วันลา', 'ตั้งค่า + ใบลาของฉัน (ตารางถัง)', 'done', ''],
    ['CI-10', 'บันทึกชั่วโมง OT', 'หน้าเช็คอิน → ปุ่ม "บันทึกชั่วโมง OT" (หลังเช็คอินแล้ว)', 'done', 'แยกจากตัวเลือก "อยู่หน้างานนอกเวลา" ซึ่งตอบเรื่องค่าอาหารอย่างเดียว · UAT FB-7'],
    ['CI-11', 'จำไซต์ล่าสุด', 'หน้าเช็คอิน — ค่าถูกเลือกไว้ให้แล้ว', 'done', ''],
    ['CI-12', 'แจ้งเตือนคนที่ยังไม่เช็คอิน 09:00', '—', 'cant', 'ต้องมีระบบส่งข้อความจริง'],
    ['CI-13', 'รองรับงานกะกลางคืน', 'ทะเบียนพนักงาน → กะ · เข้าใช้งานเป็น พิมพ์ชนก', 'done', ''],
    ['CI-14', 'สถานะรายวันของพนักงาน', 'ทีมของฉัน · Dashboard · ปฏิทิน', 'done', 'คำนวณตอนอ่านทุกครั้ง · 8 สถานะแล้ว รวม "หยุดงานที่ไซต์"'],
    ['CI-15', 'แยกช่องประเภทงานออกจากลิสต์ไซต์', 'หน้าเช็คอิน', 'done', ''],
    ['CI-16', 'ลิสต์ไซต์กรองตามประเภทงาน', 'หน้าเช็คอิน — เลือกซ่อมบำรุงแล้วดูว่าโครงการที่เสร็จแล้วปรากฏ', 'done', ''],
    ['CI-17', 'ตัวเลือกสถานที่อื่น สำหรับงานสำรวจ', 'หน้าเช็คอิน → ประเภทงาน "สำรวจ"', 'partial', 'การแปลงเป็นโครงการจริงยังไม่ทำ'],
    ['CI-18', 'เติมลักษณะการไปให้อัตโนมัติ ไม่ต้องกรอกเหตุผล', 'หน้าเช็คอิน — เปลี่ยนลักษณะการไปแล้วบันทึกได้ทันที ไม่ถามอะไร', 'done', 'ช่องเหตุผลถูกตัดออกทั้งช่อง 8 ก.ย. 2569 · ธงขึ้นเองเฉพาะรายการที่จำนวนมื้อเปลี่ยน ดูที่ประวัติเช็คอิน · UAT FB-2 FB-3 FB-4 FB-5'],
    ['CI-19', 'ปรับรายการลักษณะการไปงาน', 'ทะเบียนของกลาง → S20 · หน้าตั้งค่า → เบี้ยเลี้ยง', 'partial', 'เปลี่ยนชื่อเป็น "อยู่หน้างานนอกเวลา" แล้ว · จำนวนมื้อเมื่อประเภทงานเป็นประจำออฟฟิศ ยังไม่เคาะ ตั้งเป็นพารามิเตอร์ค่าตั้งต้น 0'],
    ['CI-22', 'ประวัติเช็คอิน กำหนดช่วงที่แสดงและแบ่งหน้า', 'ประวัติเช็คอินของฉัน — ปุ่มเลื่อนเดือน และแบ่งหน้า', 'done', 'จำนวนวันต่อหน้าเป็นพารามิเตอร์ที่หน้าตั้งค่า ลองตั้งเป็น 5 ดูได้'],
    ['CI-23', 'ค้นหาและกรองประวัติเช็คอินตามช่วงวันที่', 'ประวัติเช็คอินของฉัน → เลือกช่วงวันที่เอง + กรองสถานะ', 'done', 'กรองเฉพาะวันมาสายหรือวันขาดงานได้ · หน้านี้ไล่เป็นรายวัน ไม่ใช่เฉพาะวันที่มีเช็คอิน'],
    ['CI-24', 'สรุปของตัวเองสำหรับพนักงาน', 'เมนู "สรุปของฉัน"', 'done', 'วันทำงาน มาสาย ขาดงาน วันลาที่ใช้ ยอดคงเหลือแต่ละถังพร้อมวันหมดอายุ · ไม่มีตัวเลขเงินตาม CI-03'],
    ['CI-25', 'ไปหลายไซต์ในวันเดียว ไซต์หลักหนึ่ง แวะเพิ่มได้', 'หน้าเช็คอิน → ปุ่ม "แวะไซต์เพิ่ม" (หลังเช็คอินแล้ว)', 'done', 'ไม่เพิ่มมื้อ ไม่เพิ่มวันชดเชย · คน-วัน 1.0 ยกให้ไซต์หลัก ไซต์แวะนับเป็นจำนวนครั้ง · ตั้งพารามิเตอร์เป็น 0 แล้วปุ่มหาย'],
    ['CI-26', 'ไซต์หยุดงาน ฝนตก รอของ เข้าพื้นที่ไม่ได้', 'หน้าเช็คอิน → ปุ่ม "หยุดงานที่ไซต์" (กดได้หลังเช็คอินแล้ว)', 'done', 'ยังได้มื้อ ไม่นับขาดงาน ไม่หักวันลา · เหตุผลเลือกจากทะเบียน S21'],
    ['CI-27', 'เช็คอินตอนไม่มีสัญญาณ', '—', 'cant', 'ต้องมี PWA และคิวส่งจริง'],
    ['CI-28', 'เก็บพิกัดตอนเช็คอิน', 'หน้าเช็คอิน (ประกาศครั้งแรก) · ปฏิทิน/ทีมของฉัน → กดวันเพื่อดูระยะ', 'partial', 'บันทึกอย่างเดียว ไม่บล็อก ไม่แสดงระยะให้พนักงานเห็น · เบราว์เซอร์อาจไม่ให้พิกัดตอนเปิดจากไฟล์ ซึ่งต้องผ่านได้ตามปกติ'],
    ['CI-20', 'เช็คอินปุ่มเดียวสำหรับพนักงานประจำออฟฟิศ', 'หน้าเช็คอิน → ประเภทงาน "ประจำออฟฟิศ"', 'done', ''],
    ['CI-21', 'แปลงข้อมูลเช็คอินเดิม', '—', 'cant', 'ต้องรันกับข้อมูลจริง 3,300+ รายการ'],
    ['ACC-01', 'สิทธิ์ติ๊กได้หลายอัน', 'ทะเบียนพนักงาน → เปิดโปรไฟล์ → แท็บสิทธิ์', 'cant', 'ต้นแบบยังถือได้คนละหนึ่งสิทธิ์ — กระทบตัวสลับผู้ใช้และเมนูตามบทบาททั้งระบบ'],
    ['ACC-04', 'ไม่ลบคน ใช้สถานะแทน', 'ทะเบียนพนักงาน — ไม่มีปุ่มลบทั้งในรายการและในโปรไฟล์', 'done', 'ทดลองงาน · ประจำ · พ้นสภาพ · ระงับการใช้'],
    ['ACC-05', 'Staff ID ระบบออกให้', 'ทะเบียนพนักงาน → + เพิ่มพนักงาน → ขั้นที่ 3', 'done', 'เห็นรหัสก่อนกดบันทึก และใช้ซ้ำไม่ได้'],
    ['ACC-06', 'ตำแหน่งและแผนกเป็นดรอปดาวน์ตั้งค่าได้', 'โปรไฟล์ → แท็บงานและองค์กร · ตำแหน่งงาน (O2)', 'done', 'ห้ามพิมพ์อิสระ'],
    ['ACC-07', 'ล้างข้อมูลเดิมให้คนกาเอง', 'จับคู่ข้อมูลเดิม (O3)', 'done', 'ห้ามมีปุ่มจับคู่อัตโนมัติ · ค่าเดิมแสดงคู่ตลอด'],
    ['ACC-09', 'ขอแก้โควตาเข้าคิวผู้บริหาร', 'โปรไฟล์ → แท็บงานและองค์กร → ปุ่มขอแก้โควตา', 'partial', 'ต้นแบบยังไม่มีหน้าคิวของเรื่องนี้'],
    ['ACC-10', 'หน้าโปรไฟล์ของตัวเอง', 'เมนู "ข้อมูลของฉัน" (A4)', 'done', 'ไม่มีอะไรเกี่ยวกับสิทธิ์ในหน้านี้'],
    ['ACC-11', 'ตั้งรหัสผ่านทับต้องแจ้งเจ้าตัว', 'โปรไฟล์ → แท็บสิทธิ์ → ตั้งรหัสผ่านใหม่', 'partial', 'ต้นแบบไม่มีระบบล็อกอินจริง พิสูจน์ได้แค่หน้าจอเตือน'],
    ['ACC-12', 'ห้ามมีปุ่มสร้างบัญชีทดสอบ', 'ทะเบียนพนักงาน → + เพิ่มพนักงาน', 'done', 'ไล่ดูทั้งสามขั้นแล้วต้องไม่มีปุ่มนี้'],
    ['ACC-13', 'หน้าเตือนข้อมูลไม่ครบ', 'เมนู "ข้อมูลไม่ครบ" (A5)', 'done', 'กดบรรทัดแล้วไปที่รายการที่กรองไว้แล้ว'],
    ['ACC-14', 'เปลี่ยนสิทธิ์ต้องยืนยันและลง audit log', 'โปรไฟล์ → แท็บสิทธิ์ → ติ๊กสิทธิ์อื่น', 'done', 'กล่องยืนยันบอกว่าเปลี่ยนจากอะไรเป็นอะไร · กันปลดคนสุดท้ายที่ถือสิทธิ์ฝ่ายบุคคล/ผู้บริหาร'],
    ['ACC-16', 'ขั้นตอนเมื่อคนพ้นสภาพ', 'โปรไฟล์ → แท็บงานและองค์กร → เปลี่ยนสถานะเป็นพ้นสภาพ', 'done', 'กดผ่านไม่ได้ถ้ายังไม่โอนลูกทีมและใบลาค้าง'],
    ['ACC-19', 'ดูในมุมมองของบทบาทอื่น', 'เมนู "ดูในมุมมองบทบาทอื่น" (A6)', 'cant', 'ต้นแบบมีตัวสลับผู้ใช้อยู่แล้วซึ่งเป็นคนละอย่าง — ACC-19 เป็นของระบบจริงและอ่านอย่างเดียว'],
    ['O1', 'ตั้งค่าโครงสร้างองค์กร บริษัท → ฝ่าย → แผนก', 'โครงสร้างองค์กร', 'done', 'แถว "ยังไม่ได้จัดฝ่าย/แผนก" มีเสมอ · ปิดฝ่ายที่ยังมีคนอยู่ไม่ได้'],
    ['O2', 'ตั้งค่าตำแหน่งงาน', 'ตำแหน่งงาน', 'done', 'ตำแหน่งไม่ให้สิทธิ์ · ปิดตำแหน่งที่มีคนถืออยู่ไม่ได้'],
    ['O3', 'หน้าล้างข้อมูลเดิม', 'จับคู่ข้อมูลเดิม', 'done', 'ใช้ครั้งเดียวแล้วเลิก · มีแถบความคืบหน้า'],
    ['O4', 'Organization Chart', 'ผังองค์กร', 'partial', 'สลับสองมุมมองได้ · การพิมพ์หรือบันทึกเป็นภาพยังไม่ทำ'],
    ['O5', 'หน้ารวมความผิดปกติของโครงสร้าง', 'ความผิดปกติของโครงสร้าง', 'done', 'คนละหน้ากับ A5 — หน้านี้เป็นเรื่องโครงสร้าง'],
    ['C1', 'ภาพรวมใบเซอร์', 'ใบรับรองและเอกสาร', 'done', 'สี่การ์ด ใช้ได้ · ใกล้หมด · หมดอายุ · ยังไม่มี · ไม่มีการสอบเทียบเครื่องมือปน'],
    ['C2', 'มุมมองรายคน', 'ใบรับรองและเอกสาร → กดที่ชื่อคน', 'done', 'ท่อน "ยังไม่มี" อยู่ในหน้าเดียวกัน · กดชื่อใบดูประวัติทุกฉบับได้'],
    ['C3', 'ฟอร์มเพิ่มและต่ออายุใบ', 'ใบรับรองและเอกสาร → + เพิ่มใบ', 'done', 'ชนิดใบเป็นดรอปดาวน์เท่านั้น · วันหมดอายุคำนวณให้แต่แก้ทับได้'],
    ['C4', 'ฟอร์มเอกสารอ่อนไหว', '+ เพิ่มใบ → เลือกชนิดที่ติด 🔒', 'done', 'ไม่มีช่องแนบไฟล์ ไม่มีช่องรายละเอียดผล ไม่มีหมายเหตุ · เปิดดูลง audit log'],
    ['C5', 'ตั้งค่าชนิดใบรับรอง', 'ชนิดใบรับรอง', 'partial', '21 ชนิดครบ แต่ยังแก้ค่าจากหน้าจอไม่ได้ในต้นแบบ'],
    ['C6', 'หน้าจอตอนใบหมดอายุแล้วยังจะลงไซต์', 'เข้าใช้งานเป็น อนุชา ทับทิมทอง → เช็คอินงานหน้าไซต์', 'done', 'เด้งได้เฉพาะตอนเช็คอินเข้าไซต์ เพราะ S22 ไม่อยู่ในเฟสนี้'],
    ['CAL-01', 'ปฏิทินเดียว หลายชั้นข้อมูล', 'ปฏิทิน', 'partial', 'ชั้นใบเซอร์ยังไม่มี รอสเปกใบเซอร์'],
    ['CAL-02', 'แถบตอบทันที เสาร์นี้ทำงานไหม', 'หน้าเช็คอิน และหน้าปฏิทิน', 'done', ''],
    ['CAL-03', 'สิทธิ์การมองเห็น', 'ปฏิทิน — สลับบทบาทแล้วเทียบ', 'done', ''],
    ['CAL-04', 'กิจกรรมและประกาศจาก HR', 'ปฏิทิน (แสดงผล)', 'partial', 'หน้าสร้างกิจกรรมอยู่ในรอบ 2'],
    ['CAL-05', 'แตะวันเพื่อดูรายละเอียด', 'ปฏิทิน', 'done', ''],
    ['CAL-06', 'ปฏิทินทีมสำหรับหัวหน้า', 'ทีมของฉัน · ปฏิทินชั้นทีม', 'done', ''],
    ['LV-01', 'โครงสร้างประเภทการลาใหม่', 'ยื่นใบลา — 12 ประเภทครบตามกฎหมาย', 'done', ''],
    ['LV-02', 'ตั้งค่าสิทธิ์การลาให้ครบทุกคน', 'ทะเบียนพนักงาน → รายชื่อที่ข้อมูลยังไม่ครบ', 'partial', 'โควตาพิเศษยังแก้ผ่านหน้าจอไม่ได้'],
    ['LV-03', 'คำนวณจำนวนวันอัตโนมัติ', 'ยื่นใบลา', 'done', ''],
    ['LV-04', 'ยกเลิกและแก้ไขใบลา', 'ใบลาของฉัน', 'done', ''],
    ['LV-05', 'ผู้อนุมัติสำรอง', 'ทะเบียนพนักงาน + คิวอนุมัติ', 'done', ''],
    ['LV-06', 'ครึ่งวันเช้า / ครึ่งวันบ่าย', 'ยื่นใบลา', 'done', ''],
    ['LV-07', 'แนบเอกสารประกอบ', 'ยื่นใบลา', 'partial', 'การควบคุมสิทธิ์เปิดไฟล์ตาม PDPA ต้องทำฝั่งเซิร์ฟเวอร์'],
    ['LV-09', 'เพดานคนลาพร้อมกัน', 'ตั้งค่า → เพดานคนลาต่อวัน', 'partial', 'ตัวเลขยังไม่เคาะ'],
    ['LV-10', 'แจ้งเตือนผ่าน LINE', '—', 'cant', ''],
    ['LV-12', 'ยกยอดพักร้อนข้ามปีและวันหมดอายุ', 'ใบลาของฉัน → ตารางถัง', 'done', ''],
    ['BR-01', 'ลำดับการตัดวันลา', 'ยื่นใบลา → กล่อง "จะหักจากถังไหน"', 'done', 'ธนากร ตั้งค่าไว้ให้ตรงเกณฑ์ตรวจรับพอดี'],
    ['BR-02', 'ลาเกินสิทธิ์ เตือนและแยกวัน', 'ยื่นใบลา', 'done', ''],
    ['BR-03', 'ลาป่วยเกิน 30 วันที่จ่าย ห้ามบล็อก', 'ยื่นใบลา → ลาป่วย', 'done', ''],
    ['BR-04', 'ประเภทการลาที่ปฏิเสธไม่ได้', 'คิวอนุมัติ → เปิดใบลาป่วย', 'done', ''],
    ['BR-05', 'กำหนดยื่นล่วงหน้าและย้อนหลัง', 'ยื่นใบลา', 'done', ''],
    ['BR-06', 'วันหยุดคั่นกลางไม่นับ', 'ยื่นใบลา — เลือกช่วงคร่อมวันหยุด', 'done', ''],
    ['BR-07', 'ห้ามใบลาทับกัน', 'ยื่นใบลา — ยื่นซ้ำวันเดิม', 'done', ''],
    ['BR-08', 'ใบลาที่คร่อมสิ้นปี', 'ยื่นใบลา', 'partial', 'แยกยอดตามปีแล้ว แต่ยังไม่แสดงแยกบรรทัด'],
    ['BR-09', 'สิทธิ์ระหว่างทดลองงาน', 'ยื่นใบลาในนาม อนุชา (ยังไม่ผ่านประเมิน)', 'done', ''],
    ['BR-12', 'สถานะใบลา + ยอดจอง/ยอดใช้ไป', 'ใบลาของฉัน · ยื่นใบลา', 'done', 'ทำ 7 สถานะ รวม "ตีกลับ" ของ APV-04'],
    ['APV-01', 'ตารางอำนาจอนุมัติเป็นค่าตั้งค่า', 'ทะเบียนของกลาง → ตารางอำนาจ', 'partial', 'แสดงได้ ยังแก้ผ่านหน้าจอไม่ได้'],
    ['APV-02', 'ผู้อนุมัติผูกกับบทบาท และมีผู้สำรอง', 'คิวอนุมัติ', 'done', ''],
    ['APV-03', 'ห้ามอนุมัติของตัวเอง', 'คิวอนุมัติ — ยื่นใบลาในนามหัวหน้า', 'done', ''],
    ['APV-04', 'ขั้นตรวจอัตโนมัติก่อนถึงคน', 'ยื่นใบลาที่ทับซ้อน → ถูกตีกลับ', 'done', ''],
    ['APV-05', 'หน้าอนุมัติรวม แสดงเฉพาะที่มีอำนาจ', 'คิวอนุมัติ — สลับบทบาท', 'partial', 'การตรวจ payload ต้องทำบนระบบจริง'],
    ['APV-06', 'ปฏิเสธต้องมีเหตุผล', 'คิวอนุมัติ', 'done', ''],
    ['APV-10', 'อนุมัติแก้เช็คอินข้ามวัน และวันชดเชย', 'คิวอนุมัติ', 'done', 'ขัดกับ APV-05 เรื่องหัวหน้าเห็นเบี้ยเลี้ยง'],
    ['APV-13', 'บันทึกการอนุมัติที่ลบไม่ได้', 'บันทึกการใช้งาน', 'cant', 'ต้องบังคับที่สิทธิ์ฐานข้อมูล'],
    ['DSH-01', 'หยุดใช้ตัวเลขค่าข้าวชุดปัจจุบัน', 'Dashboard — แถบเตือนด้านบน', 'done', ''],
    ['DSH-02', 'ตรวจและแก้เกณฑ์เวลามาสาย', 'ตั้งค่า → ผ่อนผัน แล้วดูประวัติเช็คอิน', 'done', 'ตัวเลขยังไม่เคาะ'],
    ['DSH-03', 'ตัดบัญชีทดสอบออกจากทุกตัวเลข', 'Dashboard', 'done', ''],
    ['DSH-06', 'การ์ดวันนี้ แตกตามสถานะรายวัน', 'Dashboard', 'done', ''],
    ['DSH-08', 'ทุกตัวเลขต้องกดเข้าไปหารายการได้', 'Dashboard — กดที่การ์ด', 'done', '']
  ];

  SS.views.specmap = function (host) {
    var badge = { done: ['pill-green', 'ทดสอบได้'], partial: ['pill-yellow', 'ทดสอบได้บางส่วน'],
                  cant: ['pill-red', 'ทดสอบที่นี่ไม่ได้'], todo: ['pill-gray', 'ยังไม่ทำในรอบนี้'],
                  dropped: ['pill-gray', 'ยกเลิกแล้ว'] };
    var n = { done: 0, partial: 0, cant: 0, todo: 0, dropped: 0 };
    MAP.forEach(function (r) { n[r[3]]++; });
    var h = '<div class="grid g4">' +
      '<div class="stat g"><div class="l">ทดสอบได้ครบ</div><div class="v">' + n.done + '</div></div>' +
      '<div class="stat y"><div class="l">ทดสอบได้บางส่วน</div><div class="v">' + n.partial + '</div></div>' +
      '<div class="stat r"><div class="l">ทดสอบที่นี่ไม่ได้</div><div class="v">' + n.cant + '</div></div>' +
      '<div class="stat k"><div class="l">ยังไม่ทำในรอบนี้</div><div class="v">' + (n.todo + n.dropped) + '</div></div></div>';
    h += '<div class="card" style="margin-top:16px"><div class="chead"><h2>แผนที่ข้อกำหนด → หน้าจอที่ใช้ทดสอบ</h2><span class="sp"></span>' +
      '<button class="btn btn-ghost btn-sm" id="mapCsv">ส่งออก CSV</button></div>' +
      U.note('mock', 'รายการนี้ครอบคลุมเฉพาะรอบที่ 1 · งานเบี้ยเลี้ยง (ALW) ทั้งหมด และ DSH ที่เหลือ อยู่ในรอบที่ 2') +
      '<div class="tw"><table class="t"><thead><tr><th>รหัส</th><th>ข้อกำหนด</th><th>ทดสอบที่หน้าจอ</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead><tbody>' +
      MAP.map(function (r) {
        return '<tr><td><b>' + esc(r[0]) + '</b></td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td>' +
          '<td>' + U.pill(badge[r[3]][0], badge[r[3]][1]) + '</td><td><small>' + esc(r[4]) + '</small></td></tr>'; }).join('') +
      '</tbody></table></div></div>';
    host.innerHTML = h;
    $('#mapCsv').addEventListener('click', function () {
      U.csv('spec-map.csv', [['รหัส', 'ข้อกำหนด', 'หน้าจอ', 'สถานะ', 'หมายเหตุ']].concat(MAP.map(function (r) {
        return [r[0], r[1], r[2], badge[r[3]][1], r[4]]; })));
    });
  };
})();
