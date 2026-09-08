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
    mycheckins: { title: 'ประวัติเช็คอินของฉัน', sub: 'เลือกเดือนหรือช่วงวันเอง · กรองตามสถานะรายวันได้', icon: '📋', short: 'ประวัติ' },
    mysummary:  { title: 'สรุปของฉัน', sub: 'ตัวเลขของตัวเองรายเดือน — ไม่มีตัวเลขเงินตาม CI-03', icon: '📈', short: 'สรุป' },
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
    employee: [['ของฉัน', ['checkin', 'mycheckins', 'mysummary', 'leavenew', 'myleaves', 'calendar']], ['UAT', ['specmap']]],
    manager:  [['ของฉัน', ['checkin', 'mycheckins', 'mysummary', 'leavenew', 'myleaves', 'calendar']],
               ['ทีมของฉัน', ['team', 'approvals', 'dashboard']], ['UAT', ['specmap']]],
    hr:       [['ของฉัน', ['checkin', 'mysummary', 'myleaves', 'calendar']],
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

  /* ---------- กล่องแจ้งผล UAT ----------
     editId = null → เพิ่มรายการใหม่ · editId = 'FB-n' → แก้ไขรายการเดิม
     ------------------------------------------------------------------ */
  var SEVS = ['บล็อกการใช้งาน', 'ต้องแก้', 'ควรปรับ', 'ข้อเสนอแนะ'];

  function feedbackCsvRows() {
    return [['เลขที่', 'เวลาที่บันทึก', 'ผู้ทดสอบ', 'หน้าจอ', 'ระดับ', 'รหัสข้อกำหนด',
             'รายละเอียด', 'แก้ไขล่าสุด', 'สถานะการแก้', 'หมายเหตุผู้พัฒนา']]
      .concat(S.get().feedback.map(function (f) {
        /* สองช่องท้ายเว้นว่างไว้ให้ฝั่งพัฒนาเติมกลับมา */
        return [f.id, f.at, f.by, f.page, f.sev, f.code, f.text, f.editedAt || '', '', ''];
      }));
  }

  function howto() {
    return '<details class="howto"><summary>วิธีแจ้งผลการทดสอบ</summary><ol>' +
      '<li>เจอปัญหาตรงไหน <b>กดปุ่มนี้จากหน้าจอนั้นเลย</b> ช่อง “หน้าจอที่พบ” จะเติมชื่อหน้าให้อัตโนมัติ</li>' +
      '<li>เลือกระดับความรุนแรง — <b>บล็อกการใช้งาน</b> คือทำงานต่อไม่ได้ · <b>ต้องแก้</b> คือผิดจากที่ตกลงไว้ · ' +
      '<b>ควรปรับ</b> คือใช้ได้แต่ไม่สะดวก · <b>ข้อเสนอแนะ</b> คือไอเดียเพิ่มเติม</li>' +
      '<li>ใส่รหัสข้อกำหนดถ้ารู้ (ดูได้จากเมนู <b>แผนที่ข้อกำหนด</b>) จะช่วยให้ทีมพัฒนาหาจุดแก้ได้เร็วขึ้น</li>' +
      '<li>เขียนรายละเอียดเป็นสองท่อน: <b>คาดว่าจะเกิดอะไร</b> กับ <b>เกิดอะไรขึ้นจริง</b></li>' +
      '<li>กด <b>บันทึก</b> — รายการจะไปอยู่ในตารางด้านล่าง ยังกด <b>แก้ไข</b> หรือ <b>ลบ</b> ได้ตลอด</li>' +
      '<li>ทดสอบจนพอใจแล้วกด <b>ส่งออกทั้งหมด (CSV)</b> ครั้งเดียว แล้วส่งไฟล์กลับมาให้ทีมพัฒนา</li>' +
      '</ol><p class="hn">รายการที่บันทึกไว้อยู่ในเครื่องของคุณคนเดียว คนอื่นมองไม่เห็น และไม่หายเวลากดรีเซ็ตข้อมูลตัวอย่าง ' +
      'แต่จะหายถ้าล้างข้อมูลเบราว์เซอร์ — ส่งออกเก็บไว้เป็นระยะจะปลอดภัยกว่า</p></details>';
  }

  function feedbackModal(editId) {
    var fb = S.get().feedback;
    var cur = editId ? S.feedbackItem(editId) : null;
    if (editId && !cur) { editId = null; }

    U.modal({
      title: cur ? 'แก้ไขผลการทดสอบ ' + U.esc(cur.id) : 'แจ้งผลการทดสอบ UAT',
      body:
        (cur ? '' : howto()) +
        (cur ? '<div class="specnote sn-mock"><b>กำลังแก้ไข</b><span>' + U.esc(cur.id) +
               ' · บันทึกครั้งแรกเมื่อ ' + U.esc(String(cur.at).replace('T', ' ').slice(0, 16)) +
               ' — เวลาเดิมจะไม่ถูกเขียนทับ</span></div>' : '') +
        '<div class="field"><label>หน้าจอที่พบ</label><input type="text" id="fPage" value="' +
          U.esc(cur ? cur.page : PAGES[current].title) + '"></div>' +
        '<div class="field"><label>ระดับ</label><div class="choices">' +
          SEVS.map(function (s, i) {
            var on = cur ? cur.sev === s : i === 1;
            return '<label class="choice' + (on ? ' on' : '') + '"><input type="radio" name="fsev" value="' +
                   U.esc(s) + '"' + (on ? ' checked' : '') + '> ' + s + '</label>'; }).join('') +
        '</div></div>' +
        '<div class="field"><label>รหัสข้อกำหนดที่เกี่ยว (ถ้ามี)</label><input type="text" id="fCode" placeholder="เช่น CI-16, BR-01" value="' +
          U.esc(cur ? cur.code : '') + '"></div>' +
        '<div class="field"><label>รายละเอียด <span class="req">*</span></label>' +
          '<textarea id="fText" placeholder="สิ่งที่คาดว่าจะเกิด กับสิ่งที่เกิดขึ้นจริง">' +
          U.esc(cur ? cur.text : '') + '</textarea></div>' +
        (fb.length ? '<div class="sect">บันทึกไว้แล้ว ' + fb.length + ' รายการ</div><div class="tw"><table class="t"><tbody>' +
          fb.slice().reverse().map(function (f) {
            return '<tr' + (cur && f.id === cur.id ? ' class="on"' : '') + '>' +
              '<td><small>' + U.esc(f.id) + '</small></td>' +
              '<td><small>' + U.esc(f.page) + '</small></td>' +
              '<td><small>' + U.esc(f.sev) + (f.code ? ' · ' + U.esc(f.code) : '') +
                (f.editedAt ? ' · แก้ไขแล้ว' : '') + '</small></td>' +
              '<td>' + U.esc(f.text) + '</td>' +
              '<td style="text-align:right;white-space:nowrap">' +
                '<button class="btn btn-ghost btn-sm" data-fbedit="' + f.id + '">แก้ไข</button> ' +
                '<button class="btn btn-ghost btn-sm" data-fbdel="' + f.id + '">ลบ</button></td></tr>'; }).join('') +
          '</tbody></table></div>' : ''),
      buttons: [
        cur ? { label: 'ยกเลิกการแก้ไข', cls: 'btn-ghost', onClick: function () { U.closeModal(); feedbackModal(); return false; } }
            : { label: 'ปิด', cls: 'btn-ghost' },
        { label: 'ส่งออกทั้งหมด (CSV)', cls: 'btn-ghost', onClick: function () {
            if (!S.get().feedback.length) { U.toast('ยังไม่มีรายการให้ส่งออก', 'err'); return false; }
            U.csv('uat-feedback.csv', feedbackCsvRows());
            return false;
          } },
        { label: cur ? 'บันทึกการแก้ไข' : 'บันทึก', cls: 'btn-accent', onClick: function () {
            var text = $('#fText').value.trim();
            if (!text) { U.toast('กรุณากรอกรายละเอียด', 'err'); return false; }
            var data = {
              page: $('#fPage').value, code: $('#fCode').value,
              sev: ($$('[name=fsev]').filter(function (r) { return r.checked; })[0] || {}).value, text: text
            };
            if (cur) {
              S.updateFeedback(cur.id, data);
              U.toast('แก้ไข ' + U.esc(cur.id) + ' แล้ว', 'ok');
              U.closeModal(); feedbackModal();
              $('#fbCount').textContent = S.get().feedback.length;
              return false;
            }
            data.by = S.user().name;
            S.addFeedback(data);
            U.toast('บันทึกผลการทดสอบแล้ว', 'ok');
            $('#fbCount').textContent = S.get().feedback.length;
          } }
      ],
      onOpen: function () {
        $$('[data-fbedit]').forEach(function (b) {
          b.addEventListener('click', function () { U.closeModal(); feedbackModal(b.getAttribute('data-fbedit')); });
        });
        $$('[data-fbdel]').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = b.getAttribute('data-fbdel');
            S.removeFeedback(id);
            $('#fbCount').textContent = S.get().feedback.length;
            U.closeModal();
            /* ถ้าลบรายการที่กำลังแก้อยู่ ให้กลับไปโหมดเพิ่มใหม่ */
            feedbackModal(editId === id ? null : editId);
          });
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
    $('#btnFeedback').addEventListener('click', function () { feedbackModal(); });
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
