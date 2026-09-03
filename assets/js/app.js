/* ==========================================================================
   app.js — router · เมนูตามบทบาท (S8) · ตัวสลับผู้ใช้ · กล่องแจ้งผล UAT
   ========================================================================== */
window.SS = window.SS || {};

SS.app = (function () {
  var U = SS.ui, S = SS.store, C = SS.core;
  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  var PAGES = {
    checkin:    { title: 'เช็คอิน', sub: 'ลงเวลาเข้างานประจำวัน', icon: '⏱', short: 'เช็คอิน' },
    mycheckins: { title: 'ประวัติเช็คอินของฉัน', sub: 'แก้ไขได้ภายในเวลาที่กำหนด · ไม่มีการลบ', icon: '📋', short: 'ประวัติ' },
    leavenew:   { title: 'ยื่นใบลา', sub: 'ระบบคำนวณจำนวนวันและถังที่จะตัดให้ก่อนกดส่ง', icon: '📝', short: 'ยื่นลา' },
    myleaves:   { title: 'ใบลาของฉัน', sub: 'ยอดใช้ไปกับยอดจองแยกกัน', icon: '🗂', short: 'ใบลา' },
    calendar:   { title: 'ปฏิทิน', sub: 'ปฏิทินเดียว หลายชั้นข้อมูล', icon: '📅', short: 'ปฏิทิน' },
    team:       { title: 'ทีมของฉัน', sub: 'สถานะรายวันของลูกทีมทุกคน', icon: '👥', short: 'ทีม' },
    approvals:  { title: 'คิวอนุมัติ', sub: 'เรียงตามความเร่งด่วน ไม่ใช่เวลาที่ยื่น', icon: '✅', short: 'อนุมัติ' },
    dashboard:  { title: 'Dashboard', sub: 'ภาพรวมวันนี้ แตกตามสถานะรายวัน', icon: '📊', short: 'ภาพรวม' },
    staff:      { title: 'ทะเบียนพนักงาน', sub: 'ของจำลอง — เจ้าของจริงคือเมนู Staff/Account', icon: '🧑', short: 'พนักงาน' },
    workcal:    { title: 'ปฏิทินทำงานรายปี', sub: 'คลิกที่วันเพื่อสลับประเภท', icon: '🗓', short: 'ปฏิทินงาน' },
    settings:   { title: 'ตั้งค่า', sub: 'ทุกค่าแก้ได้จากที่นี่ ไม่มีค่าไหน hardcode', icon: '⚙', short: 'ตั้งค่า' },
    tables:     { title: 'ทะเบียนของกลาง', sub: 'S10 · S17 · S19 · S20 และตารางอำนาจอนุมัติ', icon: '🗃', short: 'ทะเบียน' },
    audit:      { title: 'บันทึกการใช้งาน', sub: 'ใคร ทำอะไร เมื่อไร', icon: '🔎', short: 'บันทึก' },
    specmap:    { title: 'แผนที่ข้อกำหนด', sub: 'รหัสงานแต่ละข้อทดสอบได้ที่หน้าจอไหน', icon: '🧭', short: 'แผนที่' }
  };

  var NAV = {
    employee: [['ของฉัน', ['checkin', 'mycheckins', 'leavenew', 'myleaves', 'calendar']], ['UAT', ['specmap']]],
    manager:  [['ของฉัน', ['checkin', 'mycheckins', 'leavenew', 'myleaves', 'calendar']],
               ['ทีมของฉัน', ['team', 'approvals', 'dashboard']], ['UAT', ['specmap']]],
    hr:       [['ของฉัน', ['checkin', 'myleaves', 'calendar']],
               ['งานฝ่ายบุคคล', ['dashboard', 'approvals', 'staff', 'workcal']],
               ['ของกลางและตั้งค่า', ['tables', 'settings', 'audit']], ['UAT', ['specmap']]],
    exec:     [['ภาพรวม', ['dashboard', 'approvals', 'calendar', 'team']],
               ['ของกลาง', ['tables', 'audit']], ['UAT', ['specmap']]],
    admin:    [['ดูแลข้อมูล', ['staff', 'workcal', 'tables', 'settings']],
               ['ตรวจสอบ', ['audit', 'dashboard']], ['UAT', ['specmap']]]
  };

  var current = 'checkin';

  function pendingCount(u) {
    if (['manager', 'hr', 'exec'].indexOf(u.role) < 0) return 0;
    var q = SS.views._queueFor(u);
    return q.leaves.length + q.comps.length + q.ots.length + q.edits.length;
  }

  function renderNav() {
    var u = S.user(), groups = NAV[u.role] || NAV.employee;
    var pend = pendingCount(u);
    var h = '';
    groups.forEach(function (g) {
      h += '<div class="grp">' + U.esc(g[0]) + '</div>';
      g[1].forEach(function (k) {
        var p = PAGES[k];
        h += '<button data-go="' + k + '" class="' + (current === k ? 'on' : '') + '">' +
          '<span class="ic">' + p.icon + '</span>' + U.esc(p.title) +
          (k === 'approvals' && pend ? '<span class="bg">' + pend + '</span>' : '') + '</button>';
      });
    });
    $('#nav').innerHTML = h;
    $$('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-go')); $('#sidebar').classList.remove('open'); });
    });

    /* แถบล่างสำหรับมือถือ — 5 เมนูแรกของบทบาทนั้น */
    var flat = [];
    groups.forEach(function (g) { g[1].forEach(function (k) { if (flat.length < 5) flat.push(k); }); });
    $('#mbar').innerHTML = flat.map(function (k) {
      var p = PAGES[k];
      return '<button data-mgo="' + k + '" class="' + (current === k ? 'on' : '') + '">' +
        '<span class="mi">' + p.icon + '</span>' + U.esc(p.short) +
        (k === 'approvals' && pend ? '<span class="bg">' + pend + '</span>' : '') + '</button>';
    }).join('');
    $$('[data-mgo]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-mgo')); });
    });
  }

  function renderUsers() {
    var u = S.user();
    $('#userPicker').innerHTML = S.get().employees.map(function (e) {
      return '<option value="' + e.id + '"' + (e.id === u.id ? ' selected' : '') + '>' +
        U.esc(e.name + ' · ' + SS.name(SS.role, e.role)) + '</option>';
    }).join('');
  }

  function go(key) {
    if (!PAGES[key]) key = 'checkin';
    var u = S.user();
    var allowed = [];
    (NAV[u.role] || NAV.employee).forEach(function (g) { allowed = allowed.concat(g[1]); });
    if (allowed.indexOf(key) < 0) key = allowed[0];
    current = key;
    render();
  }

  function render() {
    var p = PAGES[current];
    $('#pageTitle').textContent = p.title;
    $('#pageSub').textContent = p.sub;
    renderNav(); renderUsers();
    var host = $('#view');
    host.innerHTML = '';
    (SS.views[current] || function (h) { h.innerHTML = U.empty('ยังไม่มีหน้านี้'); })(host);
    $('#fbCount').textContent = S.get().feedback.length;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------- กล่องแจ้งผล UAT ---------- */
  function feedbackModal() {
    var fb = S.get().feedback;
    U.modal({
      title: 'แจ้งผลการทดสอบ UAT',
      body:
        '<div class="field"><label>หน้าจอที่พบ</label><input type="text" id="fPage" value="' + U.esc(PAGES[current].title) + '"></div>' +
        '<div class="field"><label>ระดับ</label><div class="choices">' +
          ['บล็อกการใช้งาน', 'ต้องแก้', 'ควรปรับ', 'ข้อเสนอแนะ'].map(function (s, i) {
            return '<label class="choice' + (i === 1 ? ' on' : '') + '"><input type="radio" name="fsev" value="' + s + '"' + (i === 1 ? ' checked' : '') + '> ' + s + '</label>'; }).join('') +
        '</div></div>' +
        '<div class="field"><label>รหัสข้อกำหนดที่เกี่ยว (ถ้ามี)</label><input type="text" id="fCode" placeholder="เช่น CI-16, BR-01"></div>' +
        '<div class="field"><label>รายละเอียด <span class="req">*</span></label><textarea id="fText" placeholder="สิ่งที่คาดว่าจะเกิด กับสิ่งที่เกิดขึ้นจริง"></textarea></div>' +
        (fb.length ? '<div class="sect">บันทึกไว้แล้ว ' + fb.length + ' รายการ</div><div class="tw"><table class="t"><tbody>' +
          fb.slice().reverse().map(function (f) {
            return '<tr><td><small>' + U.esc(f.page) + '</small></td><td><small>' + U.esc(f.sev) + (f.code ? ' · ' + U.esc(f.code) : '') + '</small></td>' +
              '<td>' + U.esc(f.text) + '</td><td style="text-align:right"><button class="btn btn-ghost btn-sm" data-fbdel="' + f.id + '">ลบ</button></td></tr>'; }).join('') +
          '</tbody></table></div>' : ''),
      buttons: [
        { label: 'ปิด', cls: 'btn-ghost' },
        { label: 'ส่งออกทั้งหมด (CSV)', cls: 'btn-ghost', onClick: function () {
            var rows = [['เวลา', 'ผู้ทดสอบ', 'หน้าจอ', 'ระดับ', 'รหัสข้อกำหนด', 'รายละเอียด']].concat(
              S.get().feedback.map(function (f) { return [f.at, f.by, f.page, f.sev, f.code, f.text]; }));
            U.csv('uat-feedback.csv', rows);
            return false;
          } },
        { label: 'บันทึก', cls: 'btn-accent', onClick: function () {
            var text = $('#fText').value.trim();
            if (!text) { U.toast('กรุณากรอกรายละเอียด', 'err'); return false; }
            S.addFeedback({
              by: S.user().name, page: $('#fPage').value, code: $('#fCode').value,
              sev: ($$('[name=fsev]').filter(function (r) { return r.checked; })[0] || {}).value, text: text
            });
            U.toast('บันทึกผลการทดสอบแล้ว', 'ok');
            $('#fbCount').textContent = S.get().feedback.length;
          } }
      ],
      onOpen: function () {
        $$('[data-fbdel]').forEach(function (b) {
          b.addEventListener('click', function () { S.removeFeedback(b.getAttribute('data-fbdel')); U.closeModal(); feedbackModal(); });
        });
      }
    });
  }

  function boot() {
    S.init();
    renderUsers();
    $('#userPicker').addEventListener('change', function () {
      S.setUser(this.value);
      var u = S.user();
      var allowed = [];
      (NAV[u.role] || NAV.employee).forEach(function (g) { allowed = allowed.concat(g[1]); });
      if (allowed.indexOf(current) < 0) current = allowed[0];
      render();
      U.toast('เข้าใช้งานในนาม ' + u.name + ' · ' + SS.name(SS.role, u.role), 'ok');
    });
    $('#btnMenu').addEventListener('click', function () { $('#sidebar').classList.toggle('open'); });
    $('#btnReset').addEventListener('click', function () {
      U.confirm('รีเซ็ตข้อมูลตัวอย่าง',
        '<p>ข้อมูลจำลองทั้งหมดจะกลับไปเป็นค่าตั้งต้น — ผลการทดสอบที่บันทึกไว้ในกล่อง UAT จะยังอยู่</p>',
        function () { S.reset(); U.toast('รีเซ็ตแล้ว', 'ok'); render(); }, 'รีเซ็ต', 'btn-danger');
    });
    $('#btnFeedback').addEventListener('click', feedbackModal);
    document.getElementById('modalRoot').addEventListener('click', function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute('data-close')) U.closeModal();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') U.closeModal(); });

    U.initDownloads();   /* ขอสิทธิ์บันทึกไฟล์ล่วงหน้า เพื่อให้ปุ่มส่งออก CSV ตอบสนองทันที */
    SS.views._startClock();
    render();
  }

  return { boot: boot, go: go, refresh: render, pages: PAGES };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', SS.app.boot);
else SS.app.boot();
