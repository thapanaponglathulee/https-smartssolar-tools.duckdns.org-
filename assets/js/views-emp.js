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
          ' · ' + esc(SS.name(SS.travelType, ci.travelType)) + (ci.overtime ? ' + อยู่หน้างานนอกเวลา' : '') +
        '</div>' +
        (ci.siteStop
          ? '<div style="margin-top:9px;background:rgba(255,255,255,.16);border-radius:7px;padding:8px 11px;font-size:13.5px">' +
            '<b>หยุดงานที่ไซต์</b> · ' + esc(SS.name(SS.stopReason, ci.siteStop.reason)) +
            (ci.siteStop.note ? ' (' + esc(ci.siteStop.note) + ')' : '') +
            ' · ' + (ci.siteStop.allDay ? 'ทั้งวัน' : 'ตั้งแต่ ' + esc(ci.siteStop.from)) +
            '</div>'
          : '');
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
          /* CI-10 · ชื่อปุ่มตามสเปกฉบับ 8 ก.ย. — แยกจากตัวเลือก "อยู่หน้างานนอกเวลา" ให้ชัด */
          '<button class="btn btn-ghost" id="btnOT">บันทึกชั่วโมง OT</button>' +
          /* CI-26 · กดได้เฉพาะเมื่อไปถึงไซต์แล้ว */
          (ci.projectId || ci.otherPlace
            ? '<button class="btn btn-ghost" id="btnStop">' + (ci.siteStop ? 'แก้ไขการหยุดงานที่ไซต์' : 'หยุดงานที่ไซต์') + '</button>'
            : '') +
          /* CI-25 · ตั้งพารามิเตอร์เป็น 0 แล้วปุ่มหายไปทั้งปุ่ม */
          (ci.projectId && (+S.get().params.maxVisitsPerDay || 0)
            ? '<button class="btn btn-ghost" id="btnVisit">แวะไซต์เพิ่ม</button>' : '') +
          (ci.projectId ? '<button class="btn btn-accent" id="btnAllow">เบิกเบี้ยเลี้ยงของวันนี้</button>' : '') +
        '</div>' +
        visitList(ci) +
        '<div class="hint" style="margin-top:9px">ปุ่ม "บันทึกชั่วโมง OT" คือที่เดียวที่เก็บชั่วโมงและแปลงเป็นวันชดเชย ' +
        'ต้องยื่นแยกจึงจะได้วัน · ตัวเลือก "อยู่หน้างานนอกเวลา" ในฟอร์มเช็คอินตอบเรื่องค่าอาหารอย่างเดียว ' + U.ref(['CI-10', 'CI-19']) + '</div>' +
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
      if ($('#btnStop')) $('#btnStop').addEventListener('click', function () { siteStopModal(ci); });
      if ($('#btnVisit')) $('#btnVisit').addEventListener('click', function () { visitModal(ci); });
      $$('[data-vsdel]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-vsdel');
          U.confirm('ลบรายการแวะไซต์', '<p>ลบแล้วยังเหลือร่องรอยใน audit log เสมอ</p>', function () {
            S.removeVisit(ci.id, id, 'ลบโดยเจ้าของรายการ'); U.toast('ลบรายการแวะไซต์แล้ว', 'ok'); SS.app.refresh();
          }, 'ลบ', 'btn-danger');
        });
      });
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
      travelType: null, travelChanged: false,
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
        /* CI-18 · เลือกได้เฉพาะชุดที่ประเภทงานนั้นอนุญาต — งานหน้าไซต์ไม่มี "ประจำออฟฟิศ" ให้เลือก (FB-2) */
        h += '<div class="field"><label>ลักษณะการไปงาน</label>' +
          '<select id="fTravel">' + U.options(C.travelsFor(state.jobType), state.travelType) + '</select>' +
          '<div class="hint">ระบบเติมค่าให้จากประเภทงานแล้ว (' + esc(SS.name(SS.travelType, defTravel)) + ') ส่วนใหญ่ไม่ต้องแตะช่องนี้ ' +
          'เปลี่ยนได้ทันทีโดยไม่ต้องกรอกอะไรเพิ่ม</div></div>';
        h += '<label class="choice' + (state.overtime ? ' on' : '') + '" style="margin-bottom:6px">' +
          '<input type="checkbox" id="fOT"' + (state.overtime ? ' checked' : '') + '> อยู่หน้างานนอกเวลา</label>' +
          '<div class="hint" style="margin-bottom:13px">ช่องนี้ตอบเรื่องค่าอาหารเท่านั้น ไม่ได้เก็บชั่วโมงและไม่ทำให้ได้วันชดเชย — ' +
          'ถ้าต้องการวันชดเชย ให้กดปุ่ม "บันทึกชั่วโมง OT" หลังเช็คอินเสร็จ ' + U.ref(['CI-19', 'CI-10']) + '</div>';
      } else {
        h += U.note('mock', 'ประเภทงาน "ประจำออฟฟิศ" ล็อกลักษณะการไปงานไว้ตายตัว จึงไม่แสดงช่องนี้และไม่ต้องเลือกไซต์ — เช็คอินเหลือกดปุ่มเดียว');
      }

      /* CI-05 · ช่องบังคับกรอก · ทำหน้าที่แทนช่องเหตุผลที่ถูกตัดออกจาก CI-18 (FB-1) */
      h += '<div class="field"><label>รายละเอียดงานที่ทำ <span class="req">*</span></label>' +
        '<textarea id="fDetail" placeholder="สรุปสั้น ๆ ว่าวันนี้ทำอะไร">' + esc(state.detail) + '</textarea>' +
        '<div class="hint">บันทึกไม่ได้ถ้าเว้นว่าง — ช่องนี้คือสิ่งที่ผู้อนุมัติใช้ดูว่าวันนั้นทำอะไร ' + U.ref('CI-05') + '</div></div>' +
        '<button class="btn btn-accent btn-lg btn-block" id="btnCi">เช็คอิน</button>';

      el.innerHTML = h;

      $('#fJob').addEventListener('change', function () {
        state.jobType = this.value;
        /* CI-16 · เปลี่ยนประเภทงาน → ลิสต์ไซต์รีเฟรช ล้างค่าที่เลือกถ้าไม่อยู่ในลิสต์ใหม่ */
        var ok = C.sitesFor(state.jobType).some(function (p) { return p.id === state.projectId; });
        if (!ok) { state.projectId = null; state.otherPlace = ''; }
        state.travelType = null;
        draw();
      });
      if ($('#fSite')) $('#fSite').addEventListener('change', function () { state.projectId = this.value || null; draw(); });
      if ($('#fOther')) $('#fOther').addEventListener('input', function () { state.otherPlace = this.value; });
      if ($('#fTravel')) $('#fTravel').addEventListener('change', function () { state.travelType = this.value; draw(); });
      if ($('#fOT')) $('#fOT').addEventListener('change', function () { state.overtime = this.checked; draw(); });
      $('#fDetail').addEventListener('input', function () { state.detail = this.value; });
      $('#btnCi').addEventListener('click', submit);
    }

    /* CI-28 · ขอพิกัดตอนกดเช็คอิน
       ปฏิเสธ จับไม่ได้ หรือช้าเกิน 5 วินาที → เช็คอินผ่านตามปกติ บันทึกว่า "ไม่มีพิกัด"
       ห้ามบล็อก ห้ามเตือนพนักงาน ห้ามแสดงตัวเลขระยะให้พนักงานเห็น */
    function grabGeo(done) {
      if (!navigator.geolocation) return done({ ok: false, why: 'เครื่องไม่รองรับ' });
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return; settled = true; done({ ok: false, why: 'เกิน 5 วินาที' });
      }, 5000);
      navigator.geolocation.getCurrentPosition(function (pos) {
        if (settled) return; settled = true; clearTimeout(timer);
        done({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) });
      }, function () {
        if (settled) return; settled = true; clearTimeout(timer);
        done({ ok: false, why: 'ผู้ใช้ไม่อนุญาต' });
      }, { timeout: 5000, maximumAge: 60000 });
    }

    function submit() {
      var jt = SS.jobType(state.jobType);
      if (jt.requireSite && !state.projectId) return U.toast('กรุณาเลือกไซต์งาน', 'err');
      if (state.projectId === '__other' && !state.otherPlace.trim()) return U.toast('กรุณาพิมพ์ชื่อสถานที่', 'err');
      if (!state.detail.trim()) return U.toast('กรุณากรอกรายละเอียดงานที่ทำ', 'err');

      /* CI-28 · ประกาศเรื่องการเก็บพิกัด ขึ้นครั้งเดียวตอนใช้ครั้งแรก ไม่ใช่ถามทุกวัน */
      if (!S.geoNoticeSeen()) {
        U.modal({
          title: 'ก่อนเช็คอินครั้งแรก',
          body: '<p style="font-size:14px;line-height:1.7">' + esc(S.get().params.geoNotice) + '</p>' +
            U.note('mock', 'ข้อความนี้แก้ได้ที่หน้าตั้งค่า และขึ้นครั้งเดียวเท่านั้น — ถ้าไม่อนุญาต ยังเช็คอินได้ตามปกติ ระบบบันทึกว่า "ไม่มีพิกัด"'),
          buttons: [{ label: 'รับทราบและเช็คอิน', cls: 'btn-accent', onClick: function () {
            S.markGeoNotice(); doCheckIn();
            /* doCheckIn อาจเปิดกล่อง C6 ต่อทันที — ห้ามให้ ui.modal ปิดกล่องใหม่ทิ้ง */
            return false;
          } }]
        });
        return;
      }
      doCheckIn();
    }

    function doCheckIn() {
      /* C6 · ใบบังคับหมดอายุแล้วยังจะลงไซต์ — เด้งได้เฉพาะตอนเช็คอินเข้าไซต์ในเฟสนี้ */
      var jt = SS.jobType(state.jobType);
      var gate = (jt && jt.requireSite && SS.certGate) ? SS.certGate : null;
      if (gate) { gate(me.id, run); return; }
      run();
      function run() {
        grabGeo(function (g) { finish(g.ok ? { lat: g.lat, lng: g.lng, acc: g.acc } : { lat: null, why: g.why }); });
      }
    }

    function finish(geo) {
      var r = S.checkIn({
        geo: geo,
        empId: me.id, jobType: state.jobType,
        projectId: state.projectId === '__other' ? null : state.projectId,
        otherPlace: state.projectId === '__other' ? state.otherPlace.trim() : '',
        travelType: state.travelType, travelChanged: state.travelChanged,
        overtime: state.overtime, detail: state.detail.trim()
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

  /* ==================================================================
     CI-25 · ไปหลายไซต์ในวันเดียว — ไซต์หลักหนึ่ง แวะเพิ่มได้
     วันยังเป็นหน่วยเดียว · การแวะไม่สร้างวันใหม่ ไม่เพิ่มมื้อ ไม่เพิ่มวันชดเชย
     ================================================================== */
  function visitList(ci) {
    var vs = ci.visits || [];
    if (!vs.length) return '';
    var fl = C.visitFlag(ci);
    return '<div class="sect">ไซต์ที่แวะเพิ่มวันนี้ ' + vs.length + ' แห่ง</div>' +
      '<div class="tw"><table class="t"><thead><tr><th>เวลา</th><th>ไซต์</th><th>ประเภทงาน</th><th>งานที่ทำ</th><th></th></tr></thead><tbody>' +
      vs.map(function (v) {
        return '<tr><td>' + esc(v.time) + '</td><td>' + esc(SS.name(SS.project, v.projectId)) + '</td>' +
          '<td>' + esc(SS.name(SS.jobType, v.jobType)) + '</td><td>' + esc(v.detail) + '</td>' +
          '<td style="text-align:right"><button class="btn btn-ghost btn-sm" data-vsdel="' + v.id + '">ลบ</button></td></tr>'; }).join('') +
      '</tbody></table></div>' +
      (fl ? U.note('open', 'ขึ้นธงให้หัวหน้าเห็น — ' + esc(fl.why)) : '') +
      U.note('mock', 'การแวะไม่เพิ่มจำนวนมื้อและไม่เพิ่มวันชดเชย — หนึ่งคนหนึ่งวันมีรายการเบี้ยเลี้ยงรายการเดียวเสมอ · ' +
        'การนับคน-วัน: <b>1.0 คน-วันยกให้ไซต์หลัก</b> ส่วนไซต์ที่แวะนับเป็น "จำนวนครั้งที่เข้าไซต์" ห้ามนับ 1 คน-วันให้ทุกไซต์');
  }

  function visitModal(ci) {
    var cap = +S.get().params.maxVisitsPerDay || 0;
    var used = (ci.visits || []).length;
    var jobs = S.get().jobTypes.filter(function (j) { return j.enabled && j.requireSite; });
    var st = { jobType: ci.jobType, projectId: '', time: SS.d.now(), detail: '' };

    function sites() {
      return C.sitesFor(st.jobType).filter(function (p) {
        return p.id !== ci.projectId && !(ci.visits || []).some(function (v) { return v.projectId === p.id; });
      });
    }
    function body() {
      var list = sites();
      return '<p style="font-size:14px;margin:0 0 14px">ไซต์หลักของวันนี้คือ <b>' + esc(SS.name(SS.project, ci.projectId)) +
        '</b> ซึ่งเป็นตัวกำหนดจำนวนมื้อของทั้งวัน · แวะได้อีก <b>' + (cap - used) + '</b> จาก ' + cap + ' แห่ง</p>' +
        '<div class="frow"><div class="field"><label>ประเภทงานที่ไซต์นี้</label>' +
        '<select id="vJob">' + U.options(jobs, st.jobType) + '</select></div>' +
        '<div class="field"><label>เวลาที่ไปถึง</label><input type="time" id="vTime" value="' + esc(st.time) + '"></div></div>' +
        '<div class="field"><label>ไซต์ที่แวะ <span class="req">*</span></label>' +
        (list.length
          ? '<select id="vSite"><option value="">— เลือกไซต์ —</option>' +
            list.map(function (p) { return '<option value="' + p.id + '"' + (p.id === st.projectId ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select>'
          : '<div class="issue">ไม่มีไซต์อื่นให้เลือกสำหรับประเภทงานนี้แล้ว</div>') + '</div>' +
        '<div class="field"><label>งานที่ทำที่ไซต์นี้ <span class="req">*</span></label>' +
        '<textarea id="vDetail" placeholder="เช่น เปลี่ยนฟิวส์ String 3">' + esc(st.detail) + '</textarea>' +
        '<div class="hint">ใช้กติกาเดียวกับ CI-05 — บังคับกรอก</div></div>';
    }
    function open() {
      U.modal({
        title: 'แวะไซต์เพิ่ม · ' + U.date(ci.date, 'long'),
        body: body(),
        buttons: [
          { label: 'ปิด', cls: 'btn-ghost' },
          { label: 'บันทึกการแวะ', cls: 'btn-accent', onClick: function () {
              var r = S.addVisit(ci.id, {
                projectId: $('#vSite') ? $('#vSite').value : '',
                jobType: $('#vJob').value, time: $('#vTime').value,
                detail: $('#vDetail').value
              });
              if (!r.ok) { U.toast(r.msg, 'err'); return false; }
              U.toast('บันทึกการแวะไซต์แล้ว · ไม่เพิ่มมื้อและไม่เพิ่มวันชดเชย', 'ok');
              SS.app.refresh();
            } }
        ],
        onOpen: function () {
          $('#vJob').addEventListener('change', function () {
            st.jobType = this.value; st.projectId = '';
            st.time = $('#vTime').value; st.detail = $('#vDetail').value;
            U.closeModal(); open();
          });
        }
      });
    }
    open();
  }

  /* ---------- CI-26 · หยุดงานที่ไซต์ ----------
     ไปถึงไซต์แล้วทำงานไม่ได้ — ฝนตก ลูกค้าสั่งหยุด รอวัสดุ เข้าพื้นที่ไม่ได้
     ยังได้มื้อ ไม่นับขาดงาน ไม่หักวันลา · เหตุผลเลือกจากทะเบียน S21 ห้ามพิมพ์อิสระ
     ----------------------------------------------------------------- */
  function siteStopModal(ci) {
    var reasons = S.get().stopReasons.filter(function (r) { return r.enabled; });
    var cur = ci.siteStop || {};
    var sel = cur.reason || reasons[0].id;
    var allDay = cur.allDay === undefined ? true : cur.allDay;

    function body() {
      var r = SS.stopReason(sel) || {};
      return '<p style="font-size:14px;margin:0 0 14px">ไปถึงไซต์แล้วแต่ทำงานไม่ได้ บันทึกไว้ที่นี่ — ' +
        '<b>ยังได้ค่าอาหารตามปกติ ไม่นับขาดงาน และไม่หักวันลา</b> เพราะเดินทางไปถึงจริง</p>' +
        '<div class="field"><label>เหตุผล <span class="req">*</span></label>' +
        '<select id="sReason">' + U.options(reasons, sel, 'id', 'name') + '</select>' +
        '<div class="hint">เลือกจากรายการเท่านั้น เพื่อให้สรุปได้ว่าไซต์ไหนเสียเวลาไปกับอะไร ' + U.ref('S21') + '</div></div>' +
        (r.free
          ? '<div class="field"><label>ระบุเหตุ <span class="req">*</span></label>' +
            '<input type="text" id="sNote" value="' + esc(cur.note || '') + '" placeholder="เช่น รถขนของเสียกลางทาง"></div>'
          : '') +
        '<div class="field"><label>ช่วงเวลา</label><div class="choices">' +
          '<label class="choice' + (allDay ? ' on' : '') + '"><input type="radio" name="sAll" value="1"' + (allDay ? ' checked' : '') + '> หยุดทั้งวัน</label>' +
          '<label class="choice' + (allDay ? '' : ' on') + '"><input type="radio" name="sAll" value="0"' + (allDay ? '' : ' checked') + '> หยุดตั้งแต่เวลา</label>' +
        '</div></div>' +
        '<div class="field"' + (allDay ? ' hidden' : '') + ' id="sFromWrap"><label>ตั้งแต่เวลา</label>' +
        '<input type="time" id="sFrom" value="' + esc(cur.from || '13:00') + '">' +
        '<div class="hint">สำหรับกรณีอย่างฝนตกตอนบ่าย</div></div>' +
        U.note('mock', 'การประกาศปิดไซต์ทีเดียวทั้งไซต์ต้องมีระบบมอบหมายกำลังคน (SITE-01) ซึ่งมีมติ 8 ก.ย. 2569 ว่าไม่อยู่ในเฟสนี้ — รอบนี้จึงเป็นรายคน หัวหน้ากดแทนลูกทีมที่เช็คอินไซต์นั้นแล้วได้');
    }

    function bind() {
      $('#sReason').addEventListener('change', function () { sel = this.value; U.closeModal(); open(); });
      $$('[name=sAll]').forEach(function (r) {
        r.addEventListener('change', function () { allDay = this.value === '1'; U.closeModal(); open(); });
      });
    }

    function open() {
      U.modal({
        title: (ci.siteStop ? 'แก้ไขการหยุดงานที่ไซต์ · ' : 'หยุดงานที่ไซต์ · ') + U.date(ci.date, 'long'),
        body: body(),
        buttons: [{ label: 'ปิด', cls: 'btn-ghost' }]
          .concat(ci.siteStop ? [{ label: 'ยกเลิกการหยุดงาน', cls: 'btn-danger', onClick: function () {
            S.clearSiteStop(ci.id); U.toast('ยกเลิกการหยุดงานที่ไซต์แล้ว', 'ok'); SS.app.refresh();
          } }] : [])
          .concat([{ label: 'บันทึก', cls: 'btn-accent', onClick: function () {
            var r = S.setSiteStop(ci.id, {
              reason: sel,
              note: $('#sNote') ? $('#sNote').value.trim() : '',
              allDay: allDay,
              from: $('#sFrom') ? $('#sFrom').value : null
            });
            if (!r.ok) { U.toast(r.msg, 'err'); return false; }
            U.toast('บันทึกหยุดงานที่ไซต์แล้ว · ยังได้ค่าอาหารตามปกติ ไม่นับขาดงาน', 'ok');
            SS.app.refresh();
          } }]),
        onOpen: bind
      });
    }
    open();
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
  /* ==================================================================
     CI-24 · สรุปของตัวเองสำหรับพนักงาน
     ศูนย์รายงาน 15 รายงานที่มีอยู่เป็นของฝั่งแอดมินทั้งหมด พนักงานไม่เห็นตัวเลขของตัวเองเลย
     *** ห้ามแสดงจำนวนเงินค่าอาหารหรือเบี้ยเลี้ยง (CI-03) — แสดงได้แค่จำนวนวันและจำนวนมื้อ ***
     ================================================================== */
  var sumMonth = null;

  SS.views.mysummary = function (host) {
    var me = S.user(), T = SS.d.today();
    if (!sumMonth) sumMonth = SS.d.month(T);
    var from = sumMonth + '-01';
    var y = +sumMonth.slice(0, 4), mm = +sumMonth.slice(5, 7);
    var to = SS.d.iso(new Date(y, mm, 0));
    if (to > T) to = T;

    var n = { work: 0, sitestop: 0, leave: 0, absent: 0, holiday: 0, pending: 0, review: 0, exempt: 0 };
    var lateDays = 0, lateMin = 0, meals = 0, byLeave = {};
    if (from <= to) SS.d.eachDay(from, to, function (d) {
      var st = C.dayStatus(me.id, d);
      n[st.status] = (n[st.status] || 0) + 1;
      if (st.checkin) {
        var lm = C.lateMinutes(st.checkin);
        if (lm) { lateDays++; lateMin += lm; }
        var a = C.allowanceOf(st.checkin);
        if (a && !a.skip) meals += a.meals;
      }
      if (st.status === 'leave' && st.leave) {
        byLeave[st.leave.type] = (byLeave[st.leave.type] || 0) + (st.leave.halfDay ? 0.5 : 1);
      }
    });

    var buckets = C.buckets(me.id).filter(function (b) { return !b.expired && b.days > 0; });

    var h = '<div class="monthbar">' +
      '<button class="btn btn-ghost btn-sm" id="sPrev">← เดือนก่อน</button>' +
      '<b>' + esc(U.monthName(sumMonth)) + '</b>' +
      '<button class="btn btn-ghost btn-sm" id="sNext"' + (sumMonth >= SS.d.month(T) ? ' disabled' : '') + '>เดือนถัดไป →</button>' +
      '</div>';

    h += '<div class="grid g4" style="margin-bottom:16px">' +
      '<div class="stat g"><div class="l">วันทำงาน</div><div class="v">' + n.work + '<small>วัน</small></div>' +
        '<div class="n">' + (n.sitestop ? 'หยุดงานที่ไซต์อีก ' + n.sitestop + ' วัน' : 'นับเฉพาะวันที่มีเช็คอิน') + '</div></div>' +
      '<div class="stat y"><div class="l">มาสาย</div><div class="v">' + lateDays + '<small>วัน</small></div>' +
        '<div class="n">รวม ' + lateMin + ' นาที · เกณฑ์ ' + esc(S.get().params.workStart) +
        ' ผ่อนผัน ' + (+S.get().params.graceMinutes || 0) + ' นาที</div></div>' +
      '<div class="stat r"><div class="l">ขาดงาน</div><div class="v">' + n.absent + '<small>วัน</small></div>' +
        '<div class="n">' + (n.absent ? 'ทักท้วงได้ที่ประวัติเช็คอิน' : 'ไม่มีวันขาดงาน') + '</div></div>' +
      '<div class="stat"><div class="l">จำนวนมื้อที่ได้</div><div class="v">' + meals + '<small>มื้อ</small></div>' +
        '<div class="n">แสดงเป็นจำนวนมื้อเท่านั้น ไม่มีตัวเลขเงิน</div></div>' +
      '</div>';

    /* วันลาที่ใช้ในเดือนนี้ */
    h += '<div class="card"><div class="chead"><h2>วันลาที่ใช้ในเดือนนี้</h2><span class="sp"></span>' + U.ref('CI-24') + '</div>';
    var ks = Object.keys(byLeave);
    if (!ks.length) h += U.empty('ไม่มีวันลาในเดือนนี้');
    else h += '<div class="tw"><table class="t"><tbody>' + ks.map(function (k) {
      return '<tr><td>' + esc(SS.name(SS.leaveType, k)) + '</td><td class="n">' + U.num(byLeave[k]) + ' วัน</td></tr>'; }).join('') +
      '</tbody></table></div>';
    if (n.pending || n.review) h += U.note('open', 'ยังมีวันที่รออนุมัติลา ' + n.pending + ' วัน และรอตรวจสอบ ' + n.review + ' วัน — ยอดจะเปลี่ยนเมื่อหัวหน้าตัดสิน');
    h += '</div>';

    /* ยอดคงเหลือแต่ละถัง + วันหมดอายุ */
    h += '<div class="card"><div class="chead"><h2>ยอดวันลาคงเหลือ แยกตามถัง</h2>' +
      '<span class="sub">ถังที่หมดก่อนถูกตัดก่อน</span><span class="sp"></span>' + U.ref(['BR-01', 'CI-09', 'LV-12']) + '</div>';
    if (!buckets.length) h += U.empty('ไม่มียอดคงเหลือ');
    else h += '<div class="tw"><table class="t"><thead><tr><th>ถัง</th><th class="n">คงเหลือ</th><th>หมดอายุ</th><th></th></tr></thead><tbody>' +
      buckets.map(function (b) {
        var days = SS.d.diff(SS.d.today(), b.expiry);
        return '<tr><td>' + esc(b.label) + '</td><td class="n">' + U.num(b.days) + ' วัน</td>' +
          '<td>' + esc(U.date(b.expiry, 'long')) + '</td>' +
          '<td>' + (days <= 90 ? U.pill('pill-yellow', 'เหลืออีก ' + days + ' วัน') : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    h += U.note('mock', 'หน้านี้เห็นได้เฉพาะของตัวเอง · ไม่มีตัวเลขเงินค่าอาหารหรือเบี้ยเลี้ยงตาม CI-03 — ถ้าเห็นตัวเลขเงินที่ไหนในหน้านี้ ถือว่าผิดข้อกำหนด') + '</div>';

    host.innerHTML = h;
    $('#sPrev').addEventListener('click', function () {
      var yy = +sumMonth.slice(0, 4), m2 = +sumMonth.slice(5, 7) - 1;
      if (m2 === 0) { yy--; m2 = 12; }
      sumMonth = yy + '-' + SS.d.pad(m2); SS.app.refresh();
    });
    $('#sNext').addEventListener('click', function () {
      var yy = +sumMonth.slice(0, 4), m2 = +sumMonth.slice(5, 7) + 1;
      if (m2 === 13) { yy++; m2 = 1; }
      sumMonth = yy + '-' + SS.d.pad(m2); SS.app.refresh();
    });
  };

  /* ==================================================================
     CI-22 · CI-23 · ประวัติเช็คอินของฉัน
     เป็นรายวัน ไม่ใช่รายเช็คอิน เพราะ CI-23 สั่งให้กรองตามสถานะรายวันได้
     วันที่ลาหรือขาดงานจึงต้องมีแถวของตัวเอง ไม่ใช่หายไปเพราะไม่มีเช็คอิน
     ค่าตั้งต้นแสดงเดือนปัจจุบัน · จำนวนวันต่อหน้าเป็นพารามิเตอร์
     ================================================================== */
  var hist = { mode: 'month', month: null, from: '', to: '', status: 'all', page: 0 };

  function histDays(me) {
    var T = SS.d.today(), out = [];
    var from, to;
    if (hist.mode === 'range') {
      from = hist.from; to = hist.to;
      if (!from || !to || from > to) return null;
    } else {
      var m = hist.month || SS.d.month(T);
      from = m + '-01';
      var y = +m.slice(0, 4), mm = +m.slice(5, 7);
      to = SS.d.iso(new Date(y, mm, 0));
    }
    if (to > T) to = T;                                   /* วันในอนาคตยังไม่มีอะไรให้ดู */
    if (from > to) return [];
    SS.d.eachDay(from, to, function (d) {
      var st = C.dayStatus(me.id, d);
      var late = st.checkin ? C.lateMinutes(st.checkin) : 0;
      if (hist.status === 'late') { if (!late) return; }
      else if (hist.status !== 'all' && st.status !== hist.status) return;
      out.push({ date: d, st: st, late: late });
    });
    return out.reverse();                                 /* ใหม่สุดอยู่บน */
  }

  SS.views.mycheckins = function (host) {
    var me = S.user(), P = S.get().params, T = SS.d.today();
    var size = +P.historyPageSize || 31;
    if (!hist.month) hist.month = SS.d.month(T);
    var all = histDays(me);

    var STATUSES = [{ id: 'all', name: 'ทุกสถานะ' }, { id: 'late', name: 'เฉพาะวันที่มาสาย' }]
      .concat(SS.DAY_STATUS.filter(function (d) { return d.id !== 'exempt'; })
                           .map(function (d) { return { id: d.id, name: d.name }; }));

    /* แถบเลือกช่วง (CI-22 · CI-23) */
    var h = '<div class="card"><div class="chead"><h2>ประวัติการเช็คอินของฉัน</h2><span class="sp"></span>' +
      U.ref(['CI-06', 'CI-21', 'CI-22', 'CI-23']) + '</div>' +
      '<div class="choices" style="margin-bottom:12px">' +
        '<label class="choice' + (hist.mode === 'month' ? ' on' : '') + '"><input type="radio" name="hMode" value="month"' +
          (hist.mode === 'month' ? ' checked' : '') + '> รายเดือน</label>' +
        '<label class="choice' + (hist.mode === 'range' ? ' on' : '') + '"><input type="radio" name="hMode" value="range"' +
          (hist.mode === 'range' ? ' checked' : '') + '> เลือกช่วงวันที่เอง</label>' +
      '</div>';

    if (hist.mode === 'month') {
      h += '<div class="monthbar">' +
        '<button class="btn btn-ghost btn-sm" id="hPrev">← เดือนก่อน</button>' +
        '<b>' + esc(U.monthName(hist.month)) + '</b>' +
        '<button class="btn btn-ghost btn-sm" id="hNext"' + (hist.month >= SS.d.month(T) ? ' disabled' : '') + '>เดือนถัดไป →</button>' +
        '</div>';
    } else {
      h += '<div class="frow3">' +
        '<div class="field"><label>ตั้งแต่วันที่</label><input type="date" id="hFrom" value="' + esc(hist.from) + '"></div>' +
        '<div class="field"><label>ถึงวันที่</label><input type="date" id="hTo" value="' + esc(hist.to) + '"></div>' +
        '<div class="field"><label>สถานะรายวัน</label><select id="hStatus">' + U.options(STATUSES, hist.status, 'id', 'name') + '</select></div>' +
        '</div>';
    }
    if (hist.mode === 'month') {
      h += '<div class="field" style="max-width:320px"><label>สถานะรายวัน</label>' +
        '<select id="hStatus">' + U.options(STATUSES, hist.status, 'id', 'name') + '</select></div>';
    }

    if (all === null) {
      h += U.empty('เลือกวันที่ให้ครบทั้งสองช่อง', 'และวันเริ่มต้องไม่หลังวันสิ้นสุด');
      host.innerHTML = h + '</div>';
      bindHist(host, me);
      return;
    }

    var total = all.length;
    var maxPage = Math.max(0, Math.ceil(total / size) - 1);
    if (hist.page > maxPage) hist.page = maxPage;
    var rows = all.slice(hist.page * size, hist.page * size + size);
    var lateDays = all.filter(function (r) { return r.late; });
    var lateMin = lateDays.reduce(function (a, r) { return a + r.late; }, 0);

    h += '<div class="hsum">พบ <b>' + total + '</b> วัน' +
      (hist.status === 'all' ? '' : ' ที่ตรงกับตัวกรอง') +
      ' · มาสาย <b>' + lateDays.length + '</b> วัน รวม <b>' + lateMin + '</b> นาที' +
      (total > size ? ' · แสดง ' + (hist.page * size + 1) + '–' + (hist.page * size + rows.length) : '') + '</div>';

    h += U.note('mock', 'ไม่มีปุ่มลบ — ใช้การทำเครื่องหมาย "ยกเลิก" แทน และเก็บประวัติการแก้ไขทุกครั้ง') +
      '<div class="tw"><table class="t"><thead><tr><th>วันที่</th><th>สถานะ</th><th>เวลา</th><th>ประเภทงาน</th><th>ไซต์งาน</th><th>ลักษณะการไป</th><th></th></tr></thead><tbody>';

    if (!rows.length) h += '<tr><td colspan="7">' + U.empty('ไม่มีวันที่ตรงกับที่เลือก', 'ลองเปลี่ยนช่วงวันหรือสถานะ') + '</td></tr>';
    rows.forEach(function (r) {
      var c = r.st.checkin, cancelled = c && c.status === 'cancelled';
      var site = !c ? '—'
        : c.projectId ? SS.name(SS.project, c.projectId)
        : c.otherPlace ? c.otherPlace
        /* CI-21 · รายการเก่าที่ระบุโครงการไม่ได้ ต้องขึ้นว่าไม่ระบุโครงการ ไม่ใช่ช่องว่าง */
        : SS.jobType(c.jobType) && SS.jobType(c.jobType).requireSite ? 'ไม่ระบุโครงการ' : '—';
      h += '<tr' + (cancelled ? ' style="opacity:.5"' : '') + '>' +
        '<td>' + esc(U.date(r.date, 'dow')) + '</td>' +
        '<td>' + U.dayPill(r.st) + (r.st.leave ? ' <small>' + esc(SS.name(SS.leaveType, r.st.leave.type)) + '</small>' : '') + '</td>' +
        '<td>' + (c ? esc(c.time) + (r.late ? ' <span class="pill pill-yellow">สาย ' + r.late + '</span>' : '') : '—') + '</td>' +
        '<td>' + (c ? esc(SS.name(SS.jobType, c.jobType)) : '—') + '</td>' +
        '<td>' + esc(site) + '</td>' +
        '<td>' + (c ? esc(SS.name(SS.travelType, c.travelType)) +
            (C.mealFlag(c) ? ' <span class="pill pill-orange" title="' + esc(C.mealFlag(c).why) + '">มื้อเปลี่ยน</span>' : '') +
            (c.siteStop ? ' <span class="pill pill-orange">' + esc(SS.name(SS.stopReason, c.siteStop.reason)) + '</span>' : '') +
            (c.editLog && c.editLog.length ? ' <span class="pill pill-blue">แก้ไข ' + c.editLog.length + ' ครั้ง</span>' : '')
          : '—') + '</td>' +
        '<td style="text-align:right">' + (c && !cancelled
          ? '<button class="btn btn-ghost btn-sm" data-edit="' + c.id + '">แก้ไข</button>' : '') + '</td></tr>';
    });
    h += '</tbody></table></div>';

    /* CI-22 · มีมากกว่าที่แสดงได้ ต้องบอกว่ายังมีอีกเท่าไร ไม่ใช่ตัดจบเงียบ ๆ */
    if (total > size) {
      h += '<div class="pager">' +
        '<button class="btn btn-ghost btn-sm" id="hBack"' + (hist.page === 0 ? ' disabled' : '') + '>← ก่อนหน้า</button>' +
        '<span>หน้า ' + (hist.page + 1) + ' จาก ' + (maxPage + 1) + ' · ยังมีอีก ' + (total - (hist.page * size + rows.length)) + ' วัน</span>' +
        '<button class="btn btn-ghost btn-sm" id="hFwd"' + (hist.page >= maxPage ? ' disabled' : '') + '>ถัดไป →</button>' +
        '</div>';
    }
    h += '</div>';
    host.innerHTML = h;
    bindHist(host, me);
  };

  function bindHist(host, me) {
    $$('[name=hMode]').forEach(function (r) {
      r.addEventListener('change', function () {
        hist.mode = this.value; hist.page = 0;
        if (hist.mode === 'range' && !hist.from) {
          hist.to = SS.d.today(); hist.from = SS.d.add(hist.to, -30);
        }
        SS.app.refresh();
      });
    });
    if ($('#hPrev')) $('#hPrev').addEventListener('click', function () {
      var y = +hist.month.slice(0, 4), m = +hist.month.slice(5, 7) - 1;
      if (m === 0) { y--; m = 12; }
      hist.month = y + '-' + SS.d.pad(m); hist.page = 0; SS.app.refresh();
    });
    if ($('#hNext')) $('#hNext').addEventListener('click', function () {
      var y = +hist.month.slice(0, 4), m = +hist.month.slice(5, 7) + 1;
      if (m === 13) { y++; m = 1; }
      hist.month = y + '-' + SS.d.pad(m); hist.page = 0; SS.app.refresh();
    });
    if ($('#hFrom')) $('#hFrom').addEventListener('change', function () { hist.from = this.value; hist.page = 0; SS.app.refresh(); });
    if ($('#hTo')) $('#hTo').addEventListener('change', function () { hist.to = this.value; hist.page = 0; SS.app.refresh(); });
    if ($('#hStatus')) $('#hStatus').addEventListener('change', function () { hist.status = this.value; hist.page = 0; SS.app.refresh(); });
    if ($('#hBack')) $('#hBack').addEventListener('click', function () { hist.page--; SS.app.refresh(); });
    if ($('#hFwd')) $('#hFwd').addEventListener('click', function () { hist.page++; SS.app.refresh(); });
    $$('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        editCheckinModal(S.get().checkins.filter(function (c) { return c.id === b.getAttribute('data-edit'); })[0]);
      });
    });
  }


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
