/* ==========================================================================
   views-team.js — ปฏิทิน (CAL-01…CAL-06) และหน้าจอฝั่งหัวหน้างาน/ฝ่ายบุคคล
   ========================================================================== */
window.SS = window.SS || {}; SS.views = SS.views || {};
(function () {
  var U = SS.ui, C = SS.core, S = SS.store;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(x) { return U.esc(x); }

  /* ======================================================================
     CAL-01 · ปฏิทินเดียว หลายชั้นข้อมูล
     ====================================================================== */
  var calState = { month: SS.d.month(SS.d.today()), sel: SS.d.today(), layers: null };

  function loadLayers() {
    if (calState.layers) return calState.layers;
    var def = { mine: true, events: true, team: true };
    try { calState.layers = JSON.parse(localStorage.getItem('ss-cal-layers')) || def; }
    catch (e) { calState.layers = def; }
    return calState.layers;
  }
  function saveLayers() { try { localStorage.setItem('ss-cal-layers', JSON.stringify(calState.layers)); } catch (e) {} }

  function canSeeTeam(u) { return ['manager', 'hr', 'exec', 'admin'].indexOf(u.role) >= 0; }

  SS.views.calendar = function (host) {
    var me = S.user(), L = loadLayers();
    var m = calState.month, y = +m.slice(0, 4), mo = +m.slice(5, 7);
    var first = m + '-01', dow0 = SS.d.dow(first);
    var last = new Date(y, mo, 0).getDate();

    var h = SS.views._quickBar(me.id);

    h += '<div class="calwrap"><div class="calhead">' +
      '<button class="iconbtn" id="calPrev">‹</button>' +
      '<h3>' + esc(U.monthName(m)) + '</h3>' +
      '<button class="iconbtn" id="calNext">›</button>' +
      '<button class="btn btn-ghost btn-sm" id="calToday">วันนี้</button>' +
      '<span class="sp" style="margin-left:auto"></span>' + U.ref(['CAL-01', 'CAL-03', 'CAL-05']) + '</div>';

    h += '<div class="layers">' +
      '<label class="choice on" title="ปิดไม่ได้ตามสเปก"><input type="checkbox" checked disabled> ชั้นประเภทวัน</label>' +
      '<label class="choice' + (L.mine ? ' on' : '') + '"><input type="checkbox" id="lyMine"' + (L.mine ? ' checked' : '') + '> ชั้นของฉัน</label>' +
      '<label class="choice' + (L.events ? ' on' : '') + '"><input type="checkbox" id="lyEv"' + (L.events ? ' checked' : '') + '> ชั้นกิจกรรม</label>' +
      (canSeeTeam(me) ? '<label class="choice' + (L.team ? ' on' : '') + '"><input type="checkbox" id="lyTeam"' + (L.team ? ' checked' : '') + '> ชั้นทีม</label>' : '') +
      '</div>';

    h += '<div class="calgrid">' + U.DAY_FULL.map(function (d) { return '<div class="dh">' + d.slice(0, 2) + '</div>'; }).join('');
    for (var i = 0; i < dow0; i++) h += '<div></div>';
    for (var d = 1; d <= last; d++) {
      var date = m + '-' + SS.d.pad(d);
      var cal = C.calendar(date);
      var dt = SS.dayType(cal.type) || {};
      var st = C.dayStatus(me.id, date);
      var marks = '';
      if (L.mine) {
        if (st.status === 'work' && st.checkin) marks += '<i class="mk mk-ci"></i>';
        if (st.status === 'leave') marks += '<i class="mk mk-lv"></i>';
        if (st.status === 'pending' || st.status === 'review') marks += '<i class="mk mk-pd"></i>';
      }
      if (L.events && eventsOn(date, me).length) marks += '<i class="mk mk-ev"></i>';
      h += '<button class="cell' + (date === SS.d.today() ? ' today' : '') + (date === calState.sel ? ' sel' : '') + '" data-day="' + date + '"' +
        ' style="background:' + dt.color + '">' +
        '<span class="dn">' + d + '</span>' +
        '<span class="tag">' + esc(cal.name || (cal.type === 'work' ? '' : SS.name(SS.dayType, cal.type))) + '</span>' +
        '<span class="marks">' + marks + '</span></button>';
    }
    h += '</div>';
    h += '<div class="legend">' +
      SS.DAY_TYPES.map(function (t) { return '<span><i style="background:' + t.color + '"></i>' + esc(t.name) + '</span>'; }).join('') +
      '<span><i style="background:#3A8A5C;border-radius:50%"></i>เช็คอินแล้ว</span>' +
      '<span><i style="background:#1B52B0;border-radius:50%"></i>วันลาของฉัน</span>' +
      '<span><i style="background:#FFC72C;border-radius:50%"></i>รออนุมัติ</span>' +
      '<span><i style="background:#F07800;border-radius:50%"></i>กิจกรรม</span></div>';
    h += '</div>';

    h += '<div id="dayDetail" style="margin-top:16px"></div>';

    if (me.role === 'employee') {
      h += U.note('mock', 'พนักงานเห็นเฉพาะวันลาและการเช็คอินของตัวเอง ไม่เห็นชื่อคนอื่นเลย ตาม CAL-03');
    }

    host.innerHTML = h;
    $('#calPrev').addEventListener('click', function () { calState.month = shiftMonth(m, -1); SS.app.refresh(); });
    $('#calNext').addEventListener('click', function () { calState.month = shiftMonth(m, 1); SS.app.refresh(); });
    $('#calToday').addEventListener('click', function () { calState.month = SS.d.month(SS.d.today()); calState.sel = SS.d.today(); SS.app.refresh(); });
    ['lyMine|mine', 'lyEv|events', 'lyTeam|team'].forEach(function (pair) {
      var p = pair.split('|'), el = $('#' + p[0]);
      if (el) el.addEventListener('change', function () { L[p[1]] = this.checked; saveLayers(); SS.app.refresh(); });
    });
    $$('[data-day]').forEach(function (b) {
      b.addEventListener('click', function () { calState.sel = b.getAttribute('data-day'); SS.app.refresh(); });
    });
    renderDayDetail($('#dayDetail'), me, calState.sel);
  };

  function shiftMonth(m, n) {
    var y = +m.slice(0, 4), mo = +m.slice(5, 7) + n;
    while (mo < 1) { mo += 12; y--; } while (mo > 12) { mo -= 12; y++; }
    return y + '-' + SS.d.pad(mo);
  }

  function eventsOn(date, me) {
    return S.get().events.filter(function (e) {
      if (!(e.from <= date && e.to >= date)) return false;
      if (e.scope === 'all') return true;
      if (e.scope.indexOf('dept:') === 0) return e.scope.slice(5) === me.dept;
      return true;
    });
  }

  /* CAL-05 · แตะวันแล้วเปิดรายละเอียดเป็นลิสต์ด้านล่าง */
  function renderDayDetail(el, me, date) {
    var cal = C.calendar(date), st = C.dayStatus(me.id, date);
    var evs = eventsOn(date, me);
    var h = '<div class="card"><div class="chead"><h2>' + esc(U.date(date, 'full')) + '</h2>' +
      '<span class="sub">' + esc(cal.name || SS.name(SS.dayType, cal.type)) + '</span><span class="sp"></span>' + U.dayPill(st) + '</div>';

    h += '<ul class="tl">';
    if (st.checkin) h += '<li><span class="tt">' + esc(st.checkin.time) + '</span><span>เช็คอิน · ' +
      esc(SS.name(SS.jobType, st.checkin.jobType)) + (st.checkin.projectId ? ' · ' + esc(SS.name(SS.project, st.checkin.projectId)) : '') + '</span></li>';
    if (st.leave) h += '<li><span class="tt">ใบลา</span><span>' + esc(st.leave.id) + ' · ' + esc(SS.name(SS.leaveType, st.leave.type)) +
      ' · ' + U.leavePill(st.leave.status) + '</span></li>';
    evs.forEach(function (e) {
      h += '<li><span class="tt">กิจกรรม</span><span><b>' + esc(e.title) + '</b><br><small>' + esc(e.detail) + '</small>' +
        (e.countsAsWorkday ? '<br>' + U.pill('pill-green', 'นับเป็นวันทำงาน — ผู้เข้าร่วมได้ลาชดเชยโดยไม่ต้องเช็คอิน') : '') + '</span></li>';
    });
    if (!st.checkin && !st.leave && !evs.length) h += '<li><span class="tt">—</span><span>ไม่มีรายการในวันนี้</span></li>';
    h += '</ul>';

    h += '<div class="choices" style="margin-top:12px">';
    if (cal.working && !st.leave) h += '<button class="btn btn-ghost btn-sm" id="qLeave">ขอลาวันนี้</button>';
    if (st.checkin) h += '<button class="btn btn-ghost btn-sm" id="qAllow">เบิกเบี้ยเลี้ยง</button>';
    h += '</div>';

    /* CAL-06 · ชั้นทีม */
    if (canSeeTeam(me) && loadLayers().team) {
      var team = me.role === 'manager' ? S.team(me.id) : S.counted();
      h += '<div class="sect">ทีมในวันนี้ ' + U.ref('CAL-06') + '</div>';
      if (date > SS.d.today()) h += U.note('mock', 'วันในอนาคตแสดงเฉพาะการลา ยังไม่มีข้อมูลแผนขึ้นไซต์ — ช่องว่างไม่ได้แปลว่าคนว่าง');
      h += '<div class="tw"><table class="t"><thead><tr><th>ชื่อ</th><th>สถานะ</th><th>ไซต์ / ช่วงวัน</th><th></th></tr></thead><tbody>';
      team.forEach(function (p) {
        var s2 = C.dayStatus(p.id, date);
        var info = s2.checkin ? (s2.checkin.projectId ? SS.name(SS.project, s2.checkin.projectId) : SS.name(SS.jobType, s2.checkin.jobType)) +
                     ' · เช็คอิน ' + s2.checkin.time + (C.lateMinutes(s2.checkin) ? ' (สาย ' + C.lateMinutes(s2.checkin) + ' นาที)' : '')
                   : s2.leave ? U.range(s2.leave.from, s2.leave.to) : '—';
        h += '<tr><td>' + U.person(p, SS.name(SS.dept, p.dept)) + '</td><td>' + U.dayPill(s2) +
          (s2.status === 'absent' && !s2.notYet && s2.cause !== 'none' ? '<br><small>' + esc(SS.ABSENT_CAUSE[s2.cause]) + '</small>' : '') + '</td>' +
          '<td>' + esc(info) + '</td><td style="text-align:right">' +
          (s2.status === 'pending' && me.role === 'manager' ? '<button class="btn btn-sm" data-appr="' + s2.leave.id + '">ตัดสิน</button>' : '') +
          '</td></tr>';
      });
      h += '</tbody></table></div>' +
        U.note('mock', 'แสดงชื่อ ช่วงวัน และสถานะเท่านั้น ไม่แสดงประเภทการลาหรือเหตุผล ตาม CAL-03');
    }
    h += '</div>';
    el.innerHTML = h;
    if ($('#qLeave')) $('#qLeave').addEventListener('click', function () { SS.app.go('leavenew'); });
    if ($('#qAllow')) $('#qAllow').addEventListener('click', function () { U.toast('หน้าจอเบี้ยเลี้ยงอยู่ในรอบที่ 2', ''); });
    $$('[data-appr]').forEach(function (b) {
      b.addEventListener('click', function () { decideLeaveModal(b.getAttribute('data-appr')); });
    });
  }

  /* ======================================================================
     APV-05 · หน้าอนุมัติรวม — แสดงเฉพาะที่ตัวเองมีอำนาจ
     ====================================================================== */
  SS.views.approvals = function (host) {
    var me = S.user();
    var q = queueFor(me);
    var h = '';

    if (me.role === 'hr') {
      h += U.note('mock', 'ฝ่ายบุคคลมีคิวอนุมัติเฉพาะเบี้ยเลี้ยงรายรอบ ใบลาที่ตกมาแบบ fallback (J4) และคิว "รอตรวจสอบ" — ใบลาอื่นเห็นได้แบบอ่านอย่างเดียว ไม่มีปุ่มตัดสิน');
    }

    /* ใบลา */
    h += '<div class="card"><div class="chead"><h2>ใบลารออนุมัติ</h2>' +
      '<span class="sub">เรียงตามความเร่งด่วน ใกล้ถึงวันลาอยู่บนสุด</span><span class="sp"></span>' +
      U.ref(['APV-05', 'APV-06', 'BR-04']) + '</div>';
    h += leaveQueueTable(me, q.leaves, false);
    h += '</div>';

    /* HR อ่านอย่างเดียว */
    if (me.role === 'hr' && q.readonly.length) {
      h += '<div class="card"><div class="chead"><h2>ใบลาของทั้งบริษัท (อ่านอย่างเดียว)</h2><span class="sp"></span>' + U.ref(['APV-05', 'S8']) + '</div>' +
        U.note('mock', 'ส่วนนี้ไม่ใช่คิวงานของฝ่ายบุคคล — ไม่มีปุ่มตัดสินทั้งในหน้าจอและใน API · ถ้าต้องการเร่ง ให้เร่งผ่านหัวหน้างาน ห้ามติดต่อพนักงานให้ถอนใบ') +
        leaveQueueTable(me, q.readonly, true) + '</div>';
    }

    /* วันชดเชย */
    h += '<div class="card"><div class="chead"><h2>คำขอวันชดเชย</h2><span class="sp"></span>' + U.ref(['CI-08', 'APV-10']) + '</div>';
    if (!q.comps.length) h += U.empty('ไม่มีคำขอค้าง');
    else {
      h += '<div class="tw"><table class="t"><thead><tr><th>เลขที่</th><th>พนักงาน</th><th>วันที่ทำงาน</th><th>ที่มา</th><th class="n">ได้กี่วัน</th><th>หมดอายุ</th><th></th></tr></thead><tbody>';
      q.comps.forEach(function (c) {
        var b = C.buckets(c.empId).filter(function (x) { return x.kind === 'comp' && !x.expired; }).reduce(function (a, x) { return a + x.days; }, 0);
        h += '<tr><td>' + esc(c.id) + '</td><td>' + U.person(S.employee(c.empId)) + '</td>' +
          '<td>' + esc(U.date(c.date, 'long')) + '</td><td>' + esc(c.source) + '</td>' +
          '<td class="n">' + U.num(c.days) + '</td><td>' + esc(U.date(C.expiryOf(SS.d.year(c.date)), 'long')) +
          '<br><small>ปัจจุบันมีค้าง ' + U.num(b) + ' วัน</small></td>' +
          '<td style="text-align:right"><button class="btn btn-green btn-sm" data-comp-y="' + c.id + '">อนุมัติ</button> ' +
          '<button class="btn btn-ghost btn-sm" data-comp-n="' + c.id + '">ไม่อนุมัติ</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';

    /* OT */
    h += '<div class="card"><div class="chead"><h2>การทำงานนอกเวลา</h2><span class="sp"></span>' + U.ref('CI-10') + '</div>';
    if (!q.ots.length) h += U.empty('ไม่มีคำขอค้าง');
    else {
      h += '<div class="tw"><table class="t"><thead><tr><th>เลขที่</th><th>พนักงาน</th><th>วันที่</th><th>ช่วงเวลา</th><th class="n">ชั่วโมง</th><th>เหตุผล</th><th></th></tr></thead><tbody>';
      q.ots.forEach(function (o) {
        h += '<tr><td>' + esc(o.id) + '</td><td>' + U.person(S.employee(o.empId)) + '</td><td>' + esc(U.date(o.date)) + '</td>' +
          '<td>' + esc(o.start + ' – ' + o.end) + '</td><td class="n">' + U.num(o.hours) + '</td><td>' + esc(o.reason) + '</td>' +
          '<td style="text-align:right"><button class="btn btn-green btn-sm" data-ot-y="' + o.id + '">อนุมัติ</button> ' +
          '<button class="btn btn-ghost btn-sm" data-ot-n="' + o.id + '">ไม่อนุมัติ</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';

    /* ขอแก้เช็คอินข้ามวัน */
    h += '<div class="card"><div class="chead"><h2>ขอแก้ไขเช็คอินข้ามวัน</h2><span class="sp"></span>' + U.ref(['CI-06', 'APV-10']) + '</div>';
    if (!q.edits.length) h += U.empty('ไม่มีคำขอค้าง');
    else {
      h += '<div class="tw"><table class="t"><thead><tr><th>เลขที่</th><th>พนักงาน</th><th>วันที่</th><th>ค่าเดิม → ค่าใหม่</th><th>ผลกระทบ</th><th></th></tr></thead><tbody>';
      q.edits.forEach(function (r) {
        var ci = S.get().checkins.filter(function (c) { return c.id === r.checkinId; })[0] || {};
        var before = C.allowanceOf(Object.assign({}, ci, r.before)) || {};
        var after = C.allowanceOf(Object.assign({}, ci, r.after)) || {};
        var delta = (after.amount || 0) - (before.amount || 0);
        h += '<tr><td>' + esc(r.id) + '</td><td>' + U.person(S.employee(r.empId)) + '</td><td>' + esc(U.date(r.date)) + '</td>' +
          '<td><small>' + esc(SS.name(SS.project, r.before.projectId) || '—') + ' → <b>' + esc(SS.name(SS.project, r.after.projectId) || '—') + '</b><br>' +
            esc(SS.name(SS.travelType, r.before.travelType)) + ' → <b>' + esc(SS.name(SS.travelType, r.after.travelType)) + '</b></small></td>' +
          '<td><small>เบี้ยเลี้ยงเปลี่ยน <b>' + (delta >= 0 ? '+' : '') + U.money(delta) + '</b><br>เหตุผล: ' + esc(r.reason) + '</small></td>' +
          '<td style="text-align:right"><button class="btn btn-green btn-sm" data-ed-y="' + r.id + '">อนุมัติ</button> ' +
          '<button class="btn btn-ghost btn-sm" data-ed-n="' + r.id + '">ไม่อนุมัติ</button></td></tr>';
      });
      h += '</tbody></table></div>' +
        U.note('open', 'APV-10 บังคับให้แสดงว่าเบี้ยเลี้ยงเปลี่ยนกี่บาท แต่ APV-05 เขียนว่าหัวหน้างาน "ไม่เห็นเบี้ยเลี้ยงของใครเลย ทั้งในหน้าจอและใน payload" และ ALW-13 เขียนว่าหัวหน้างานเห็นยอดลูกทีม — สามข้อนี้ขัดกัน ต้องเคาะก่อนพัฒนาจริง');
    }
    h += '</div>';

    host.innerHTML = h;
    bindQueue();
  };

  function queueFor(me) {
    var db = S.get(), out = { leaves: [], readonly: [], comps: [], ots: [], edits: [] };
    var pending = db.leaves.filter(function (l) { return l.status === 'pending'; });
    pending.forEach(function (l) {
      var route = C.approverOf(l.empId, 'leave');
      var mine = route.approver && route.approver.id === me.id;
      /* APV-03 · ห้ามอนุมัติของตัวเอง */
      if (l.empId === me.id) mine = false;
      if (mine) out.leaves.push(l);
      else if (me.role === 'hr' || me.role === 'exec') out.readonly.push(l);
    });
    out.leaves.sort(function (a, b) { return a.from < b.from ? -1 : 1; });
    out.readonly.sort(function (a, b) { return a.from < b.from ? -1 : 1; });

    function ownTeam(empId) {
      if (empId === me.id) return false;
      var route = C.approverOf(empId, 'comp-day');
      return route.approver && route.approver.id === me.id;
    }
    out.comps = db.compRequests.filter(function (c) { return c.status === 'pending' && ownTeam(c.empId); });
    out.ots = db.otRequests.filter(function (o) { return o.status === 'pending' && ownTeam(o.empId); });
    out.edits = db.editRequests.filter(function (r) { return r.status === 'pending' && ownTeam(r.empId); });
    return out;
  }

  function leaveQueueTable(me, rows, readonly) {
    if (!rows.length) return U.empty('ไม่มีใบลาค้างในคิวของคุณ');
    var h = '<div class="tw"><table class="t"><thead><tr><th>เลขที่</th><th>พนักงาน</th><th>ประเภท</th><th>ช่วงวัน</th><th class="n">วัน</th><th>ป้าย</th><th>อายุเรื่อง</th><th></th></tr></thead><tbody>';
    rows.forEach(function (l) {
      var t = SS.leaveType(l.type);
      var chk = C.autoCheckLeave(l);
      var age = SS.d.diff(l.createdAt, SS.d.today());
      var tags = '';
      if (chk.split.unpaid > 0) tags += U.pill('pill-red', 'เกินสิทธิ์') + ' ';
      chk.warns.forEach(function (w) { if (w.code === 'BR-05') tags += U.pill('pill-orange', 'ยื่นกระชั้น') + ' '; });
      if (t.refusable !== 'yes') tags += U.pill('pill-blue', 'ปฏิเสธไม่ได้ตามกฎหมาย') + ' ';
      if (l.attachment) tags += U.pill('pill-gray', 'มีเอกสารแนบ') + ' ';
      var urgent = SS.d.diff(SS.d.today(), l.from) <= 1;
      h += '<tr' + (urgent ? ' style="background:#FFFBF3"' : '') + '><td>' + esc(l.id) + '</td>' +
        '<td>' + U.person(S.employee(l.empId)) + '</td>' +
        '<td>' + esc(t.name) + '</td><td>' + esc(U.range(l.from, l.to)) +
          (l.halfDay ? '<br><small>' + (l.halfDay === 'AM' ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย') + '</small>' : '') + '</td>' +
        '<td class="n">' + U.num(chk.days) + '</td><td>' + tags + '</td>' +
        '<td>' + age + ' วัน' + (urgent ? '<br>' + U.pill('pill-red', 'ใกล้ถึงวันลา') : '') + '</td>' +
        '<td style="text-align:right">' + (readonly ? '<span class="pill pill-gray">อ่านอย่างเดียว</span>'
          : '<button class="btn btn-sm" data-appr="' + l.id + '">ตัดสิน</button>') + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  function bindQueue() {
    $$('[data-appr]').forEach(function (b) { b.addEventListener('click', function () { decideLeaveModal(b.getAttribute('data-appr')); }); });
    $$('[data-comp-y]').forEach(function (b) { b.addEventListener('click', function () { S.decideComp(b.getAttribute('data-comp-y'), 'approved', ''); U.toast('อนุมัติวันชดเชยแล้ว · ยอดเข้ากระเป๋าลาชดเชยวันทำงาน', 'ok'); SS.app.refresh(); }); });
    $$('[data-comp-n]').forEach(function (b) { b.addEventListener('click', function () { reasonBox('ไม่อนุมัติวันชดเชย', function (r) { S.decideComp(b.getAttribute('data-comp-n'), 'rejected', r); U.toast('บันทึกแล้ว · เช็คอินยังนับเป็นวันทำงานปกติ แต่ไม่ได้วันชดเชย'); SS.app.refresh(); }); }); });
    $$('[data-ot-y]').forEach(function (b) { b.addEventListener('click', function () { var r = S.decideOT(b.getAttribute('data-ot-y'), 'approved', ''); U.toast('อนุมัติ ' + r.hours + ' ชั่วโมงแล้ว', 'ok'); SS.app.refresh(); }); });
    $$('[data-ot-n]').forEach(function (b) { b.addEventListener('click', function () { reasonBox('ไม่อนุมัติการทำงานนอกเวลา', function (r) { S.decideOT(b.getAttribute('data-ot-n'), 'rejected', r); SS.app.refresh(); }); }); });
    $$('[data-ed-y]').forEach(function (b) { b.addEventListener('click', function () { S.decideEditRequest(b.getAttribute('data-ed-y'), 'approved', ''); U.toast('อนุมัติการแก้เช็คอินแล้ว', 'ok'); SS.app.refresh(); }); });
    $$('[data-ed-n]').forEach(function (b) { b.addEventListener('click', function () { reasonBox('ไม่อนุมัติการแก้เช็คอิน', function (r) { S.decideEditRequest(b.getAttribute('data-ed-n'), 'rejected', r); SS.app.refresh(); }); }); });
  }

  function reasonBox(title, cb) {
    U.modal({
      title: title,
      body: '<div class="field"><label>เหตุผล <span class="req">*</span></label><textarea id="rzn"></textarea>' +
        '<div class="hint">ปฏิเสธโดยไม่กรอกเหตุผลไม่ได้ และระบบแจ้งผู้ยื่นทันที ' + U.ref('APV-06') + '</div></div>',
      buttons: [{ label: 'ยกเลิก', cls: 'btn-ghost' },
        { label: 'ยืนยัน', cls: 'btn-danger', onClick: function () {
            var v = $('#rzn').value.trim();
            if (!v) { U.toast('กรุณากรอกเหตุผล', 'err'); return false; }
            cb(v);
          } }]
    });
  }

  /* BR-04 · ประเภทที่ปฏิเสธไม่ได้ → ไม่มีปุ่มปฏิเสธตั้งแต่แรก */
  function decideLeaveModal(id) {
    var lv = S.get().leaves.filter(function (l) { return l.id === id; })[0];
    if (!lv) return;
    var t = SS.leaveType(lv.type), emp = S.employee(lv.empId);
    var chk = C.autoCheckLeave(lv);
    var alloc = (t.bucket === 'annual' || t.bucket === 'comp') ? C.allocate(lv.empId, chk.days) : null;
    /* LV-08 · เตือนว่าวันนั้นมีใครลาแล้วบ้าง */
    var others = S.get().leaves.filter(function (l) {
      return l.id !== lv.id && l.empId !== lv.empId && ['pending', 'approved', 'used'].indexOf(l.status) >= 0 &&
             !(l.to < lv.from || l.from > lv.to);
    });

    var body = '<dl class="kv">' +
      '<dt>ผู้ยื่น</dt><dd>' + esc(emp.name) + ' · ' + esc(emp.position) + '</dd>' +
      '<dt>ประเภท</dt><dd>' + esc(t.name) + ' <small style="font-weight:400;color:#5A6B80">(' + esc(t.law) + ')</small></dd>' +
      '<dt>ช่วงวัน</dt><dd>' + esc(U.range(lv.from, lv.to)) + (lv.halfDay ? ' · ' + (lv.halfDay === 'AM' ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย') : '') + '</dd>' +
      '<dt>จำนวนวัน</dt><dd>' + U.num(chk.days) + ' ' + (t.unit === 'cal' ? 'วันปฏิทิน' : 'วันทำงาน') + '</dd>' +
      '<dt>เหตุผล</dt><dd style="font-weight:400">' + esc(lv.reason) + '</dd>' +
      (lv.attachment ? '<dt>เอกสารแนบ</dt><dd>' + esc(lv.attachment) + '</dd>' : '') +
      '</dl>';

    if (lv.attachment) body += U.note('cant', 'การเปิดเอกสารสุขภาพต้องลง audit log ทุกครั้ง และเปิดได้เฉพาะหัวหน้างานผู้อนุมัติใบนี้กับฝ่ายบุคคล — การควบคุมสิทธิ์จริงต้องทำฝั่งเซิร์ฟเวอร์');

    if (chk.split.unpaid > 0) body += '<div class="warn">เกินสิทธิ์ — ได้รับค่าจ้าง ' + U.num(chk.split.paid) + ' วัน · ไม่ได้รับค่าจ้าง ' + U.num(chk.split.unpaid) + ' วัน</div>';
    chk.warns.forEach(function (w) { body += '<div class="warn">' + esc(w.msg) + ' ' + U.ref(w.code) + '</div>'; });

    if (alloc && alloc.plan.length) {
      body += '<div class="plan"><div class="h">จะหักจากถังไหน (BR-01)</div>' +
        alloc.plan.map(function (p) { return '<div class="row"><span>' + esc(p.label) + '</span><b>' + U.num(p.days) + ' วัน</b></div>'; }).join('') + '</div>';
    }
    if (others.length) {
      body += '<div class="warn"><b>วันนี้มีคนลาแล้ว ' + others.length + ' คน</b><br>' +
        esc(others.map(function (o) { return (S.employee(o.empId) || {}).name; }).join(' · ')) + ' ' + U.ref(['LV-08', 'LV-09']) + '</div>';
    }

    var buttons = [{ label: 'ปิด', cls: 'btn-ghost' }];
    if (t.refusable === 'no' || t.refusable === 'doc') {
      body = '<div class="okbox">' + esc(t.name) + ' เป็นสิทธิ์ตามกฎหมาย ปฏิเสธเพราะงานยุ่งไม่ได้ — ปุ่มจึงเป็น "รับทราบ" และ "ขอเอกสารเพิ่ม" ' + U.ref('BR-04') + '</div>' + body;
      buttons.push({ label: 'ขอเอกสารเพิ่ม', cls: 'btn-ghost', onClick: function () {
        U.modal({ title: 'ขอเอกสารเพิ่ม',
          body: '<div class="field"><label>เหตุผล (เลือกจากรายการ พิมพ์อิสระไม่ได้)</label><select id="dr">' +
            '<option>เอกสารไม่ครบ</option><option>วันที่ไม่ตรงกับเอกสาร</option></select></div>',
          buttons: [{ label: 'ยกเลิก', cls: 'btn-ghost' }, { label: 'ส่งคำขอ', cls: 'btn', onClick: function () {
            S.decideLeave(id, 'bounced', $('#dr').value); U.toast('ส่งคำขอเอกสารเพิ่มแล้ว'); SS.app.refresh(); } }] });
        return false;
      } });
      buttons.push({ label: 'รับทราบ', cls: 'btn-green', onClick: function () {
        S.decideLeave(id, 'approved', 'รับทราบ'); U.toast('รับทราบใบลาแล้ว', 'ok'); SS.app.refresh(); } });
    } else {
      buttons.push({ label: 'ไม่อนุมัติ', cls: 'btn-danger', onClick: function () {
        reasonBox('ไม่อนุมัติใบลา ' + id, function (r) {
          S.decideLeave(id, 'rejected', r);
          U.toast('บันทึกแล้ว · แจ้งผู้ยื่นทันทีว่าวันที่ ' + U.date(lv.from) + ' ไม่อนุมัติ กรุณามาทำงานตามปกติ', 'err');
          SS.app.refresh();
        });
        return false;
      } });
      buttons.push({ label: 'อนุมัติ', cls: 'btn-green', onClick: function () {
        S.decideLeave(id, 'approved', ''); U.toast('อนุมัติแล้ว · ตัดยอดจากถังตามลำดับ BR-01', 'ok'); SS.app.refresh(); } });
    }
    U.modal({ title: 'ตัดสินใบลา ' + id, body: body, buttons: buttons });
  }

  /* ======================================================================
     CAL-06 · มุมมองรายวันแบบรายชื่อ — "วันนี้ทีมอยู่ไหนกันบ้าง"
     ====================================================================== */
  SS.views.team = function (host) {
    var me = S.user(), T = SS.d.today();
    var team = me.role === 'manager' ? S.team(me.id) : S.counted().filter(function (e) { return e.id !== me.id; });
    var groups = {};
    team.forEach(function (p) {
      var s = C.dayStatus(p.id, T);
      (groups[s.status] = groups[s.status] || []).push({ emp: p, st: s });
    });
    var order = ['work', 'leave', 'pending', 'review', 'absent', 'holiday', 'exempt'];
    var h = '<div class="card"><div class="chead"><h2>ทีมของฉันวันนี้</h2>' +
      '<span class="sub">' + esc(U.date(T, 'full')) + '</span><span class="sp"></span>' + U.ref(['CAL-06', 'CI-14']) + '</div>';

    h += '<div class="grid g4" style="margin-bottom:14px">' + order.slice(0, 4).map(function (k) {
      var d = SS.dayStatus(k);
      var cls = k === 'work' ? 'g' : k === 'leave' ? '' : k === 'pending' ? 'y' : 'o';
      return '<div class="stat ' + cls + '"><div class="l">' + esc(d.name) + '</div><div class="v">' + ((groups[k] || []).length) + '<small>คน</small></div></div>';
    }).join('') + '</div>';

    order.forEach(function (k) {
      var g = groups[k]; if (!g || !g.length) return;
      var d = SS.dayStatus(k);
      var gname = (k === 'absent' && g[0].st.notYet) ? 'ยังไม่เช็คอิน' : d.name;
      h += '<div class="sect">' + esc(gname) + ' · ' + g.length + ' คน</div><div class="tw"><table class="t"><tbody>';
      g.forEach(function (x) {
        var info = x.st.checkin
          ? (x.st.checkin.projectId ? SS.name(SS.project, x.st.checkin.projectId) : SS.name(SS.jobType, x.st.checkin.jobType)) +
            ' · เช็คอิน ' + x.st.checkin.time + (C.lateMinutes(x.st.checkin) ? ' (สาย ' + C.lateMinutes(x.st.checkin) + ' นาที)' : '')
          : x.st.leave ? U.range(x.st.leave.from, x.st.leave.to)
          : x.st.status === 'absent' ? (x.st.notYet ? 'ยังไม่ถึงเวลาเลิกงาน จึงยังไม่ตัดสินว่าขาดงาน' : SS.ABSENT_CAUSE[x.st.cause]) : '—';
        h += '<tr><td style="width:34%">' + U.person(x.emp) + '</td><td>' + esc(info) + '</td>' +
          '<td style="text-align:right">' + (x.st.status === 'pending' && me.role === 'manager'
            ? '<button class="btn btn-sm" data-appr="' + x.st.leave.id + '">อนุมัติ / ปฏิเสธ</button>' : '') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    });
    h += U.note('mock', 'สถานะทั้งหมดคำนวณจากข้อมูลดิบตอนแสดงผล ไม่ได้บันทึกไว้ตอนสิ้นวัน — ยื่นลาย้อนหลังแล้วสถานะของวันนั้นเปลี่ยนเองทันที (CI-14)');
    h += '</div>';
    host.innerHTML = h;
    bindQueue();
  };

  SS.views._decideLeaveModal = decideLeaveModal;
  SS.views._queueFor = queueFor;
})();
