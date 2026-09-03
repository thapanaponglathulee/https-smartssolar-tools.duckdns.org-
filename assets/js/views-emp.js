/* ==========================================================================
   views-emp.js — หน้าจอฝั่งพนักงาน
   เช็คอิน · ประวัติเช็คอิน · ยื่นใบลา · ใบลาของฉัน · สิทธิ์วันลา · ปฏิทิน
   ========================================================================== */
window.SS = window.SS || {}; SS.views = SS.views || {};
(function () {
  var U = SS.ui, C = SS.core, S = SS.store;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(x) { return U.esc(x); }

  /* ======================================================================
     CAL-02 · แถบตอบทันที — อยู่ทั้งหน้าเช็คอินและหน้าปฏิทิน
     ====================================================================== */
  function quickBar(empId) {
    var rows = C.quickBar(empId);
    return '<div class="qbar">' + rows.map(function (r) {
      var working = r.cal.working;
      var cls = working ? 'dotg' : 'dotr';
      var label = working ? 'ทำงาน' : 'หยุด';
      var why = r.cal.name || SS.name(SS.dayType, r.cal.type);
      var extra = '';
      if (r.status.status === 'leave') { label = 'คุณลาวันนี้'; extra = SS.name(SS.leaveType, r.status.leave.type); cls = 'doty'; }
      else if (r.label !== 'วันนี้' && r.status.status === 'leave') { label = 'คุณลา'; cls = 'doty'; }
      if (r.label === 'วันนี้' && !working) extra = 'เช็คอินวันนี้จะขอลาชดเชยวันทำงานได้ ' + S.get().params.holidayCompRate + ' วัน';
      return '<div class="q"><span class="ql">' + esc(r.label) + '</span>' +
        '<span class="qd">' + esc(U.date(r.date, 'full')) + '</span>' +
        '<span class="qs"><i class="dotg ' + cls + '"></i> ' + esc(label) + ' · ' + esc(why) + '</span>' +
        (extra ? '<span class="qn">' + esc(extra) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }

  /* ======================================================================
     หน้าเช็คอิน
     ====================================================================== */
  SS.views.checkin = function (host) {
    var me = S.user(), T = SS.d.today();
    var st = C.dayStatus(me.id, T), cal = C.calendar(T);
    var ci = st.checkin;
    var last = S.lastChoice(me.id) || { jobType: me.defaultJobType, projectId: null, travelType: null };

    var html = quickBar(me.id);

    /* แผงบน */
    html += '<div class="ci"><div class="in"><div class="left">' +
      '<div class="dt">' + esc(U.date(T, 'full')) + '</div>' +
      '<div class="cl" id="bigClock">--:--<small>:--</small></div>' +
      /* CI-05 · ระบบระบุประเภทวันให้เอง ไม่มีช่องให้เลือก */
      '<div class="sh">' + esc(cal.working ? 'วันทำงานปกติ' : 'วันหยุด') +
        ' · ' + esc(cal.name || SS.name(SS.dayType, cal.type)) +
        (me.shift === 'night' ? ' · กะกลางคืน เริ่ม ' + esc(S.get().params.nightStart) : '') + '</div>' +
      (!cal.working ? '<div class="sh" style="color:#FFC72C;font-weight:600">เช็คอินวันนี้จะขอลาชดเชยวันทำงานได้ ' + S.get().params.holidayCompRate + ' วัน</div>' : '') +
      '</div><div class="right">';

    if (ci) {
      var late = C.lateMinutes(ci);
      html += '<div class="chips">' +
        '<div class="chip"><div class="k">เวลาเช็คอิน</div><div class="v">' + esc(ci.time) + '</div></div>' +
        '<div class="chip"><div class="k">สถานะ</div><div class="v" style="font-size:15px">' + (late ? 'สาย ' + late + ' นาที' : 'ตรงเวลา') + '</div></div>' +
        '<div class="chip"><div class="k">ประเภทงาน</div><div class="v" style="font-size:15px">' + esc(SS.name(SS.jobType, ci.jobType)) + '</div></div>' +
        '</div>' +
        '<div style="font-size:13.5px;color:#DDE6F6">' +
          (ci.projectId ? 'ไซต์: ' + esc(SS.name(SS.project, ci.projectId)) : ci.otherPlace ? 'สถานที่อื่น: ' + esc(ci.otherPlace) : 'ไม่ต้องระบุไซต์') +
          ' · ' + esc(SS.name(SS.travelType, ci.travelType)) + (ci.overtime ? ' + ทำงานนอกเวลา' : '') +
        '</div>';
    } else {
      html += '<div style="font-size:14.5px;color:#DDE6F6">ยังไม่ได้ลงเวลาวันนี้ — กรอกแบบฟอร์มด้านล่างแล้วกดเช็คอิน</div>';
      if (last.jobType) html += '<div style="font-size:13px;color:#C6D4EC">ระบบเลือกค่าจากครั้งล่าสุดไว้ให้แล้ว ' + U.ref('CI-11') + '</div>';
    }
    html += '</div></div></div>';

    /* ฟอร์ม */
    if (!ci) {
      html += '<div class="card"><div class="chead"><h2>ลงเวลาเข้างาน</h2>' +
        '<span class="sp"></span>' + U.ref(['CI-15', 'CI-16', 'CI-17', 'CI-18', 'CI-20']) + '</div>' +
        '<div id="ciForm"></div></div>';
    } else {
      html += '<div class="card"><div class="chead"><h2>วันนี้</h2><span class="sp"></span>' + U.ref(['CI-03', 'CI-06', 'CI-10']) + '</div>' +
        '<div class="choices">' +
          '<button class="btn btn-ghost" id="btnEditCi">แก้ไขรายการวันนี้</button>' +
          '<button class="btn btn-ghost" id="btnOT">บันทึกการทำงานนอกเวลา</button>' +
          (ci.projectId ? '<button class="btn btn-accent" id="btnAllow">เบิกเบี้ยเลี้ยงของวันนี้</button>' : '') +
        '</div>' +
        /* CI-03 · ห้ามมีจำนวนเงินบนปุ่มหรือที่ใดในหน้านี้ */
        U.note('mock', 'หน้านี้ตั้งใจไม่แสดงจำนวนเงิน จำนวนมื้อ หรืออัตราใด ๆ ตาม CI-03 — ปุ่มเบิกเบี้ยเลี้ยงจึงไม่มีตัวเลขกำกับ') +
        '</div>';
    }

    /* สรุปของฉันแบบย่อ */
    html += myMini(me);

    host.innerHTML = html;
    if (!ci) renderCheckinForm($('#ciForm'), me, last);
    else {
      $('#btnEditCi').addEventListener('click', function () { editCheckinModal(ci); });
      $('#btnOT').addEventListener('click', function () { otModal(me); });
      if ($('#btnAllow')) $('#btnAllow').addEventListener('click', function () {
        U.modal({
          title: 'เบิกเบี้ยเลี้ยงของวันนี้',
          body: '<p style="font-size:14px">ระบบกรอกไซต์และวันที่ให้แล้ว</p>' +
            '<dl class="kv"><dt>วันที่</dt><dd>' + esc(U.date(T, 'long')) + '</dd>' +
            '<dt>ไซต์</dt><dd>' + esc(SS.name(SS.project, ci.projectId)) + '</dd></dl>' +
            U.note('cant', 'หน้าจอเบี้ยเลี้ยงเต็มรูปแบบอยู่ในรอบที่ 2 (ALW-08 หน้าสรุปให้ยืนยัน) — ที่นี่แสดงเฉพาะทางเข้าตาม CI-03'),
          buttons: [{ label: 'ปิด', cls: 'btn-ghost' }]
        });
      });
    }
    startClock();
  };

  function myMini(me) {
    var q = C.quota(me.id, 'LT-ANNUAL'), sick = C.quota(me.id, 'LT-SICK');
    var comp = C.buckets(me.id).filter(function (b) { return b.kind === 'comp' && !b.expired; })
                               .reduce(function (a, b) { return a + b.days; }, 0);
    var pend = S.get().leaves.filter(function (l) { return l.empId === me.id && l.status === 'pending'; }).length;
    return '<div class="grid g4">' +
      '<div class="stat"><div class="l">ลาพักผ่อนคงเหลือ</div><div class="v">' + U.num(q.remaining || 0) + '<small>วัน</small></div><div class="n">ใช้ไป ' + U.num(q.used) + ' · จอง ' + U.num(q.reserved) + '</div></div>' +
      '<div class="stat o"><div class="l">ลาชดเชยวันทำงาน</div><div class="v">' + U.num(comp) + '<small>วัน</small></div><div class="n">ดูวันหมดอายุที่หน้าสิทธิ์วันลา</div></div>' +
      '<div class="stat g"><div class="l">ลาป่วยที่ได้ค่าจ้างคงเหลือ</div><div class="v">' + U.num(Math.max(0, 30 - sick.used - sick.reserved)) + '<small>วัน</small></div><div class="n">ลาป่วยเกินสิทธิ์ยังยื่นได้ (BR-03)</div></div>' +
      '<div class="stat y"><div class="l">ใบลารออนุมัติ</div><div class="v">' + pend + '<small>ใบ</small></div><div class="n">' + (pend ? 'ยังกันยอดไว้ ยังไม่ตัดโควตา' : 'ไม่มีใบค้าง') + '</div></div>' +
      '</div>';
  }

  /* ---------- ฟอร์มเช็คอิน (CI-15 → CI-20) ---------- */
  function renderCheckinForm(el, me, last) {
    var state = {
      jobType: last.jobType || me.defaultJobType || 'office',
      projectId: last.projectId || null,
      otherPlace: '',
      travelType: null, travelChanged: false, travelReason: '',
      overtime: false, detail: ''
    };
    if (me.shift === 'night') state.travelType = 'night';

    function draw() {
      var jt = SS.jobType(state.jobType);
      var sites = C.sitesFor(state.jobType);
      var defTravel = me.shift === 'night' ? 'night' : jt.defaultTravel;
      if (state.travelType === null) state.travelType = defTravel;
      state.travelChanged = state.travelType !== defTravel;

      var h = '<div class="field"><label>ประเภทงาน <span class="req">*</span></label>' +
        '<select id="fJob">' + U.options(S.get().jobTypes.filter(function (j) { return j.enabled; }), state.jobType) + '</select>' +
        '<div class="hint">ประเภทงานเป็นข้อมูลของการเช็คอินแต่ละครั้ง ไม่ใช่คุณสมบัติของโครงการ — โครงการเดียวเปลี่ยนประเภทงานตามเฟสได้</div></div>';

      /* CI-20 · ประจำออฟฟิศ ซ่อนช่องไซต์และลักษณะการไปทั้งหมด */
      if (jt.requireSite) {
        h += '<div class="field"><label>ไซต์งาน <span class="req">*</span></label>';
        if (!sites.length && !jt.otherPlace) {
          h += '<div class="issue">' + esc(jt.emptyMsg) + '</div>';
        } else {
          h += '<select id="fSite"><option value="">— เลือกไซต์งาน —</option>' +
            sites.map(function (p) { return '<option value="' + p.id + '"' + (p.id === state.projectId ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') +
            (jt.otherPlace ? '<option value="__other"' + (state.projectId === '__other' ? ' selected' : '') + '>สถานที่อื่น (พิมพ์ชื่อเอง)</option>' : '') +
            '</select>';
          if (!sites.length) h += '<div class="hint" style="color:#A85200">' + esc(jt.emptyMsg) + '</div>';
          else h += '<div class="hint">แสดงเฉพาะโครงการสถานะ ' + jt.siteFilter.map(function (s) {
            return s === 'active' ? 'กำลังดำเนินการ' : s === 'done' ? 'เสร็จสิ้น' : 'แผนงาน'; }).join(' / ') + ' ตามประเภทงานที่เลือก ' + '</div>';
        }
        h += '</div>';
        if (state.projectId === '__other') {
          h += '<div class="field"><label>ชื่อสถานที่ <span class="req">*</span></label>' +
            '<input type="text" id="fOther" value="' + esc(state.otherPlace) + '" placeholder="เช่น โรงงานลูกค้าใหม่ ย่านบางนา">' +
            '<div class="hint">ใช้อัตราเริ่มต้นของบริษัท · แอดมินจะแปลงเป็นโครงการจริงภายหลังได้ โดยเช็คอินเดิมผูกตามไปด้วย</div></div>';
        }
      }

      if (!jt.travelLocked) {
        h += '<div class="field"><label>ลักษณะการไปงาน</label>' +
          '<select id="fTravel">' + U.options(S.get().travelTypes.filter(function (t) { return t.enabled && !t.additive; }), state.travelType) + '</select>' +
          '<div class="hint">ระบบเติมค่าให้จากประเภทงานแล้ว (' + esc(SS.name(SS.travelType, defTravel)) + ') ส่วนใหญ่ไม่ต้องแตะช่องนี้</div></div>';
        if (state.travelChanged) {
          h += '<div class="field"><label>เหตุผลที่เลือกต่างจากค่าตั้งต้น <span class="req">*</span></label>' +
            '<input type="text" id="fReason" value="' + esc(state.travelReason) + '" placeholder="เช่น ไปอบรมหน้างานครึ่งวัน">' +
            '<div class="hint">รายการที่ต่างจากค่าตั้งต้นจะขึ้นสัญลักษณ์ให้ผู้อนุมัติเห็น</div></div>';
        }
        h += '<label class="choice' + (state.overtime ? ' on' : '') + '" style="margin-bottom:13px">' +
          '<input type="checkbox" id="fOT"' + (state.overtime ? ' checked' : '') + '> ทำงานนอกเวลาปฏิบัติงาน</label>';
      } else {
        h += U.note('mock', 'ประเภทงาน "ประจำออฟฟิศ" ล็อกลักษณะการไปงานไว้ตายตัว จึงไม่แสดงช่องนี้และไม่ต้องเลือกไซต์ — เช็คอินเหลือกดปุ่มเดียว');
      }

      h += '<div class="field"><label>รายละเอียดงาน</label>' +
        '<textarea id="fDetail" placeholder="สรุปสั้น ๆ ว่าวันนี้ทำอะไร">' + esc(state.detail) + '</textarea></div>' +
        '<button class="btn btn-accent btn-lg btn-block" id="btnCi">เช็คอิน</button>';

      el.innerHTML = h;

      $('#fJob').addEventListener('change', function () {
        state.jobType = this.value;
        /* CI-16 · เปลี่ยนประเภทงาน → ลิสต์ไซต์รีเฟรช ล้างค่าที่เลือกถ้าไม่อยู่ในลิสต์ใหม่ */
        var ok = C.sitesFor(state.jobType).some(function (p) { return p.id === state.projectId; });
        if (!ok) { state.projectId = null; state.otherPlace = ''; }
        state.travelType = null; state.travelReason = '';
        draw();
      });
      if ($('#fSite')) $('#fSite').addEventListener('change', function () { state.projectId = this.value || null; draw(); });
      if ($('#fOther')) $('#fOther').addEventListener('input', function () { state.otherPlace = this.value; });
      if ($('#fTravel')) $('#fTravel').addEventListener('change', function () { state.travelType = this.value; draw(); });
      if ($('#fReason')) $('#fReason').addEventListener('input', function () { state.travelReason = this.value; });
      if ($('#fOT')) $('#fOT').addEventListener('change', function () { state.overtime = this.checked; draw(); });
      $('#fDetail').addEventListener('input', function () { state.detail = this.value; });
      $('#btnCi').addEventListener('click', submit);
    }

    function submit() {
      var jt = SS.jobType(state.jobType);
      if (jt.requireSite && !state.projectId) return U.toast('กรุณาเลือกไซต์งาน', 'err');
      if (state.projectId === '__other' && !state.otherPlace.trim()) return U.toast('กรุณาพิมพ์ชื่อสถานที่', 'err');
      if (state.travelChanged && !state.travelReason.trim()) return U.toast('เลือกลักษณะการไปงานต่างจากค่าตั้งต้น ต้องกรอกเหตุผล', 'err');
      var r = S.checkIn({
        empId: me.id, jobType: state.jobType,
        projectId: state.projectId === '__other' ? null : state.projectId,
        otherPlace: state.projectId === '__other' ? state.otherPlace.trim() : '',
        travelType: state.travelType, travelChanged: state.travelChanged, travelReason: state.travelReason,
        overtime: state.overtime, detail: state.detail
      });
      if (!r.ok) return U.toast(r.msg, 'err');
      U.toast('เช็คอินเวลา ' + r.rec.time + (r.late ? ' · สาย ' + r.late + ' นาที' : ' · ตรงเวลา'), r.late ? '' : 'ok');
      if (r.comp) U.toast('สร้างคำขอ "ลาชดเชยวันทำงาน" ' + r.comp.days + ' วัน เข้าคิวอนุมัติของหัวหน้าแล้ว', 'ok');
      SS.app.go('checkin');
    }
    draw();
  }

  /* ---------- CI-06 · แก้ไขเช็คอิน ---------- */
  function editCheckinModal(ci) {
    var hrs = SS.d.diff(ci.date, SS.d.today()) * 24 + (SS.d.min(SS.d.now()) - SS.d.min(ci.time)) / 60;
    var within = hrs <= S.get().params.selfEditHours;
    var jt = SS.jobType(ci.jobType);
    U.modal({
      title: 'แก้ไขการเช็คอิน ' + U.date(ci.date),
      body:
        (within
          ? '<div class="okbox">อยู่ในเวลาที่แก้เองได้ (' + S.get().params.selfEditHours + ' ชั่วโมงนับจากเช็คอิน) — บันทึกแล้วมีผลทันที</div>'
          : '<div class="warn">เกินเวลาที่แก้เองได้แล้ว การแก้นี้จะเข้าคิวให้หัวหน้างานอนุมัติ ' + U.ref('APV-10') + '</div>') +
        '<div class="field"><label>เวลาเช็คอิน</label><input type="text" value="' + esc(ci.time) + '" disabled>' +
        '<div class="hint">ห้ามแก้เวลาเช็คอิน เพราะเป็นหลักฐานการมาสาย</div></div>' +
        '<div class="field"><label>ประเภทงาน</label><select id="eJob">' +
          U.options(S.get().jobTypes.filter(function (j) { return j.enabled; }), ci.jobType) + '</select></div>' +
        '<div class="field"><label>ไซต์งาน</label><select id="eSite"><option value="">— ไม่ระบุ —</option>' +
          S.get().projects.map(function (p) { return '<option value="' + p.id + '"' + (p.id === ci.projectId ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>ลักษณะการไปงาน</label><select id="eTravel">' +
          U.options(S.get().travelTypes.filter(function (t) { return t.enabled && !t.additive; }), ci.travelType) + '</select></div>' +
        '<div class="field"><label>รายละเอียดงาน</label><textarea id="eDetail">' + esc(ci.detail) + '</textarea></div>' +
        '<div class="field"><label>เหตุผลที่แก้ ' + (within ? '' : '<span class="req">*</span>') + '</label><input type="text" id="eReason"></div>',
      buttons: [
        { label: 'ปิด', cls: 'btn-ghost' },
        { label: within ? 'บันทึกการแก้ไข' : 'ยื่นขอแก้ไข', cls: 'btn', onClick: function () {
            var reason = $('#eReason').value.trim();
            if (!within && !reason) { U.toast('กรุณากรอกเหตุผล', 'err'); return false; }
            var r = S.editCheckin(ci.id, {
              jobType: $('#eJob').value, projectId: $('#eSite').value || null,
              travelType: $('#eTravel').value, detail: $('#eDetail').value
            }, reason);
            U.toast(r.needApproval ? 'ยื่นขอแก้ไขแล้ว รอหัวหน้างานอนุมัติ' : 'บันทึกการแก้ไขแล้ว', 'ok');
            SS.app.refresh();
          } }
      ]
    });
  }

  /* ---------- CI-10 · ทำงานนอกเวลา ---------- */
  function otModal(me) {
    var b = S.get().balances[me.id] || {};
    U.modal({
      title: 'บันทึกการทำงานนอกเวลา',
      body:
        '<div class="okbox">ชั่วโมงนอกเวลาแปลงเป็นวันหยุดอย่างเดียว ไม่มีทางเลือกรับเป็นเงิน — ครบ ' +
          S.get().params.otHoursPerDay + ' ชั่วโมงได้ 1 วัน เศษยกไปรวมครั้งถัดไป</div>' +
        '<div class="frow"><div class="field"><label>วันที่</label><input type="date" id="oDate" value="' + SS.d.today() + '"></div>' +
        '<div class="field"><label>ไซต์</label><select id="oSite"><option value="">— ไม่ระบุ —</option>' +
          S.get().projects.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="frow"><div class="field"><label>เวลาเริ่ม</label><input type="time" id="oStart" value="17:30"></div>' +
        '<div class="field"><label>เวลาสิ้นสุด</label><input type="time" id="oEnd" value="21:30"></div></div>' +
        '<div class="field"><label>เหตุผล <span class="req">*</span></label><textarea id="oReason"></textarea></div>' +
        '<div class="hint" style="font-size:13px">ชั่วโมงค้างสะสมปัจจุบัน <b>' + U.num(b.otCarry || 0) + ' ชั่วโมง</b></div>',
      buttons: [
        { label: 'ยกเลิก', cls: 'btn-ghost' },
        { label: 'ยื่นเข้าคิวอนุมัติ', cls: 'btn', onClick: function () {
            var reason = $('#oReason').value.trim();
            if (!reason) { U.toast('กรุณากรอกเหตุผล', 'err'); return false; }
            var r = S.submitOT({ empId: me.id, date: $('#oDate').value, projectId: $('#oSite').value,
                                 start: $('#oStart').value, end: $('#oEnd').value, reason: reason });
            U.toast('ยื่น ' + r.hours + ' ชั่วโมง เข้าคิวอนุมัติของหัวหน้างานแล้ว', 'ok');
            SS.app.refresh();
          } }
      ]
    });
  }

  /* ======================================================================
     ประวัติเช็คอินของฉัน
     ====================================================================== */
  SS.views.mycheckins = function (host) {
    var me = S.user();
    var rows = S.get().checkins.filter(function (c) { return c.empId === me.id; })
                 .sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 45);
    var h = '<div class="card"><div class="chead"><h2>ประวัติการเช็คอินของฉัน</h2><span class="sp"></span>' + U.ref(['CI-06', 'CI-21']) + '</div>' +
      U.note('mock', 'ไม่มีปุ่มลบ — ใช้การทำเครื่องหมาย "ยกเลิก" แทน และเก็บประวัติการแก้ไขทุกครั้ง') +
      '<div class="tw"><table class="t"><thead><tr><th>วันที่</th><th>เวลา</th><th>ประเภทงาน</th><th>ไซต์งาน</th><th>ลักษณะการไป</th><th>สถานะ</th><th></th></tr></thead><tbody>';
    if (!rows.length) h += '<tr><td colspan="7">' + U.empty('ยังไม่มีประวัติ') + '</td></tr>';
    rows.forEach(function (c) {
      var late = C.lateMinutes(c);
      h += '<tr' + (c.status === 'cancelled' ? ' style="opacity:.5"' : '') + '>' +
        '<td>' + esc(U.date(c.date, 'dow')) + '</td>' +
        '<td>' + esc(c.time) + (late ? ' <span class="pill pill-yellow">สาย ' + late + '</span>' : '') + '</td>' +
        '<td>' + esc(SS.name(SS.jobType, c.jobType)) + '</td>' +
        '<td>' + esc(c.projectId ? SS.name(SS.project, c.projectId) : c.otherPlace || '—') + '</td>' +
        '<td>' + esc(SS.name(SS.travelType, c.travelType)) + (c.travelChanged ? ' <span class="pill pill-orange">แก้จากค่าตั้งต้น</span>' : '') + '</td>' +
        '<td>' + (c.status === 'active' ? U.pill('pill-green', 'ใช้งาน') : U.pill('pill-gray', 'ยกเลิกแล้ว')) +
          (c.editLog && c.editLog.length ? ' <span class="pill pill-blue">แก้ไข ' + c.editLog.length + ' ครั้ง</span>' : '') + '</td>' +
        '<td style="text-align:right">' + (c.status === 'active'
          ? '<button class="btn btn-ghost btn-sm" data-edit="' + c.id + '">แก้ไข</button>' : '') + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    host.innerHTML = h;
    $$('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        editCheckinModal(S.get().checkins.filter(function (c) { return c.id === b.getAttribute('data-edit'); })[0]);
      });
    });
  };

  /* ======================================================================
     ยื่นใบลา (LV-03 · LV-06 · LV-07 · BR-01 · BR-02)
     ====================================================================== */
  SS.views.leavenew = function (host) {
    var me = S.user();
    var f = { type: 'LT-ANNUAL', from: SS.d.today(), to: SS.d.today(), half: '', reason: '', doc: '', ack: false, lateReason: '' };

    function draw() {
      var t = SS.leaveType(f.type);
      var q = C.quota(me.id, f.type);
      var draft = { id: '__draft', empId: me.id, type: f.type, from: f.from, to: f.to < f.from ? f.from : f.to, halfDay: f.half || null };
      var chk = C.autoCheckLeave(draft);
      var days = chk.days;
      var alloc = (t.bucket === 'annual' || t.bucket === 'comp') ? C.allocate(me.id, days) : null;

      var h = '<div class="grid gside"><div>';
      h += '<div class="card"><div class="chead"><h2>ยื่นใบลา</h2><span class="sp"></span>' + U.ref(['LV-03', 'LV-06', 'LV-07', 'BR-01', 'BR-02']) + '</div>';

      h += '<div class="field"><label>ประเภทการลา <span class="req">*</span></label><select id="lType">' +
        U.options(SS.LEAVE_TYPES, f.type) + '</select>' +
        '<div class="hint">' + esc(t.docRule || t.legalMin) + ' · อ้างอิง ' + esc(t.law) + '</div></div>';

      if (q.locked) h += '<div class="issue">' + esc(q.lockReason) + '</div>';

      h += '<div class="frow"><div class="field"><label>ตั้งแต่วันที่ <span class="req">*</span></label><input type="date" id="lFrom" value="' + f.from + '"></div>' +
        '<div class="field"><label>ถึงวันที่ <span class="req">*</span></label><input type="date" id="lTo" value="' + f.to + '"' + (f.half ? ' disabled' : '') + '></div></div>';

      /* LV-06 · ครึ่งวันเช้า/บ่าย */
      h += '<div class="field"><label>ช่วงเวลา</label><div class="choices">' +
        ['', 'AM', 'PM'].map(function (v) {
          var lbl = v === '' ? 'เต็มวัน' : v === 'AM' ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย';
          return '<label class="choice' + (f.half === v ? ' on' : '') + '"><input type="radio" name="half" value="' + v + '"' + (f.half === v ? ' checked' : '') + '> ' + lbl + '</label>';
        }).join('') + '</div></div>';

      h += '<div class="field"><label>เหตุผล <span class="req">*</span></label><textarea id="lReason">' + esc(f.reason) + '</textarea></div>';

      h += '<div class="field"><label>เอกสารแนบ</label><input type="text" id="lDoc" value="' + esc(f.doc) + '" placeholder="ชื่อไฟล์ เช่น ใบรับรองแพทย์.pdf">' +
        '<div class="hint">เอกสารสุขภาพเปิดดูได้เฉพาะหัวหน้างานผู้อนุมัติใบนี้และฝ่ายบุคคล และลง audit log ทุกครั้งที่เปิด ' + U.ref(['LV-07', 'S13']) + '</div></div>';

      /* BR-02 · เกินสิทธิ์ ต้องติ๊กรับทราบ */
      if (chk.split.unpaid > 0) {
        h += '<div class="warn"><b>ลา ' + U.num(days) + ' วัน · สิทธิ์คงเหลือ ' + U.num(chk.split.paid) + ' วัน</b><br>' +
          'ได้รับค่าจ้าง ' + U.num(chk.split.paid) + ' วัน · <b>ไม่ได้รับค่าจ้าง ' + U.num(chk.split.unpaid) + ' วัน</b></div>' +
          '<label class="choice' + (f.ack ? ' on' : '') + '" style="margin-bottom:13px"><input type="checkbox" id="lAck"' + (f.ack ? ' checked' : '') + '> รับทราบว่า ' + U.num(chk.split.unpaid) + ' วันจะไม่ได้รับค่าจ้าง</label>';
      }
      chk.warns.forEach(function (w) { h += '<div class="warn">' + esc(w.msg) + ' ' + U.ref(w.code) + '</div>'; });
      chk.issues.forEach(function (i) { h += '<div class="issue">' + esc(i.msg) + ' ' + U.ref(i.code) + '</div>'; });

      h += '<button class="btn btn-accent btn-lg btn-block" id="lSend">ส่งใบลา</button></div></div>';

      /* ---- คอลัมน์ขวา: สรุปก่อนกดส่ง ---- */
      h += '<div>';
      h += '<div class="card"><div class="chead"><h2>สรุปก่อนกดส่ง</h2></div>' +
        '<dl class="kv">' +
        '<dt>ช่วงวัน</dt><dd>' + esc(U.range(f.from, f.to)) + (f.half ? ' · ' + (f.half === 'AM' ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย') : '') + '</dd>' +
        '<dt>จำนวนวัน</dt><dd>' + U.num(days) + ' ' + (t.unit === 'cal' ? 'วันปฏิทิน' : 'วันทำงาน') + '</dd>' +
        '<dt>ผู้อนุมัติ</dt><dd>' + esc((C.approverOf(me.id, 'leave').approver || {}).name || '—') + '</dd>' +
        '</dl>' +
        (t.unit === 'work' ? '<div class="hint" style="margin-top:6px">ไม่นับวันหยุดที่คั่นกลางตามปฏิทินบริษัท ' + U.ref('BR-06') + '</div>'
                           : '<div class="hint" style="margin-top:6px">กลุ่มลาคลอดนับเป็นวันปฏิทิน รวมวันหยุดที่คั่นอยู่ ' + U.ref('BR-06') + '</div>') +
        '</div>';

      /* BR-01 · แสดงว่าจะตัดจากถังไหนบ้าง */
      if (alloc) {
        h += '<div class="card"><div class="chead"><h2>จะหักจากถังไหน</h2><span class="sp"></span>' + U.ref('BR-01') + '</div><div class="plan">';
        if (!alloc.plan.length) h += '<div class="row">ไม่มีถังที่ใช้ได้</div>';
        alloc.plan.forEach(function (p) {
          h += '<div class="row"><span>' + esc(p.label) + '<br><small style="color:#5A6B80">หมด ' + esc(U.date(p.expiry, 'long')) + '</small></span><b>' + U.num(p.days) + ' วัน</b></div>';
        });
        if (alloc.shortfall > 0) h += '<div class="row" style="color:#A11100"><span>เกินสิทธิ์ (ไม่ได้รับค่าจ้าง)</span><b>' + U.num(alloc.shortfall) + ' วัน</b></div>';
        h += '<div class="tot"><span>รวม</span><span>' + U.num(days) + ' วัน</span></div></div>' +
          '<div class="hint" style="margin-top:8px">ลำดับตายตัว: ลาชดเชยปีก่อน → พักร้อนสะสมปีก่อน → ลาชดเชยปีนี้ → พักร้อนปีนี้ · พนักงานเลือกถังเองไม่ได้</div></div>';
      }

      /* BR-12 · ยอดคงเหลือทุกประเภท */
      h += '<div class="card"><div class="chead"><h2>สิทธิ์คงเหลือของฉัน</h2><span class="sp"></span>' + U.ref('BR-12') + '</div>' + quotaTable(me) + '</div>';
      h += '</div></div>';

      host.innerHTML = h;

      $('#lType').addEventListener('change', function () { f.type = this.value; draw(); });
      $('#lFrom').addEventListener('change', function () { f.from = this.value; if (f.to < f.from || f.half) f.to = f.from; draw(); });
      $('#lTo').addEventListener('change', function () { f.to = this.value; draw(); });
      $$('[name=half]').forEach(function (r) { r.addEventListener('change', function () { f.half = this.value; if (f.half) f.to = f.from; draw(); }); });
      $('#lReason').addEventListener('input', function () { f.reason = this.value; });
      $('#lDoc').addEventListener('input', function () { f.doc = this.value; });
      if ($('#lAck')) $('#lAck').addEventListener('change', function () { f.ack = this.checked; draw(); });
      $('#lSend').addEventListener('click', function () {
        if (!f.reason.trim()) return U.toast('กรุณากรอกเหตุผล', 'err');
        if (chk.split.unpaid > 0 && !f.ack) return U.toast('ต้องติ๊กรับทราบเรื่องวันที่ไม่ได้รับค่าจ้างก่อน (BR-02)', 'err');
        var r = S.submitLeave({ empId: me.id, type: f.type, from: f.from, to: f.to, halfDay: f.half || null,
                                reason: f.reason, attachment: f.doc, ackOverQuota: f.ack });
        if (!r.ok) {
          U.modal({
            title: 'ตีกลับให้แก้ไข',
            body: '<div class="warn">ระบบตรวจอัตโนมัติแล้วไม่ผ่าน จึงยังไม่ส่งถึงผู้อนุมัติ — สถานะนี้ไม่ใช่ "ไม่อนุมัติ" ' + U.ref('APV-04') + '</div>' +
              r.check.issues.map(function (i) { return '<div class="issue">' + esc(i.msg) + ' ' + U.ref(i.code) + '</div>'; }).join(''),
            buttons: [{ label: 'กลับไปแก้ไข', cls: 'btn' }]
          });
          SS.app.refresh();
          return;
        }
        U.toast('ส่งใบลา ' + r.leave.id + ' เรียบร้อย · ยังไม่ตัดโควตา แต่กันยอดไว้แล้ว', 'ok');
        SS.app.go('myleaves');
      });
    }
    draw();
  };

  function quotaTable(me) {
    var h = '<div class="tw"><table class="t"><thead><tr><th>ประเภท</th><th class="n">โควตา</th><th class="n">ใช้ไป</th><th class="n">รออนุมัติ</th><th class="n">ยื่นได้อีก</th></tr></thead><tbody>';
    SS.LEAVE_TYPES.forEach(function (t) {
      var q = C.quota(me.id, t.id);
      if (q.total === null && q.used === 0 && q.reserved === 0 && t.id !== 'LT-SICK') return;
      h += '<tr><td>' + esc(t.name) + (q.locked ? ' <span class="pill pill-gray">ยังไม่มีสิทธิ์</span>' : '') + '</td>' +
        '<td class="n">' + (q.total === null ? 'ไม่จำกัด' : U.num(q.total)) + '</td>' +
        '<td class="n">' + U.num(q.used) + '</td><td class="n">' + U.num(q.reserved) + '</td>' +
        '<td class="n"><b>' + (q.remaining === null ? '—' : U.num(q.remaining)) + '</b></td></tr>';
    });
    h += '</tbody></table></div>';
    return h;
  }

  /* ======================================================================
     ใบลาของฉัน
     ====================================================================== */
  SS.views.myleaves = function (host) {
    var me = S.user();
    var rows = S.get().leaves.filter(function (l) { return l.empId === me.id; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    var h = '<div class="card"><div class="chead"><h2>ใบลาของฉัน</h2><span class="sp"></span>' +
      '<button class="btn btn-accent btn-sm" id="btnNew">ยื่นใบลาใหม่</button>' + U.ref(['BR-12', 'LV-04']) + '</div>' +
      '<div class="tw"><table class="t"><thead><tr><th>เลขที่</th><th>ประเภท</th><th>ช่วงวัน</th><th class="n">วัน</th><th>สถานะ</th><th>ผู้อนุมัติ / หมายเหตุ</th><th></th></tr></thead><tbody>';
    if (!rows.length) h += '<tr><td colspan="7">' + U.empty('ยังไม่มีใบลา') + '</td></tr>';
    rows.forEach(function (l) {
      var ap = l.approverId ? S.employee(l.approverId) : null;
      h += '<tr><td>' + esc(l.id) + '</td><td>' + esc(SS.name(SS.leaveType, l.type)) + '</td>' +
        '<td>' + esc(U.range(l.from, l.to)) + (l.halfDay ? '<br><small>' + (l.halfDay === 'AM' ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย') + '</small>' : '') + '</td>' +
        '<td class="n">' + U.num(C.leaveDays(l)) + '</td>' +
        '<td>' + U.leavePill(l.status) + '</td>' +
        '<td>' + (ap ? esc(ap.name) : '—') + (l.onBehalfOf ? ' <span class="pill pill-orange">อนุมัติแทน</span>' : '') +
          (l.approverNote ? '<br><small>' + esc(l.approverNote) + '</small>' : '') +
          (l.bounceIssues ? '<br><small style="color:#A11100">' + esc(l.bounceIssues.map(function (i) { return i.msg; }).join(' · ')) + '</small>' : '') + '</td>' +
        '<td style="text-align:right">' +
          (l.status === 'pending' ? '<button class="btn btn-ghost btn-sm" data-cancel="' + l.id + '">ยกเลิก</button>' :
           l.status === 'approved' && l.from > SS.d.today() ? '<button class="btn btn-ghost btn-sm" data-cancel="' + l.id + '">ขอยกเลิก</button>' : '') +
        '</td></tr>';
    });
    h += '</tbody></table></div>' +
      U.note('mock', 'สถานะ "ใช้แล้ว" เปลี่ยนอัตโนมัติเมื่อผ่านวันลา · "ตกไป" เกิดเมื่อค้างเกิน ' + S.get().params.lapseAfterDays + ' วันหลังวันลา (APV-08) — ใน mockup ยังไม่มีงานเบื้องหลังที่รันเอง') + '</div>';

    h += '<div class="card"><div class="chead"><h2>สิทธิ์คงเหลือ แยกตามถัง</h2><span class="sp"></span>' + U.ref(['CI-09', 'LV-12']) + '</div>' + bucketTable(me) + '</div>';
    host.innerHTML = h;
    $('#btnNew').addEventListener('click', function () { SS.app.go('leavenew'); });
    $$('[data-cancel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-cancel');
        var lv = S.get().leaves.filter(function (l) { return l.id === id; })[0];
        var body = '<p>ต้องการยกเลิกใบลา ' + esc(id) + ' หรือไม่</p>';
        if (lv.status === 'approved' && lv.bucketPlan) {
          var back = lv.bucketPlan.filter(function (p) { return p.expiry >= SS.d.today(); });
          var lost = lv.bucketPlan.filter(function (p) { return p.expiry < SS.d.today(); });
          body += '<div class="plan"><div class="h">ผลต่อยอดคงเหลือ</div>' +
            back.map(function (p) { return '<div class="row"><span>คืนเข้า ' + esc(p.label) + '</span><b>+' + U.num(p.days) + '</b></div>'; }).join('') +
            lost.map(function (p) { return '<div class="row" style="color:#A11100"><span>เสีย ' + esc(p.label) + ' (หมดอายุแล้ว)</span><b>' + U.num(p.days) + '</b></div>'; }).join('') +
            '</div>';
        }
        U.confirm('ยกเลิกใบลา', body, function () {
          S.cancelLeave(id, 'พนักงานยกเลิกเอง');
          U.toast('ยกเลิกใบลาแล้ว · คืนยอดเข้าถังเดิม', 'ok');
          SS.app.refresh();
        }, 'ยืนยันยกเลิก', 'btn-danger');
      });
    });
  };

  function bucketTable(me) {
    var bs = C.buckets(me.id), today = SS.d.today();
    var b = S.get().balances[me.id] || {};
    var h = '<div class="tw"><table class="t"><thead><tr><th>ถัง</th><th class="n">คงเหลือ</th><th>หมดอายุ</th><th>สถานะ</th></tr></thead><tbody>';
    bs.forEach(function (x) {
      var near = !x.expired && SS.d.diff(today, x.expiry) <= 90;
      h += '<tr' + (x.expired ? ' style="opacity:.5"' : '') + '><td>' + esc(x.label) + '</td>' +
        '<td class="n">' + U.num(x.days) + '</td><td>' + esc(U.date(x.expiry, 'long')) + '</td>' +
        '<td>' + (x.expired ? U.pill('pill-gray', 'หมดอายุแล้ว') : near ? U.pill('pill-orange', 'ใกล้หมดอายุ') : U.pill('pill-green', 'ใช้ได้')) + '</td></tr>';
    });
    if (b.otCarry) h += '<tr><td>ชั่วโมงนอกเวลาที่ยังไม่ครบ 1 วัน</td><td class="n">' + U.num(b.otCarry) + ' ชม.</td><td>—</td><td>' + U.pill('pill-blue', 'ยกไปรวมครั้งถัดไป') + '</td></tr>';
    h += '</tbody></table></div>' +
      U.note('open', 'ทุกถังหมด 31 ธ.ค. ของปีถัดจากปีที่ได้มา (ข้อสรุป 1 ก.ย. 2569) · เตือนตั้งแต่ 1 ต.ค. แล้วซ้ำที่ 60 และ 30 วัน — การแจ้งเตือนจริงทดสอบใน mockup ไม่ได้');
    return h;
  }

  /* ---------- นาฬิกา ---------- */
  var clockTimer = null;
  function startClock() {
    if (clockTimer) clearInterval(clockTimer);
    function tick() {
      var n = new Date();
      var hh = SS.d.pad(n.getHours()), mm = SS.d.pad(n.getMinutes()), ss = SS.d.pad(n.getSeconds());
      var big = document.getElementById('bigClock');
      if (big) big.innerHTML = hh + ':' + mm + '<small>:' + ss + '</small>';
      var top = document.getElementById('topClock');
      if (top) top.textContent = hh + ':' + mm + ':' + ss;
    }
    tick(); clockTimer = setInterval(tick, 1000);
  }
  SS.views._startClock = startClock;
  SS.views._quickBar = quickBar;
  SS.views._quotaTable = quotaTable;
  SS.views._bucketTable = bucketTable;
})();
