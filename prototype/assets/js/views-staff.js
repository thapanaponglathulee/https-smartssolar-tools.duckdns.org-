/* ==========================================================================
   views-staff.js — หน้าจอตามข้อกำหนดหน้าจอสามไฟล์
     A1–A7  spec-account.md   Employee Management
     O1–O5  spec-org.md       Organization & Position
     C1–C6  spec-cert.md      Certificate & Employee Document

   ข้อกำหนดหน้าจอบอกว่า "หน้าตาต้องเป็นอย่างไร" เพื่อให้สร้างขึ้นมากดเล่น
   แล้วใช้หน้าจอเป็นเครื่องมือค้นว่าข้อมูลอะไรยังคิดไม่ถึง
   *** ข้อมูลสมมติทั้งหมด ห้ามใส่ชื่อพนักงานจริง ***
   ========================================================================== */
window.SS = window.SS || {};
SS.views = SS.views || {};

(function () {
  var U = SS.ui, S = SS.store, C = SS.core;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(x) { return U.esc(x); }

  /* ---------- ตัวช่วยที่ใช้ร่วมกัน ---------- */
  function empStatusOf(e) {
    return e.empStatus || (e.active ? 'regular' : 'left');
  }
  function statusPill(e) {
    var st = SS.empStatus(empStatusOf(e)) || {};
    return U.pill(st.pill || 'pill-gray', st.name || '—');
  }
  function incomplete(e) {
    var miss = [];
    if (!e.positionId) miss.push('ตำแหน่ง');
    if (!e.dept) miss.push('แผนก');
    if (!e.managerId && e.role !== 'exec') miss.push('หัวหน้างาน');
    if (!e.startDate) miss.push('วันเริ่มงาน');
    return miss;
  }
  function canManageStaff() {
    var r = S.user().role;
    return r === 'hr' || r === 'admin';
  }

  /* ==================================================================
     A1 · รายชื่อพนักงาน  — หน้าหลักของเมนูนี้
     ================================================================== */
  var staffFilter = { q: '', dept: '', status: '', role: '' };

  SS.views.staff = function (host) {
    var db = S.get();
    var all = db.employees;
    var counted = all.filter(function (e) { return !e.isTest; });
    var n = { total: counted.length, regular: 0, probation: 0, left: 0, suspended: 0 };
    counted.forEach(function (e) { n[empStatusOf(e)] = (n[empStatusOf(e)] || 0) + 1; });
    var badRows = counted.filter(function (e) { return incomplete(e).length; });

    var rows = all.filter(function (e) {
      var st = empStatusOf(e);
      /* คนที่พ้นสภาพยังอยู่ในระบบ แต่ตั้งต้นไม่แสดง ต้องกรองเลือกถึงจะเห็น */
      if (!staffFilter.status && !(SS.empStatus(st) || {}).active) return false;
      if (staffFilter.status && st !== staffFilter.status) return false;
      if (staffFilter.dept && e.dept !== staffFilter.dept) return false;
      if (staffFilter.role && e.role !== staffFilter.role) return false;
      if (staffFilter.q) {
        var q = staffFilter.q.toLowerCase();
        if ((e.name + ' ' + e.id).toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });

    var h = '<div class="grid g4">' +
      '<div class="stat"><div class="l">ทั้งหมด</div><div class="v">' + n.total + '<small>คน</small></div><div class="n">ไม่นับบัญชีทดสอบ</div></div>' +
      '<div class="stat g"><div class="l">ประจำ</div><div class="v">' + (n.regular || 0) + '</div></div>' +
      '<div class="stat y"><div class="l">ทดลองงาน</div><div class="v">' + (n.probation || 0) + '</div></div>' +
      '<div class="stat r"><div class="l">ข้อมูลไม่ครบ</div><div class="v">' + badRows.length + '<small>คน</small></div>' +
        '<div class="n">' + (badRows.length ? 'ดูรายการที่หน้า "ข้อมูลไม่ครบ"' : 'ครบทุกคน') + '</div></div>' +
      '</div>';

    h += '<div class="card" style="margin-top:16px"><div class="chead"><h2>ทะเบียนพนักงาน</h2>' +
      '<span class="sub">A1 · การ์ดนับต้องตรงกับจำนวนแถวจริง</span><span class="sp"></span>' +
      (canManageStaff() ? '<button class="btn btn-accent btn-sm" id="btnAddEmp">+ เพิ่มพนักงาน</button>' : '') + '</div>';

    h += '<div class="frow4">' +
      '<div class="field"><label>ค้นหาชื่อหรือรหัส</label><input type="text" id="sfQ" value="' + esc(staffFilter.q) + '" placeholder="พิมพ์ชื่อหรือ EMP-201"></div>' +
      '<div class="field"><label>แผนก</label><select id="sfDept"><option value="">ทุกแผนก</option>' +
        db.depts.map(function (d) { return '<option value="' + d.id + '"' + (staffFilter.dept === d.id ? ' selected' : '') + '>' + esc(d.name) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="field"><label>สถานะ</label><select id="sfStatus"><option value="">ที่ยังทำงานอยู่</option>' +
        SS.EMP_STATUS.map(function (x) { return '<option value="' + x.id + '"' + (staffFilter.status === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="field"><label>สิทธิ์</label><select id="sfRole"><option value="">ทุกสิทธิ์</option>' +
        SS.ROLES.map(function (x) { return '<option value="' + x.id + '"' + (staffFilter.role === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') +
        '</select></div></div>';

    h += '<div class="tw"><table class="t"><thead><tr><th>รหัส</th><th>ชื่อ</th><th>ตำแหน่ง</th><th>แผนก</th><th>สถานะ</th><th>สิทธิ์</th></tr></thead><tbody>';
    if (!rows.length) {
      h += '<tr><td colspan="6">' + U.empty(staffFilter.q || staffFilter.dept || staffFilter.role || staffFilter.status
        ? 'ไม่พบพนักงานที่ตรงกับที่ค้น' : 'ยังไม่มีพนักงานในระบบ', 'ลองล้างตัวกรองแล้วค้นใหม่') + '</td></tr>';
    }
    rows.forEach(function (e) {
      var miss = incomplete(e);
      h += '<tr class="clickrow" data-emp="' + e.id + '">' +
        '<td><b>' + esc(e.id) + '</b></td>' +
        '<td>' + esc(e.name) + (e.isTest ? ' ' + U.pill('pill-orange', 'บัญชีทดสอบ') : '') + '</td>' +
        '<td>' + (e.positionId ? esc(SS.name(SS.position, e.positionId))
          : '<span class="warnv">⚠ ยังไม่ระบุ</span>' + (e.rawDept ? '' : '')) + '</td>' +
        '<td>' + (e.dept ? esc(SS.name(SS.dept, e.dept))
          : '<span class="warnv">⚠ ' + esc(e.rawDept || 'ยังไม่จัด') + '</span>') + '</td>' +
        '<td>' + statusPill(e) + (miss.length ? ' ' + U.pill('pill-yellow', 'ขาด ' + miss.length + ' ช่อง') : '') + '</td>' +
        '<td><small>' + esc(SS.name(SS.role, e.role)) + '</small></td></tr>';
    });
    h += '</tbody></table></div>' +
      U.note('mock', '<b>ไม่มีปุ่มลบ</b> ทั้งในรายการและในหน้าโปรไฟล์ (ACC-04) — ใช้สถานะพ้นสภาพแทน · ' +
        'คนที่พ้นสภาพยังอยู่ในระบบ แต่ตั้งต้นไม่แสดง ต้องเลือกสถานะถึงจะเห็น') + '</div>';

    host.innerHTML = h;
    $('#sfQ').addEventListener('input', function () { staffFilter.q = this.value; SS.app.refresh(); });
    $('#sfQ').focus();
    if (staffFilter.q) { var el = $('#sfQ'); el.setSelectionRange(el.value.length, el.value.length); }
    $('#sfDept').addEventListener('change', function () { staffFilter.dept = this.value; SS.app.refresh(); });
    $('#sfStatus').addEventListener('change', function () { staffFilter.status = this.value; SS.app.refresh(); });
    $('#sfRole').addEventListener('change', function () { staffFilter.role = this.value; SS.app.refresh(); });
    $$('[data-emp]').forEach(function (r) {
      r.addEventListener('click', function () { openProfile(r.getAttribute('data-emp')); });
    });
    if ($('#btnAddEmp')) $('#btnAddEmp').addEventListener('click', addEmpWizard);
  };

  /* ==================================================================
     A2 · โปรไฟล์พนักงาน — สี่แท็บ อย่ายัดทุกอย่างลงหน้าเดียว
     ================================================================== */
  var profTab = 'person';

  function openProfile(empId, tab) {
    var e = S.employee(empId);
    if (!e) return;
    if (tab) profTab = tab;
    var db = S.get();
    var TABS = [['person', 'ข้อมูลส่วนตัว'], ['work', 'งานและองค์กร'], ['perm', 'สิทธิ์'], ['log', 'ประวัติการแก้ไข']];
    var editable = canManageStaff();

    function body() {
      var h = '<div class="tabs">' + TABS.map(function (t) {
        return '<button class="tb' + (profTab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>';

      if (profTab === 'person') {
        h += kv([
          ['รหัสพนักงาน', esc(e.id) + ' <small>(ระบบออกให้ แก้ไม่ได้)</small>'],
          ['ชื่อ-สกุล', esc(e.name)],
          ['ชื่อเล่น', '<i class="dimv">ยังไม่มีข้อมูล — เจ้าตัวแก้ได้เอง</i>'],
          ['เบอร์โทร', '<i class="dimv">ยังไม่มีข้อมูล</i>'],
          ['อีเมล', '<i class="dimv">ยังไม่มีข้อมูล</i>'],
          ['วันเกิด', '<i class="dimv">ยังไม่มีข้อมูล — ฝ่ายบุคคลกรอก</i>']
        ]) + U.note('open', '<b>ยังไม่เอาในรอบนี้</b> — ผู้ติดต่อกรณีฉุกเฉิน · เลขบัตรประชาชน · ที่อยู่ · ' +
          'ถ้าจะเพิ่มภายหลังต้องคุยเรื่อง PDPA ก่อน อย่าใส่ช่องไว้เฉย ๆ') +
          U.note('mock', 'ระบบนี้ไม่มีช่องเงินเดือน ค่าแรง เลขบัญชีธนาคาร หรือเลขบัตรประชาชนในหน้าจอใด ๆ');
      }

      if (profTab === 'work') {
        var miss = incomplete(e);
        h += (miss.length ? '<div class="issue">ข้อมูลยังไม่ครบ — ขาด ' + esc(miss.join(' · ')) + '</div>' : '') +
        '<div class="frow">' +
          '<div class="field"><label>ตำแหน่งงาน <span class="req">*</span></label>' +
          '<select id="pPos"' + (editable ? '' : ' disabled') + '><option value="">— ยังไม่ระบุ —</option>' +
          db.positions.filter(function (x) { return x.enabled || x.id === e.positionId; })
            .map(function (x) { return '<option value="' + x.id + '"' + (e.positionId === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') +
          '</select><div class="hint">ดรอปดาวน์ ตั้งค่าได้ที่หน้าตำแหน่งงาน <b>ห้ามพิมพ์อิสระ</b> (ACC-06)</div></div>' +
          '<div class="field"><label>ฝ่าย / แผนก <span class="req">*</span></label>' +
          '<select id="pDept"' + (editable ? '' : ' disabled') + '><option value="">— ยังไม่จัด —</option>' +
          db.depts.filter(function (x) { return x.enabled || x.id === e.dept; }).map(function (x) {
            return '<option value="' + x.id + '"' + (e.dept === x.id ? ' selected' : '') + '>' +
              esc(SS.name(SS.division, x.divisionId) + ' / ' + x.name) + '</option>'; }).join('') +
          '</select>' + (e.rawDept ? '<div class="hint">ค่าเดิมในระบบ: <b>' + esc(e.rawDept) + '</b></div>' : '') + '</div>' +
        '</div>' +
        '<div class="frow">' +
          '<div class="field"><label>หัวหน้างาน <span class="req">*</span></label>' +
          '<select id="pMgr"' + (editable ? '' : ' disabled') + '><option value="">— ไม่มี —</option>' +
          S.get().employees.filter(function (x) { return x.id !== e.id && x.active && !x.isTest; })
            .map(function (x) { return '<option value="' + x.id + '"' + (e.managerId === x.id ? ' selected' : '') + '>' + esc(x.name) + ' (' + x.id + ')</option>'; }).join('') +
          '</select><div class="hint"><b>ช่องเดียว</b> — ผู้อนุมัติแต่ละเรื่องถามจากตารางอำนาจ S2 ไม่ได้ผูกกับช่องนี้</div></div>' +
          '<div class="field"><label>สถานะพนักงาน <span class="req">*</span></label>' +
          '<select id="pStatus"' + (editable ? '' : ' disabled') + '>' +
          SS.EMP_STATUS.map(function (x) { return '<option value="' + x.id + '"' + (empStatusOf(e) === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
        '<div class="frow3">' +
          '<div class="field"><label>วันเริ่มงาน</label><input type="date" id="pStart" value="' + esc(e.startDate || '') + '"' + (editable ? '' : ' disabled') + '></div>' +
          '<div class="field"><label>กะ</label><select id="pShift"' + (editable ? '' : ' disabled') + '>' +
            '<option value="day"' + (e.shift === 'day' ? ' selected' : '') + '>กะปกติ</option>' +
            '<option value="night"' + (e.shift === 'night' ? ' selected' : '') + '>กะกลางคืน</option></select></div>' +
          '<div class="field"><label>ยกเว้นการเช็คอิน</label><select id="pExempt"' + (editable ? '' : ' disabled') + '>' +
            '<option value="0"' + (e.exemptCheckin ? '' : ' selected') + '>ไม่ยกเว้น</option>' +
            '<option value="1"' + (e.exemptCheckin ? ' selected' : '') + '>ยกเว้น</option></select>' +
            '<div class="hint">ต้องผ่านผู้บริหาร (CI-07 · APV-11)</div></div>' +
        '</div>';

        /* บล็อกโควตาวันลา — อ่านอย่างเดียว มีปุ่มขอแก้ที่เข้าคิวรอผู้บริหาร */
        h += '<div class="sect">โควตาวันลา</div>' +
          '<div class="tw"><table class="t"><thead><tr><th>ประเภท</th><th class="n">ปีนี้</th><th class="n">ใช้ไป</th><th class="n">คงเหลือ</th><th>หมดอายุ</th></tr></thead><tbody>' +
          ['LT-ANNUAL', 'LT-PERSONAL', 'LT-COMP'].map(function (t) {
            var q = C.quota(e.id, t);
            return '<tr><td>' + esc(SS.name(SS.leaveType, t)) + '</td>' +
              '<td class="n">' + (q.total === null ? '—' : U.num(q.total)) + '</td>' +
              '<td class="n">' + U.num(q.used) + '</td>' +
              '<td class="n">' + (q.remaining === null ? 'ไม่จำกัด' : U.num(q.remaining)) + '</td>' +
              '<td><small>' + esc(U.date(C.expiryOf(SS.d.year(SS.d.today())), 'long')) + '</small></td></tr>'; }).join('') +
          '</tbody></table></div>' +
          '<div style="text-align:right;margin-top:9px"><button class="btn btn-ghost btn-sm" id="pQuota">ขอแก้โควตา</button></div>' +
          U.note('mock', 'ตารางนี้อ่านอย่างเดียว — ปุ่มขอแก้โควตา <b>เข้าคิวรอผู้บริหารอนุมัติ ไม่ใช่แก้ทันที</b> (ACC-09 · APV-11)');
      }

      if (profTab === 'perm') {
        h += '<div class="permlist">' + SS.ROLES.map(function (r) {
          var on = e.role === r.id;
          return '<label class="permrow' + (on ? ' on' : '') + '">' +
            '<input type="checkbox" data-perm="' + r.id + '"' + (on ? ' checked' : '') + (editable ? '' : ' disabled') + '>' +
            '<span><b>' + esc(r.name) + '</b><small>' + esc(permDesc(r.id)) + '</small></span></label>';
        }).join('') + '</div>' +
        U.note('cant', '<b>ต้นแบบยังถือสิทธิ์ได้คนละหนึ่งอย่าง</b> — ACC-01 กำหนดว่าคนหนึ่งติ๊กได้หลายสิทธิ์ ' +
          'ซึ่งกระทบตัวสลับผู้ใช้ของต้นแบบและเมนูตามบทบาททั้งระบบ · ติ๊กที่นี่จึงเป็นการเปลี่ยนสิทธิ์เดียว ไม่ใช่การถือหลายสิทธิ์จริง') +
        '<div class="sect">บัญชีผู้ใช้</div>' +
        kv([
          ['ชื่อผู้ใช้', esc((e.id || '').toLowerCase())],
          ['เข้าระบบล่าสุด', '<i class="dimv">ต้นแบบไม่มีระบบล็อกอิน จึงไม่มีข้อมูลนี้</i>']
        ]) +
        '<div style="text-align:right;margin-top:9px"><button class="btn btn-ghost btn-sm" id="pPwd">ตั้งรหัสผ่านใหม่</button></div>' +
        U.note('mock', 'เปลี่ยนสิทธิ์ต้องขึ้นกล่องยืนยันที่บอกว่าเปลี่ยนจากอะไรเป็นอะไร และลง audit log (ACC-14) · ' +
          '<b>ห้ามปลดจนไม่เหลือคนถือสิทธิ์ฝ่ายบุคคลหรือผู้บริหาร</b>');
      }

      if (profTab === 'log') {
        var logs = S.get().audit.filter(function (a) { return a.target === e.id; }).slice().reverse();
        h += '<div class="tw"><table class="t"><thead><tr><th>เมื่อไร</th><th>ใครแก้</th><th>ทำอะไร</th><th>รายละเอียด</th></tr></thead><tbody>';
        if (!logs.length) h += '<tr><td colspan="4">' + U.empty('ยังไม่มีประวัติการแก้ไขของคนนี้') + '</td></tr>';
        logs.forEach(function (a) {
          h += '<tr><td><small>' + esc(String(a.at).replace('T', ' ').slice(0, 16)) + '</small></td>' +
            '<td><small>' + esc(a.byName || a.by) + '</small></td><td>' + esc(a.action) + '</td>' +
            '<td><small>' + esc(a.detail || '') + '</small></td></tr>';
        });
        h += '</tbody></table></div>' + U.note('mock', '<b>ไม่มีปุ่มลบประวัติ</b> — ในระบบจริงต้องบังคับที่สิทธิ์ฐานข้อมูล (APV-13)');
      }
      return h;
    }

    function bind() {
      $$('[data-tab]').forEach(function (b) {
        b.addEventListener('click', function () { profTab = b.getAttribute('data-tab'); U.closeModal(); openProfile(empId); });
      });
      function save(field, val, label) {
        var before = e[field];
        if (String(before === null || before === undefined ? '' : before) === String(val)) return;
        var patch = {}; patch[field] = val;
        S.setEmployee(e.id, patch);
        U.toast('บันทึก' + label + 'แล้ว · ลง audit log เรียบร้อย', 'ok');
      }
      if ($('#pPos')) $('#pPos').addEventListener('change', function () { save('positionId', this.value || null, 'ตำแหน่ง'); });
      if ($('#pDept')) $('#pDept').addEventListener('change', function () {
        save('dept', this.value || null, 'แผนก');
        if (this.value && e.rawDept) S.setEmployee(e.id, { rawDept: '' });
      });
      if ($('#pMgr')) $('#pMgr').addEventListener('change', function () { save('managerId', this.value || null, 'หัวหน้างาน'); });
      if ($('#pStart')) $('#pStart').addEventListener('change', function () { save('startDate', this.value, 'วันเริ่มงาน'); });
      if ($('#pShift')) $('#pShift').addEventListener('change', function () { save('shift', this.value, 'กะ'); });
      if ($('#pExempt')) $('#pExempt').addEventListener('change', function () { save('exemptCheckin', this.value === '1', 'การยกเว้นเช็คอิน'); });
      if ($('#pStatus')) $('#pStatus').addEventListener('change', function () {
        var v = this.value;
        if (v === 'left') { U.closeModal(); leaveCompanyModal(e); return; }
        save('empStatus', v, 'สถานะพนักงาน');
        S.setEmployee(e.id, { active: (SS.empStatus(v) || {}).active !== false });
      });
      if ($('#pQuota')) $('#pQuota').addEventListener('click', function () {
        U.toast('ส่งคำขอแก้โควตาเข้าคิวผู้บริหารแล้ว — ต้นแบบยังไม่มีหน้าคิวของเรื่องนี้ (ACC-09)', 'ok');
      });
      if ($('#pPwd')) $('#pPwd').addEventListener('click', function () {
        U.confirm('ตั้งรหัสผ่านใหม่',
          '<p><b>ระบบจะแจ้งเจ้าตัวและบันทึกไว้</b> ว่าใครเป็นคนตั้งรหัสผ่านทับ เมื่อไร (ACC-11)</p>' +
          U.note('cant', 'ต้นแบบไม่มีระบบล็อกอินจริง จึงพิสูจน์ได้แค่ว่าหน้าจอเตือนถูกต้อง'),
          function () { S.log('ตั้งรหัสผ่านใหม่', e.id, 'ตั้งทับโดยฝ่ายบุคคล'); S.emit(); U.toast('บันทึกการตั้งรหัสผ่านใหม่แล้ว', 'ok'); },
          'ยืนยัน', 'btn-danger');
      });
      $$('[data-perm]').forEach(function (b) {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          var to = b.getAttribute('data-perm');
          if (to === e.role) return;
          var lastOf = S.byRole(e.role).length <= 1 && (e.role === 'hr' || e.role === 'exec');
          if (lastOf) { U.toast('ปลดไม่ได้ — นี่เป็นคนสุดท้ายที่ถือสิทธิ์' + SS.name(SS.role, e.role), 'err'); return; }
          U.confirm('เปลี่ยนสิทธิ์ผู้ใช้',
            '<p>เปลี่ยนจาก <b>' + esc(SS.name(SS.role, e.role)) + '</b> เป็น <b>' + esc(SS.name(SS.role, to)) + '</b></p>' +
            U.note('mock', 'การเปลี่ยนบทบาทผู้ใช้ต้องผ่านผู้บริหารตาม APV-11 — ต้นแบบให้กดได้เลยเพื่อทดสอบหน้าจอ'),
            function () {
              S.setEmployee(e.id, { role: to });
              U.toast('เปลี่ยนสิทธิ์แล้ว · ลง audit log เรียบร้อย', 'ok');
              U.closeModal(); openProfile(empId); SS.app.refresh();
            }, 'ยืนยันการเปลี่ยน', 'btn-danger');
        });
      });
    }

    U.modal({
      title: esc(e.name) + ' · ' + esc(e.id),
      body: body(),
      buttons: [{ label: 'ปิด', cls: 'btn-ghost' }],
      onOpen: bind,
      onClose: function () { SS.app.refresh(); }
    });
  }

  function permDesc(id) {
    return {
      employee: 'เช็คอิน ยื่นลา ดูข้อมูลตัวเอง',
      manager: 'อนุมัติใบลาของลูกทีม เห็นสถานะรายวันของลูกทีม',
      hr: 'อนุมัติเบี้ยเลี้ยง ดูใบลาทุกคนแบบอ่านอย่างเดียว',
      exec: 'อนุมัติเรื่องที่ต้องขึ้นชั้น ดูรายงานรวม',
      admin: 'ดูแลข้อมูลและการตั้งค่า ไม่ใช่ผู้อนุมัติ'
    }[id] || '';
  }

  function kv(rows) {
    return '<dl class="kv">' + rows.map(function (r) {
      return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>';
  }

  /* ==================================================================
     A3 · เพิ่มพนักงานใหม่ — สามขั้น ไม่ใช่ฟอร์มยาวหน้าเดียว
     ================================================================== */
  function addEmpWizard() {
    var step = 1;
    var d = { name: '', phone: '', birth: '', positionId: '', dept: '', managerId: '', startDate: SS.d.today(), empStatus: 'probation', shift: 'day', makeAccount: true, role: 'employee' };
    var newId = 'EMP-' + (900 + S.get().employees.length + 10);

    function body() {
      var h = '<div class="steps">' + [1, 2, 3].map(function (i) {
        return '<span class="stp' + (step === i ? ' on' : (step > i ? ' done' : '')) + '">' + i + ' ' +
          ['ใครคือคนนี้', 'อยู่ตรงไหนในองค์กร', 'เข้าระบบยังไง'][i - 1] + '</span>'; }).join('') + '</div>';
      if (step === 1) {
        h += '<div class="field"><label>ชื่อ-สกุล <span class="req">*</span></label><input type="text" id="wName" value="' + esc(d.name) + '" placeholder="ชื่อสมมติเท่านั้น ห้ามใส่ชื่อพนักงานจริง"></div>' +
          '<div class="frow"><div class="field"><label>เบอร์โทร</label><input type="text" id="wPhone" value="' + esc(d.phone) + '" placeholder="08x-xxx-xxxx"></div>' +
          '<div class="field"><label>วันเกิด</label><input type="date" id="wBirth" value="' + esc(d.birth) + '"></div></div>';
      }
      if (step === 2) {
        h += '<div class="frow"><div class="field"><label>ตำแหน่ง <span class="req">*</span></label>' +
          '<select id="wPos"><option value="">— เลือก —</option>' + U.options(S.get().positions.filter(function (x) { return x.enabled; }), d.positionId) + '</select></div>' +
          '<div class="field"><label>แผนก <span class="req">*</span></label><select id="wDept"><option value="">— เลือก —</option>' +
          S.get().depts.filter(function (x) { return x.enabled; }).map(function (x) {
            return '<option value="' + x.id + '"' + (d.dept === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div></div>' +
          '<div class="frow"><div class="field"><label>หัวหน้างาน <span class="req">*</span></label><select id="wMgr"><option value="">— เลือก —</option>' +
          S.get().employees.filter(function (x) { return x.active && !x.isTest; }).map(function (x) {
            return '<option value="' + x.id + '"' + (d.managerId === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label>วันเริ่มงาน <span class="req">*</span></label><input type="date" id="wStart" value="' + esc(d.startDate) + '"></div></div>' +
          '<div class="frow"><div class="field"><label>สถานะ</label><select id="wStatus">' +
          SS.EMP_STATUS.filter(function (x) { return x.id !== 'left'; }).map(function (x) {
            return '<option value="' + x.id + '"' + (d.empStatus === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label>กะ</label><select id="wShift"><option value="day">กะปกติ</option><option value="night"' + (d.shift === 'night' ? ' selected' : '') + '>กะกลางคืน</option></select></div></div>';
      }
      if (step === 3) {
        h += '<div class="okbox">รหัสพนักงานที่ระบบออกให้: <b>' + esc(newId) + '</b> — เห็นก่อนกดบันทึก และใช้ซ้ำไม่ได้แม้เจ้าของเดิมพ้นสภาพ (ACC-05)</div>' +
          '<div class="field"><label>สร้างบัญชีผู้ใช้เลยไหม</label><select id="wAcc">' +
          '<option value="1"' + (d.makeAccount ? ' selected' : '') + '>สร้างเลย</option>' +
          '<option value="0"' + (d.makeAccount ? '' : ' selected') + '>ยังไม่สร้าง</option></select></div>' +
          '<div class="field"><label>สิทธิ์</label><select id="wRole">' + U.options(SS.ROLES, d.role) + '</select></div>' +
          '<div class="sect">ตรวจก่อนบันทึก</div>' +
          kv([['ชื่อ', esc(d.name) || '<i class="dimv">ยังไม่กรอก</i>'],
              ['ตำแหน่ง', esc(SS.name(SS.position, d.positionId))],
              ['แผนก', esc(SS.name(SS.dept, d.dept))],
              ['หัวหน้างาน', esc(d.managerId ? (S.employee(d.managerId) || {}).name : '—')],
              ['วันเริ่มงาน', esc(U.date(d.startDate, 'long'))]]) +
          U.note('mock', '<b>ห้ามมีปุ่ม "สร้างบัญชีทดสอบ" หรือ "สร้างผู้ใช้ตัวอย่าง" ในหน้านี้</b> (ACC-12) — ทุกบัญชีต้องผูกกับคนจริงหนึ่งคน');
      }
      return h;
    }

    function grab() {
      if (step === 1) { d.name = $('#wName').value; d.phone = $('#wPhone').value; d.birth = $('#wBirth').value; }
      if (step === 2) {
        d.positionId = $('#wPos').value; d.dept = $('#wDept').value; d.managerId = $('#wMgr').value;
        d.startDate = $('#wStart').value; d.empStatus = $('#wStatus').value; d.shift = $('#wShift').value;
      }
      if (step === 3) { d.makeAccount = $('#wAcc').value === '1'; d.role = $('#wRole').value; }
    }

    function open() {
      U.modal({
        title: 'เพิ่มพนักงานใหม่',
        body: body(),
        buttons: [
          { label: step === 1 ? 'ยกเลิก' : 'ย้อนกลับ', cls: 'btn-ghost', onClick: function () {
              if (step === 1) return;
              grab(); step--; U.closeModal(); open(); return false;
            } },
          { label: step === 3 ? 'บันทึก' : 'ถัดไป', cls: 'btn-accent', onClick: function () {
              grab();
              if (step === 1 && !d.name.trim()) { U.toast('กรุณากรอกชื่อ-สกุล', 'err'); return false; }
              if (step === 2 && (!d.positionId || !d.dept || !d.managerId || !d.startDate)) {
                U.toast('กรอกตำแหน่ง แผนก หัวหน้างาน และวันเริ่มงานให้ครบ', 'err'); return false;
              }
              if (step < 3) { step++; U.closeModal(); open(); return false; }
              var emp = {
                id: newId, name: d.name.trim(), position: SS.name(SS.position, d.positionId),
                positionId: d.positionId, dept: d.dept, rawDept: '',
                managerId: d.managerId, backupApproverId: null, role: d.role, shift: d.shift,
                exemptCheckin: false, startDate: d.startDate,
                probationPassedDate: null, empStatus: d.empStatus,
                isTest: false, active: true, defaultJobType: 'onsite'
              };
              S.get().employees.push(emp);
              S.log('เพิ่มพนักงานใหม่', newId, emp.name + ' · ' + SS.name(SS.position, d.positionId));
              S.emit();
              U.toast('เพิ่ม ' + esc(emp.name) + ' แล้ว · รหัส ' + newId, 'ok');
              SS.app.refresh();
              setTimeout(function () { openProfile(newId, 'work'); }, 250);
            } }
        ]
      });
    }
    open();
  }

  /* ==================================================================
     A7 · ขั้นตอนเมื่อคนพ้นสภาพ — ไม่ใช่แค่เปลี่ยนดรอปดาวน์
     ================================================================== */
  function leaveCompanyModal(e) {
    var team = S.get().employees.filter(function (x) { return x.managerId === e.id && x.active; });
    var pend = S.get().leaves.filter(function (l) {
      return l.status === 'pending' && (S.employee(l.empId) || {}).managerId === e.id;
    });
    var bal = C.buckets(e.id).filter(function (b) { return !b.expired; })
                .reduce(function (a, b) { return a + b.days; }, 0);
    var pick = { mgr: '', appr: '' };

    U.modal({
      title: 'ให้ ' + esc(e.name) + ' พ้นสภาพ',
      body:
        '<div class="field"><label>วันพ้นสภาพ <span class="req">*</span></label><input type="date" id="lvDate" value="' + esc(SS.d.today()) + '"></div>' +
        (team.length
          ? '<div class="issue">⚠ คนนี้เป็นหัวหน้างานของอีก <b>' + team.length + '</b> คน — ต้องเลือกหัวหน้างานคนใหม่ให้ก่อน' +
            '<select id="lvMgr" style="margin-top:8px"><option value="">— เลือกหัวหน้างานคนใหม่ —</option>' +
            S.get().employees.filter(function (x) { return x.active && x.id !== e.id && !x.isTest; })
              .map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></div>'
          : '') +
        (pend.length
          ? '<div class="issue">⚠ มีใบลารออนุมัติที่รอเขาอยู่ <b>' + pend.length + '</b> ใบ — จะโอนไปให้ใคร' +
            '<select id="lvAppr" style="margin-top:8px"><option value="">— เลือกผู้รับโอน —</option>' +
            S.get().employees.filter(function (x) { return x.active && x.id !== e.id && !x.isTest && (x.role === 'manager' || x.role === 'hr' || x.role === 'exec'); })
              .map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></div>'
          : '') +
        (bal ? '<div class="warnbox">⚠ ยอดวันลาคงเหลือ <b>' + U.num(bal) + '</b> วัน — บันทึกไว้ให้ฝ่ายบุคคลจัดการนอกระบบ</div>' : '') +
        U.note('mock', '<b>กดยืนยันผ่านไม่ได้ถ้ายังไม่เคลียร์สองข้อแรก</b> ไม่งั้นใบลาค้างอยู่กับคนที่ไม่อยู่แล้ว (ACC-16) · ' +
          'ข้อมูลเก่าของคนนี้ยังอยู่ครบ ไม่มีการลบ (J5)'),
      buttons: [
        { label: 'ยกเลิก', cls: 'btn-ghost', onClick: function () { SS.app.refresh(); } },
        { label: 'ยืนยัน', cls: 'btn-danger', onClick: function () {
            pick.mgr = $('#lvMgr') ? $('#lvMgr').value : '';
            pick.appr = $('#lvAppr') ? $('#lvAppr').value : '';
            if (team.length && !pick.mgr) { U.toast('ต้องเลือกหัวหน้างานคนใหม่ให้ลูกทีมก่อน', 'err'); return false; }
            if (pend.length && !pick.appr) { U.toast('ต้องเลือกผู้รับโอนใบลาที่ค้างก่อน', 'err'); return false; }
            team.forEach(function (x) { S.setEmployee(x.id, { managerId: pick.mgr }); });
            S.setEmployee(e.id, { empStatus: 'left', active: false, leftDate: $('#lvDate').value });
            S.log('ให้พนักงานพ้นสภาพ', e.id, 'วันพ้นสภาพ ' + $('#lvDate').value +
              (team.length ? ' · ย้ายลูกทีม ' + team.length + ' คนไปที่ ' + (S.employee(pick.mgr) || {}).name : '') +
              (pend.length ? ' · โอนใบลาค้าง ' + pend.length + ' ใบไปที่ ' + (S.employee(pick.appr) || {}).name : ''));
            S.emit();
            U.toast('บันทึกการพ้นสภาพแล้ว · ข้อมูลเก่ายังอยู่ครบ ไม่มีการลบ', 'ok');
            SS.app.refresh();
          } }
      ]
    });
  }

  /* ==================================================================
     A5 · หน้าเตือนข้อมูลไม่ครบ (ACC-13)
     หน้ารวมงานค้างของฝ่ายบุคคล ไม่ใช่ป๊อปอัปกวนตอนล็อกอิน
     ================================================================== */
  SS.views.staffgaps = function (host) {
    var emps = S.get().employees.filter(function (e) { return !e.isTest && e.active; });
    var items = [
      { key: 'pos', label: 'ตำแหน่งงานยังว่าง', rows: emps.filter(function (e) { return !e.positionId; }) },
      { key: 'dept', label: 'แผนกยังเป็นข้อความอิสระ ต้องกาให้ตรง', rows: emps.filter(function (e) { return !e.dept; }) },
      { key: 'start', label: 'วันเริ่มงานยังว่าง', rows: emps.filter(function (e) { return !e.startDate; }) },
      { key: 'prob', label: 'ยังไม่บันทึกวันที่ผ่านการประเมิน', rows: emps.filter(function (e) { return !e.probationPassedDate; }) },
      { key: 'backup', label: 'ยังไม่ได้ตั้งผู้อนุมัติสำรอง', rows: emps.filter(function (e) { return !e.backupApproverId; }) }
    ];
    var sys = [
      { label: 'ยังไม่มีใครถือสิทธิ์ผู้บริหาร', bad: S.byRole('exec').length === 0, note: S.byRole('exec').length + ' คน' },
      { label: 'ฝ่ายบุคคลมีคนเดียว ยังไม่มีผู้สำรอง', bad: S.byRole('hr').length < 2, note: S.byRole('hr').length + ' คน' }
    ];

    var h = '<div class="card"><div class="chead"><h2>ข้อมูลที่ต้องเติมให้ครบ</h2>' +
      '<span class="sub">A5 · ACC-13 — หน้ารวมงานค้างของฝ่ายบุคคล</span></div>' +
      '<div class="tw"><table class="t"><tbody>';
    items.forEach(function (it) {
      h += '<tr class="' + (it.rows.length ? 'clickrow' : '') + '"' + (it.rows.length ? ' data-gap="' + it.key + '"' : '') + '>' +
        '<td>' + esc(it.label) + '</td>' +
        '<td class="n">' + (it.rows.length ? '<b>' + it.rows.length + '</b> คน' : U.pill('pill-green', 'ครบแล้ว')) + '</td>' +
        '<td style="text-align:right">' + (it.rows.length ? '→' : '') + '</td></tr>';
    });
    sys.forEach(function (x) {
      h += '<tr><td>' + esc(x.label) + '</td><td class="n">' +
        (x.bad ? U.pill('pill-red', x.note) : U.pill('pill-green', x.note)) + '</td><td></td></tr>';
    });
    h += '</tbody></table></div>' +
      U.note('mock', 'กดแต่ละบรรทัดแล้วไปที่รายการที่กรองไว้แล้ว <b>ไม่ใช่ไปหน้ารวมแล้วให้ค้นเอง</b> · ' +
        'หน้านี้เป็นเรื่องข้อมูลรายคน ส่วนเรื่องโครงสร้างอยู่ที่หน้า "ความผิดปกติของโครงสร้าง" (O5) คนละหน้า') + '</div>';

    /* รายชื่อของแต่ละกลุ่ม */
    items.forEach(function (it) {
      if (!it.rows.length) return;
      h += '<div class="card" id="gap-' + it.key + '"><div class="chead"><h2>' + esc(it.label) + '</h2>' +
        '<span class="sp"></span><span class="sub">' + it.rows.length + ' คน</span></div>' +
        '<div class="tw"><table class="t"><tbody>' +
        it.rows.map(function (e) {
          return '<tr class="clickrow" data-emp2="' + e.id + '"><td>' + U.person(e, SS.name(SS.dept, e.dept)) + '</td>' +
            '<td>' + (e.rawDept ? '<small>ค่าเดิม: ' + esc(e.rawDept) + '</small>' : '') + '</td>' +
            '<td style="text-align:right"><button class="btn btn-ghost btn-sm">เปิดโปรไฟล์</button></td></tr>'; }).join('') +
        '</tbody></table></div></div>';
    });

    host.innerHTML = h;
    $$('[data-gap]').forEach(function (r) {
      r.addEventListener('click', function () {
        var el = $('#gap-' + r.getAttribute('data-gap'));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    $$('[data-emp2]').forEach(function (r) {
      r.addEventListener('click', function () { openProfile(r.getAttribute('data-emp2'), 'work'); });
    });
  };

  /* ==================================================================
     A6 · ดูในมุมมองของบทบาทอื่น (ACC-19) — อ่านอย่างเดียว
     ไม่ใช่ตัวสลับผู้ใช้ของต้นแบบ · อันนี้เป็นของระบบจริง
     ================================================================== */
  SS.views.viewas = function (host) {
    var h = '<div class="card"><div class="chead"><h2>ดูในมุมมองของบทบาทอื่น</h2>' +
      '<span class="sub">A6 · ACC-19 — อ่านอย่างเดียว</span></div>' +
      '<p style="font-size:14px;line-height:1.75">เลือกบทบาทแล้วหน้าจอเปลี่ยนเป็นสิ่งที่บทบาทนั้นเห็น ' +
      '<b>มีแถบสีค้างบนสุดตลอดเวลา</b> ว่ากำลังดูในมุมมองใคร กดออกได้ตลอด และกดอะไรที่เปลี่ยนข้อมูลไม่ได้เลยสักปุ่ม ' +
      'เข้าโหมดนี้ลง audit log ทุกครั้ง</p>' +
      '<div class="choices">' + SS.ROLES.map(function (r) {
        return '<button class="btn btn-ghost" data-viewas="' + r.id + '">' + esc(r.name) + '</button>'; }).join('') + '</div>' +
      U.note('mock', '<b>เป็นมาตรการคู่กับกติกาห้ามสร้างบัญชีทดสอบ</b> — บัญชีจริงของผู้บริหารถือสิทธิ์แอดมินซึ่งเห็นทุกอย่าง ' +
        'จึงทดสอบไม่ได้ว่าพนักงานทั่วไปเห็นหน้าจอแบบไหน ถ้าห้ามสร้างบัญชีทดสอบโดยไม่ให้ทางเลือกอื่น กติกาจะถูกฝ่าฝืนอีก') +
      U.note('cant', '<b>ต้นแบบทดสอบข้อนี้ไม่ได้ตรง ๆ</b> — ต้นแบบมีตัวสลับผู้ใช้อยู่แล้วซึ่งเป็นคนละอย่าง ' +
        'ตัวสลับผู้ใช้เป็นของต้นแบบเท่านั้นและแก้ข้อมูลได้ ส่วน ACC-19 เป็นของระบบจริงและอ่านอย่างเดียว · ' +
        'กดปุ่มด้านบนแล้วจะเห็นแค่ audit log ที่บันทึกไว้') + '</div>';

    var logs = S.get().audit.filter(function (a) { return a.action === 'เข้าโหมดดูมุมมองบทบาทอื่น'; }).slice().reverse();
    h += '<div class="card"><div class="chead"><h2>บันทึกการเข้าโหมดนี้</h2></div>' +
      (logs.length
        ? '<div class="tw"><table class="t"><tbody>' + logs.map(function (a) {
            return '<tr><td><small>' + esc(String(a.at).replace('T', ' ').slice(0, 16)) + '</small></td>' +
              '<td>' + esc(a.byName || a.by) + '</td><td>' + esc(a.detail) + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : U.empty('ยังไม่มีใครเข้าโหมดนี้')) + '</div>';

    host.innerHTML = h;
    $$('[data-viewas]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = b.getAttribute('data-viewas');
        S.log('เข้าโหมดดูมุมมองบทบาทอื่น', S.user().id, 'ดูในมุมมอง ' + SS.name(SS.role, r));
        S.emit();
        U.toast('บันทึกการเข้าโหมดดูมุมมอง ' + esc(SS.name(SS.role, r)) + ' ลง audit log แล้ว', 'ok');
        SS.app.refresh();
      });
    });
  };

  /* ==================================================================
     A4 · หน้าโปรไฟล์ของตัวเอง — พนักงานทั่วไปเห็นหน้านี้ (ACC-10)
     คนละหน้ากับ A2 · สั้นกว่ามาก · ไม่มีอะไรเกี่ยวกับสิทธิ์
     ================================================================== */
  SS.views.myprofile = function (host) {
    var e = S.user();
    var h = '<div class="card"><div class="chead"><h2>ข้อมูลของฉัน</h2>' +
      '<span class="sub">A4 · ACC-10 — แก้ได้เฉพาะช่องของตัวเอง</span></div>' +
      '<div class="frow">' +
      '<div class="field"><label>ชื่อเล่น</label><input type="text" id="myNick" placeholder="แก้ได้เอง"></div>' +
      '<div class="field"><label>เบอร์โทร</label><input type="text" id="myPhone" placeholder="08x-xxx-xxxx"></div>' +
      '</div><div class="frow">' +
      '<div class="field"><label>อีเมล</label><input type="text" id="myMail" placeholder="ชื่อ@example.com"></div>' +
      '<div class="field"><label>รหัสผ่านของตัวเอง</label><button class="btn btn-ghost btn-block" id="myPwd">เปลี่ยนรหัสผ่าน</button></div>' +
      '</div>' +
      '<div class="sect">อ่านอย่างเดียว</div>' +
      kv([['รหัสพนักงาน', esc(e.id)],
          ['ตำแหน่ง', e.positionId ? esc(SS.name(SS.position, e.positionId)) : '<i class="dimv">ยังไม่ระบุ — ติดต่อฝ่ายบุคคล</i>'],
          ['แผนก', e.dept ? esc(SS.name(SS.dept, e.dept)) : '<i class="dimv">ยังไม่จัด</i>'],
          ['หัวหน้างาน', esc(e.managerId ? (S.employee(e.managerId) || {}).name : '—')],
          ['วันเริ่มงาน', esc(e.startDate ? U.date(e.startDate, 'long') : '—')],
          ['สถานะ', statusPill(e)]]) +
      U.note('mock', '<b>ไม่มีอะไรเกี่ยวกับสิทธิ์ในหน้านี้</b> — พนักงานไม่ต้องเห็นว่าตัวเองถือสิทธิ์อะไร (ACC-10)') + '</div>';

    /* เห็นโควตาของตัวเอง แต่ไม่มีปุ่มขอแก้ */
    h += '<div class="card"><div class="chead"><h2>โควตาวันลาของฉัน</h2><span class="sp"></span>' + U.ref('ACC-10') + '</div>' +
      '<div class="tw"><table class="t"><thead><tr><th>ประเภท</th><th class="n">ปีนี้</th><th class="n">ใช้ไป</th><th class="n">คงเหลือ</th></tr></thead><tbody>' +
      ['LT-ANNUAL', 'LT-PERSONAL', 'LT-SICK', 'LT-COMP'].map(function (t) {
        var q = C.quota(e.id, t);
        return '<tr><td>' + esc(SS.name(SS.leaveType, t)) + '</td>' +
          '<td class="n">' + (q.total === null ? 'ไม่จำกัด' : U.num(q.total)) + '</td>' +
          '<td class="n">' + U.num(q.used) + '</td>' +
          '<td class="n">' + (q.remaining === null ? '—' : U.num(q.remaining)) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
      U.note('mock', 'เห็นโควตาของตัวเองได้ <b>แต่ไม่มีปุ่มขอแก้</b> — การขอแก้โควตาเป็นเรื่องของฝ่ายบุคคลและต้องผ่านผู้บริหาร') + '</div>';

    host.innerHTML = h;
    $('#myPwd').addEventListener('click', function () {
      U.toast('ต้นแบบไม่มีระบบล็อกอินจริง จึงเปลี่ยนรหัสผ่านไม่ได้', 'err');
    });
  };

  /* ==================================================================
     O1 · ตั้งค่าโครงสร้างองค์กร — บริษัท → ฝ่าย → แผนก
     ================================================================== */
  SS.views.org = function (host) {
    var db = S.get();
    var unassigned = db.employees.filter(function (e) { return !e.isTest && e.active && !e.dept; });

    var h = '<div class="card"><div class="chead"><h2>โครงสร้างองค์กร</h2>' +
      '<span class="sub">O1 · สามชั้น บริษัท → ฝ่าย → แผนก</span><span class="sp"></span>' +
      '<button class="btn btn-ghost btn-sm" id="oAddDiv">+ เพิ่มฝ่าย</button>' +
      '<button class="btn btn-accent btn-sm" id="oAddDep">+ เพิ่มแผนก</button></div>' +
      '<div class="orgtree"><div class="orgco">' + esc(SS.COMPANY) + '</div>';

    db.divisions.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (d) {
      var n = S.orgCount('division', d.id);
      h += '<div class="orgdiv' + (d.enabled ? '' : ' off') + '">' +
        '<div class="orgrow"><b>' + esc(d.name) + '</b>' +
        (d.enabled ? '' : ' ' + U.pill('pill-gray', 'ปิดใช้งาน')) +
        '<span class="sp"></span><span class="cnt' + (n ? ' clickcnt' : '') + '"' + (n ? ' data-list="div:' + d.id + '"' : '') + '>' + n + ' คน</span>' +
        '<button class="btn btn-ghost btn-sm" data-omenu="division:' + d.id + '">⋮</button></div>';
      db.depts.filter(function (x) { return x.divisionId === d.id; })
        .sort(function (a, b) { return a.order - b.order; }).forEach(function (x) {
          var m = S.orgCount('dept', x.id);
          h += '<div class="orgdep' + (x.enabled ? '' : ' off') + '">' +
            '<div class="orgrow">• ' + esc(x.name) + (x.enabled ? '' : ' ' + U.pill('pill-gray', 'ปิด')) +
            '<span class="sp"></span><span class="cnt' + (m ? ' clickcnt' : '') + '"' + (m ? ' data-list="dept:' + x.id + '"' : '') + '>' + m + ' คน</span>' +
            '<button class="btn btn-ghost btn-sm" data-omenu="dept:' + x.id + '">⋮</button></div></div>';
        });
      h += '</div>';
    });

    /* แถวล่างสุดต้องมีเสมอ แม้เป็นศูนย์ — เป็นตัวบอกว่าล้างข้อมูลเสร็จหรือยัง */
    h += '<div class="orgdiv' + (unassigned.length ? ' bad' : '') + '"><div class="orgrow">' +
      '<b>⚠ ยังไม่ได้จัดฝ่าย/แผนก</b><span class="sp"></span>' +
      '<span class="cnt' + (unassigned.length ? ' clickcnt' : '') + '"' + (unassigned.length ? ' data-list="none:"' : '') + '>' +
      unassigned.length + ' คน</span></div></div>';

    h += '</div>' + U.note('mock', 'ตัวเลขคนเป็นจำนวนจริงและกดเข้าไปดูรายชื่อได้ · เมนู ⋮ มี เปลี่ยนชื่อ · ย้าย · ปิดการใช้งาน <b>ไม่มีลบ</b> · ' +
      '<b>ปิดฝ่ายที่ยังมีคนอยู่ไม่ได้</b> ต้องย้ายคนออกก่อน · โครงสร้างชุดนี้เป็นของสมมติ ของจริงต้องให้ฝ่ายบุคคลกรอกเอง') + '</div>';

    host.innerHTML = h;

    $$('[data-list]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-list').split(':'), kind = v[0], id = v[1];
        var rows = S.get().employees.filter(function (e) {
          if (e.isTest || !e.active) return false;
          if (kind === 'dept') return e.dept === id;
          if (kind === 'none') return !e.dept;
          var d = S.get().depts.filter(function (x) { return x.id === e.dept; })[0];
          return d && d.divisionId === id;
        });
        U.modal({
          title: kind === 'none' ? 'คนที่ยังไม่ได้จัดฝ่าย/แผนก' : 'รายชื่อใน ' + (kind === 'dept' ? SS.name(SS.dept, id) : SS.name(SS.division, id)),
          body: rows.length
            ? '<div class="tw"><table class="t"><tbody>' + rows.map(function (e) {
                return '<tr><td>' + U.person(e, e.positionId ? SS.name(SS.position, e.positionId) : 'ยังไม่ระบุตำแหน่ง') + '</td>' +
                  '<td>' + (e.rawDept ? '<small>ค่าเดิม: ' + esc(e.rawDept) + '</small>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
            : U.empty('ไม่มีคนในกลุ่มนี้'),
          buttons: [{ label: 'ปิด', cls: 'btn-ghost' }]
        });
      });
    });

    $$('[data-omenu]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-omenu').split(':'), kind = v[0], id = v[1];
        var list = kind === 'division' ? S.get().divisions : S.get().depts;
        var row = list.filter(function (x) { return x.id === id; })[0];
        U.modal({
          title: (kind === 'division' ? 'ฝ่าย' : 'แผนก') + ' · ' + esc(row.name),
          body: '<div class="field"><label>ชื่อ</label><input type="text" id="oName" value="' + esc(row.name) + '"></div>' +
            (kind === 'dept'
              ? '<div class="field"><label>อยู่ใต้ฝ่าย</label><select id="oDiv">' +
                U.options(S.get().divisions, row.divisionId) + '</select></div>' : '') +
            '<div class="hint">มีคนอยู่ ' + S.orgCount(kind, id) + ' คน — ปิดการใช้งานได้เมื่อไม่มีคนเหลือ</div>',
          buttons: [
            { label: 'ปิดหน้าต่าง', cls: 'btn-ghost' },
            { label: row.enabled ? 'ปิดการใช้งาน' : 'เปิดใช้งาน', cls: 'btn-danger', onClick: function () {
                var r = S.disableOrgUnit(kind, id);
                if (!r.ok) { U.toast(r.msg || 'ทำไม่ได้', 'err'); return false; }
                U.toast('บันทึกแล้ว', 'ok'); SS.app.refresh();
              } },
            { label: 'บันทึก', cls: 'btn-accent', onClick: function () {
                var r = S.renameOrgUnit(kind, id, $('#oName').value);
                if (!r.ok) { U.toast(r.msg || 'ทำไม่ได้', 'err'); return false; }
                if (kind === 'dept' && $('#oDiv')) S.moveDept(id, $('#oDiv').value);
                U.toast('บันทึกแล้ว', 'ok'); SS.app.refresh();
              } }
          ]
        });
      });
    });

    $('#oAddDiv').addEventListener('click', function () { addOrgModal('division'); });
    $('#oAddDep').addEventListener('click', function () { addOrgModal('dept'); });
  };

  function addOrgModal(kind) {
    U.modal({
      title: kind === 'division' ? 'เพิ่มฝ่าย' : 'เพิ่มแผนก',
      body: '<div class="field"><label>ชื่อ <span class="req">*</span></label><input type="text" id="nName" placeholder="' +
        (kind === 'division' ? 'เช่น ฝ่ายจัดซื้อ' : 'เช่น แผนกซ่อมบำรุง') + '"></div>' +
        (kind === 'dept' ? '<div class="field"><label>อยู่ใต้ฝ่าย</label><select id="nDiv">' +
          U.options(S.get().divisions.filter(function (d) { return d.enabled; })) + '</select></div>' : ''),
      buttons: [
        { label: 'ยกเลิก', cls: 'btn-ghost' },
        { label: 'เพิ่ม', cls: 'btn-accent', onClick: function () {
            var r = S.addOrgUnit(kind, { name: $('#nName').value, divisionId: $('#nDiv') ? $('#nDiv').value : null });
            if (!r.ok) { U.toast(r.msg, 'err'); return false; }
            U.toast('เพิ่มแล้ว', 'ok'); SS.app.refresh();
          } }
      ]
    });
  }

  /* ==================================================================
     O2 · ตั้งค่าตำแหน่งงาน
     ================================================================== */
  SS.views.positions = function (host) {
    var h = '<div class="card"><div class="chead"><h2>ตำแหน่งงาน</h2><span class="sp"></span>' +
      '<button class="btn btn-accent btn-sm" id="pAdd">+ เพิ่มตำแหน่ง</button></div>' +
      '<div class="bigwarn">ตำแหน่งไม่ให้สิทธิ์ — สิทธิ์อยู่ที่แท็บสิทธิ์ในโปรไฟล์พนักงาน</div>' +
      '<div class="tw"><table class="t"><thead><tr><th>ชื่อตำแหน่ง</th><th>ระดับ</th><th class="n">ใช้อยู่</th><th>สถานะ</th><th></th></tr></thead><tbody>';
    S.get().positions.forEach(function (p) {
      var n = S.orgCount('position', p.id);
      h += '<tr' + (p.enabled ? '' : ' style="opacity:.55"') + '><td><b>' + esc(p.name) + '</b></td>' +
        '<td>' + esc(SS.name(SS.posLevel, p.level)) + '</td>' +
        '<td class="n">' + (n ? '<button class="btn btn-ghost btn-sm" data-plist="' + p.id + '">' + n + ' คน</button>' : '0 คน') + '</td>' +
        '<td>' + (p.enabled ? U.pill('pill-green', 'ใช้งาน') : U.pill('pill-gray', 'ปิดแล้ว')) + '</td>' +
        '<td style="text-align:right"><button class="btn btn-ghost btn-sm" data-ptog="' + p.id + '">' +
          (p.enabled ? 'ปิดการใช้งาน' : 'เปิดใช้งาน') + '</button></td></tr>';
    });
    h += '</tbody></table></div>' +
      U.note('mock', 'ช่อง <b>ระดับ</b> ใช้จัดกลุ่มในรายงานและในผังเท่านั้น ไม่ได้ให้สิทธิ์อะไร · ' +
        'ตำแหน่งที่เลิกใช้ให้ปิด <b>ไม่ลบ</b> เพราะข้อมูลเก่าอ้างอยู่ · ตำแหน่งที่ยังมีคนถืออยู่ปิดไม่ได้') + '</div>';
    host.innerHTML = h;

    $$('[data-ptog]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = S.togglePosition(b.getAttribute('data-ptog'));
        if (!r.ok) { U.toast(r.msg || 'ทำไม่ได้', 'err'); return; }
        U.toast('บันทึกแล้ว', 'ok'); SS.app.refresh();
      });
    });
    $$('[data-plist]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-plist');
        var rows = S.get().employees.filter(function (e) { return e.positionId === id && e.active && !e.isTest; });
        U.modal({ title: 'คนที่ถือตำแหน่ง ' + SS.name(SS.position, id),
          body: '<div class="tw"><table class="t"><tbody>' + rows.map(function (e) {
            return '<tr><td>' + U.person(e, SS.name(SS.dept, e.dept)) + '</td></tr>'; }).join('') + '</tbody></table></div>',
          buttons: [{ label: 'ปิด', cls: 'btn-ghost' }] });
      });
    });
    $('#pAdd').addEventListener('click', function () {
      U.modal({
        title: 'เพิ่มตำแหน่งงาน',
        body: '<div class="field"><label>ชื่อตำแหน่ง <span class="req">*</span></label><input type="text" id="npName"></div>' +
          '<div class="field"><label>ระดับ</label><select id="npLevel">' + U.options(SS.POSITION_LEVELS) + '</select>' +
          '<div class="hint">ใช้จัดกลุ่มในรายงานเท่านั้น ไม่ให้สิทธิ์</div></div>',
        buttons: [{ label: 'ยกเลิก', cls: 'btn-ghost' },
          { label: 'เพิ่ม', cls: 'btn-accent', onClick: function () {
              var r = S.addPosition({ name: $('#npName').value, level: $('#npLevel').value });
              if (!r.ok) { U.toast(r.msg, 'err'); return false; }
              U.toast('เพิ่มตำแหน่งแล้ว', 'ok'); SS.app.refresh();
            } }]
      });
    });
  };

  /* ==================================================================
     O3 · หน้าล้างข้อมูลเดิม (ACC-07) — ใช้ครั้งเดียวแล้วเลิก
     ให้คนกาเอง ห้ามแปลงอัตโนมัติ
     ================================================================== */
  SS.views.orgclean = function (host) {
    var emps = S.get().employees.filter(function (e) { return !e.isTest; });
    var need = emps.filter(function (e) { return !e.dept || !e.positionId; });
    var done = emps.length - need.length;
    var pct = Math.round(done / emps.length * 100);

    var h = '<div class="card"><div class="chead"><h2>จับคู่ข้อมูลเดิม</h2>' +
      '<span class="sub">O3 · ACC-07 — ใช้ครั้งเดียวแล้วเลิก</span><span class="sp"></span>' +
      '<b>เสร็จแล้ว ' + done + ' / ' + emps.length + '</b></div>' +
      '<div class="prog"><i style="width:' + pct + '%"></i></div>' +
      '<div class="hint" style="margin-bottom:14px">แถบความคืบหน้าต้องเห็นชัด เพราะงานนี้ทำครั้งเดียวแต่ยาว · บันทึกทีละแถวได้ ปิดหน้ากลางคันแล้วกลับมาทำต่อได้</div>';

    if (!need.length) {
      h += U.empty('ล้างข้อมูลครบทุกคนแล้ว', 'หน้านี้ใช้ครั้งเดียว เมื่อครบแล้วเลิกใช้ได้');
    } else {
      h += '<div class="tw"><table class="t"><thead><tr><th>ชื่อ</th><th>ค่าเดิมในระบบ</th><th>ฝ่าย/แผนก</th><th>ตำแหน่ง</th></tr></thead><tbody>';
      need.forEach(function (e) {
        h += '<tr><td>' + esc(e.name) + '<br><small class="dimv">' + esc(e.id) + '</small></td>' +
          /* ต้องแสดงค่าเดิมไว้ข้าง ๆ ตลอด ไม่งั้นคนกาไม่รู้ว่ากำลังแปลงอะไรเป็นอะไร */
          '<td><code class="raw">' + esc(e.rawDept || e.position || '(ว่าง)') + '</code></td>' +
          '<td><select data-cdept="' + e.id + '"><option value="">— เลือก —</option>' +
            S.get().depts.filter(function (x) { return x.enabled; }).map(function (x) {
              return '<option value="' + x.id + '"' + (e.dept === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') +
          '</select></td>' +
          '<td><select data-cpos="' + e.id + '"><option value="">— เลือก —</option>' +
            S.get().positions.filter(function (x) { return x.enabled; }).map(function (x) {
              return '<option value="' + x.id + '"' + (e.positionId === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') +
          '</select></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += U.note('mock', '<b>ห้ามมีปุ่ม "จับคู่อัตโนมัติ" หรือ "เดาให้"</b> — <code>Project Manager</code> 13 คนอาจไม่ใช่ตำแหน่งจริงสักคน ระบบไม่มีทางรู้ · ' +
      'ค่าเดิมยังเก็บไว้คู่กับค่าใหม่จนกว่าจะยืนยันว่าเสร็จ') + '</div>';

    host.innerHTML = h;
    $$('[data-cdept]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var id = sel.getAttribute('data-cdept');
        S.setEmployee(id, { dept: this.value || null });
        U.toast('บันทึกแผนกของ ' + esc((S.employee(id) || {}).name) + ' แล้ว', 'ok');
        SS.app.refresh();
      });
    });
    $$('[data-cpos]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var id = sel.getAttribute('data-cpos');
        S.setEmployee(id, { positionId: this.value || null });
        U.toast('บันทึกตำแหน่งของ ' + esc((S.employee(id) || {}).name) + ' แล้ว', 'ok');
        SS.app.refresh();
      });
    });
  };

  /* ==================================================================
     O4 · Organization Chart — สลับสองมุมมองได้
     ผังนี้เป็นภาพสะท้อนของข้อมูลในโปรไฟล์ ไม่ใช่ที่แก้ข้อมูล
     ================================================================== */
  var chartMode = 'org', chartShowLeft = false;

  SS.views.orgchart = function (host) {
    var emps = S.get().employees.filter(function (e) {
      return !e.isTest && (chartShowLeft || e.active);
    });

    var h = '<div class="card"><div class="chead"><h2>ผังองค์กร</h2>' +
      '<span class="sub">O4 · สลับสองมุมมองได้ เพราะสองอย่างนี้ไม่จำเป็นต้องตรงกัน</span></div>' +
      '<div class="choices" style="margin-bottom:14px">' +
      '<label class="choice' + (chartMode === 'org' ? ' on' : '') + '"><input type="radio" name="cm" value="org"' + (chartMode === 'org' ? ' checked' : '') + '> ตามฝ่าย/แผนก</label>' +
      '<label class="choice' + (chartMode === 'line' ? ' on' : '') + '"><input type="radio" name="cm" value="line"' + (chartMode === 'line' ? ' checked' : '') + '> ตามสายหัวหน้างาน</label>' +
      '<label class="choice' + (chartShowLeft ? ' on' : '') + '"><input type="checkbox" id="cmLeft"' + (chartShowLeft ? ' checked' : '') + '> แสดงคนพ้นสภาพด้วย</label>' +
      '</div>';

    h += '<div class="bigwarn">Reporting Line ไม่ใช่สายอนุมัติ — ใบลาไปหัวหน้างาน เบี้ยเลี้ยงไปฝ่ายบุคคล ผู้อนุมัติผูกกับเรื่อง ไม่ผูกกับสายบังคับบัญชา</div>';

    if (chartMode === 'org') {
      h += '<div class="chart">';
      h += '<div class="cbox croot">' + esc(SS.COMPANY) + '</div><div class="cfan">';
      S.get().divisions.filter(function (d) { return d.enabled; }).forEach(function (d) {
        var n = S.orgCount('division', d.id);
        h += '<div class="cbranch"><div class="cbox" data-cbox="div:' + d.id + '"><b>' + esc(d.name) + '</b><span>' + n + ' คน</span></div>';
        var deps = S.get().depts.filter(function (x) { return x.divisionId === d.id && x.enabled; });
        if (deps.length) {
          h += '<div class="cfan sub">' + deps.map(function (x) {
            return '<div class="cbox small" data-cbox="dept:' + x.id + '">' + esc(x.name) + '<span>' + S.orgCount('dept', x.id) + ' คน</span></div>';
          }).join('') + '</div>';
        }
        h += '</div>';
      });
      h += '</div></div>';
    } else {
      /* ผังตามสายหัวหน้างาน */
      var roots = emps.filter(function (e) { return !e.managerId; });
      function node(e, depth) {
        if (depth > 6) return '';
        var kids = emps.filter(function (x) { return x.managerId === e.id; });
        return '<div class="lnode"><div class="cbox small" data-cbox="emp:' + e.id + '">' +
          '<b>' + esc(e.name) + '</b><span>' + esc(e.positionId ? SS.name(SS.position, e.positionId) : 'ยังไม่ระบุตำแหน่ง') + '</span>' +
          (kids.length ? '<span>ลูกทีม ' + kids.length + ' คน</span>' : '') +
          (!e.active ? ' ' + U.pill('pill-gray', 'พ้นสภาพ') : '') + '</div>' +
          (kids.length ? '<div class="lkids">' + kids.map(function (k) { return node(k, depth + 1); }).join('') + '</div>' : '') +
          '</div>';
      }
      h += '<div class="chart line">' + (roots.length ? roots.map(function (r) { return node(r, 0); }).join('') : U.empty('ไม่มีใครอยู่บนสุดของสาย')) + '</div>';
    }

    /* ต้องเห็นความผิดปกติจากผัง */
    var iss = C.orgIssues().filter(function (i) { return i.rows.length; });
    h += '<div class="sect">ความผิดปกติที่เห็นจากผัง</div>';
    if (!iss.length) h += U.empty('ไม่พบความผิดปกติ');
    else h += '<div class="tw"><table class="t"><tbody>' + iss.map(function (i) {
      return '<tr><td>' + esc(i.label) + '</td><td class="n"><b>' + i.rows.length + '</b> ' + i.unit + '</td>' +
        '<td><small>' + esc(i.rows.slice(0, 4).map(function (r) { return r.name; }).join(' · ')) +
        (i.rows.length > 4 ? ' และอีก ' + (i.rows.length - 4) : '') + '</small></td></tr>'; }).join('') + '</tbody></table></div>';

    h += U.note('mock', 'ผังนี้เป็น <b>ภาพสะท้อน</b> ของข้อมูลในโปรไฟล์ ไม่ใช่ที่แก้ข้อมูล — ถ้าจะให้ลากย้ายคนได้ ต้องเป็นการเปลี่ยนช่องหัวหน้างานในโปรไฟล์จริง ๆ พร้อม audit log') +
      U.note('cant', 'การพิมพ์หรือบันทึกผังเป็นภาพ ยังไม่ได้ทำในต้นแบบ') + '</div>';

    host.innerHTML = h;
    $$('[name=cm]').forEach(function (r) {
      r.addEventListener('change', function () { chartMode = this.value; SS.app.refresh(); });
    });
    $('#cmLeft').addEventListener('change', function () { chartShowLeft = this.checked; SS.app.refresh(); });
    $$('[data-cbox]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-cbox').split(':'), kind = v[0], id = v[1];
        if (kind === 'emp') { openProfile(id, 'work'); return; }
        var rows = S.get().employees.filter(function (e) {
          if (e.isTest || !e.active) return false;
          if (kind === 'dept') return e.dept === id;
          var d = S.get().depts.filter(function (x) { return x.id === e.dept; })[0];
          return d && d.divisionId === id;
        });
        U.modal({ title: 'คนใน ' + (kind === 'dept' ? SS.name(SS.dept, id) : SS.name(SS.division, id)),
          body: rows.length ? '<div class="tw"><table class="t"><tbody>' + rows.map(function (e) {
            return '<tr class="clickrow" data-emp3="' + e.id + '"><td>' + U.person(e, e.positionId ? SS.name(SS.position, e.positionId) : 'ยังไม่ระบุตำแหน่ง') + '</td></tr>'; }).join('') + '</tbody></table></div>'
            : U.empty('ยังไม่มีคนในกล่องนี้'),
          buttons: [{ label: 'ปิด', cls: 'btn-ghost' }],
          onOpen: function () {
            $$('[data-emp3]').forEach(function (r) {
              r.addEventListener('click', function () { U.closeModal(); openProfile(r.getAttribute('data-emp3'), 'work'); });
            });
          } });
      });
    });
  };

  /* ==================================================================
     O5 · หน้ารวมความผิดปกติของโครงสร้าง
     คนละหน้ากับ A5 อย่ารวมกัน
     ================================================================== */
  SS.views.orgissues = function (host) {
    var iss = C.orgIssues();
    var h = '<div class="card"><div class="chead"><h2>สิ่งที่ต้องแก้ในโครงสร้าง</h2>' +
      '<span class="sub">O5 · เรื่องโครงสร้าง ไม่ใช่เรื่องข้อมูลรายคน</span></div>' +
      '<div class="tw"><table class="t"><tbody>' +
      iss.map(function (i) {
        return '<tr class="' + (i.rows.length ? 'clickrow' : '') + '"' + (i.rows.length ? ' data-iss="' + i.key + '"' : '') + '>' +
          '<td>' + esc(i.label) + '</td>' +
          '<td class="n">' + (i.rows.length ? '<b>' + i.rows.length + '</b> ' + i.unit : U.pill('pill-green', 'ไม่มี')) + '</td>' +
          '<td style="text-align:right">' + (i.rows.length ? '→' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
      U.note('mock', 'หน้านี้กับหน้า "ข้อมูลไม่ครบ" (A5) <b>เป็นคนละหน้า อย่ารวมกัน</b> — A5 เป็นเรื่องข้อมูลรายคน หน้านี้เป็นเรื่องโครงสร้าง') + '</div>';

    iss.filter(function (i) { return i.rows.length; }).forEach(function (i) {
      h += '<div class="card" id="iss-' + i.key + '"><div class="chead"><h2>' + esc(i.label) + '</h2>' +
        '<span class="sp"></span><span class="sub">' + i.rows.length + ' ' + i.unit + '</span></div>' +
        '<div class="tw"><table class="t"><tbody>' + i.rows.map(function (r) {
          return '<tr' + (r.name && r.id && r.id.indexOf('EMP') === 0 ? ' class="clickrow" data-emp4="' + r.id + '"' : '') + '>' +
            '<td>' + esc(r.name) + '</td><td><small>' + esc(r.id || '') + '</small></td></tr>'; }).join('') +
        '</tbody></table></div></div>';
    });

    host.innerHTML = h;
    $$('[data-iss]').forEach(function (r) {
      r.addEventListener('click', function () {
        var el = $('#iss-' + r.getAttribute('data-iss'));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    $$('[data-emp4]').forEach(function (r) {
      r.addEventListener('click', function () { openProfile(r.getAttribute('data-emp4'), 'work'); });
    });
  };


  /* ==================================================================
     C1 · ภาพรวมใบเซอร์ — หน้าหลักของเมนูนี้
     ห้ามเอาการสอบเทียบเครื่องมือมาปนในหน้านี้ คนละโมดูล
     ================================================================== */
  var certTab = 'person';

  function canSeeSensitive(targetId) {
    var me = S.user();
    if (me.id === targetId) return true;                    /* เจ้าตัว */
    if (me.role === 'hr') return true;                      /* ฝ่ายบุคคล */
    if (me.role === 'manager') {                            /* หัวหน้างานผู้อนุมัติใบนั้น */
      var t = S.employee(targetId);
      return !!(t && t.managerId === me.id);
    }
    return false;                                           /* ผู้บริหารและแอดมินไม่เปิด */
  }

  SS.views.certs = function (host) {
    var db = S.get();
    var emps = db.employees.filter(function (e) { return !e.isTest && e.active; });
    var n = { valid: 0, soon: 0, expired: 0, missing: 0 };
    var risky = [];
    emps.forEach(function (e) {
      C.certsOf(e.id).forEach(function (c) {
        n[c.status] = (n[c.status] || 0) + 1;
        /* แถบ "ต้องจัดการก่อน" แสดงเฉพาะกรณีที่มีคนเสี่ยงจริง — ใบหมดอายุ + ยังลงไซต์อยู่ */
        var onSite = e.defaultJobType && e.defaultJobType !== 'office';
        if (onSite && c.type.block !== 'none' && (c.status === 'expired' || c.status === 'soon')) {
          risky.push({ emp: e, cert: c });
        }
      });
    });
    risky.sort(function (a, b) { return a.cert.status === 'expired' ? -1 : 1; });

    var h = '<div class="grid g4">' +
      '<div class="stat g"><div class="l">ใช้ได้</div><div class="v">' + n.valid + '</div></div>' +
      '<div class="stat y"><div class="l">ใกล้หมด</div><div class="v">' + n.soon + '</div><div class="n">ภายในจำนวนวันที่ตั้งไว้รายชนิดใบ</div></div>' +
      '<div class="stat r"><div class="l">หมดอายุ</div><div class="v">' + n.expired + '</div></div>' +
      '<div class="stat k"><div class="l">ยังไม่มี</div><div class="v">' + n.missing + '</div><div class="n">ใบบังคับที่ยังไม่เคยมี</div></div>' +
      '</div>';

    if (risky.length) {
      h += '<div class="card riskcard" style="margin-top:16px"><div class="chead"><h2>⚠ ต้องจัดการก่อน</h2>' +
        '<span class="sub">ใบบังคับมีปัญหา และคนนั้นยังทำงานหน้าไซต์อยู่</span></div>' +
        '<div class="tw"><table class="t"><tbody>' +
        risky.slice(0, 8).map(function (r) {
          var days = r.cert.rec && r.cert.rec.expiry ? SS.d.diff(SS.d.today(), r.cert.rec.expiry)
                   : r.cert.rec && r.cert.rec.next ? SS.d.diff(SS.d.today(), r.cert.rec.next) : null;
          return '<tr class="clickrow" data-certemp="' + r.emp.id + '"><td>' + esc(r.emp.name) + '</td>' +
            '<td>' + esc(r.cert.type.name) + (r.cert.sensitive ? ' 🔒' : '') + '</td>' +
            '<td>' + (r.cert.status === 'expired'
              ? U.pill('pill-red', 'หมดอายุแล้ว ' + Math.abs(days) + ' วัน')
              : U.pill('pill-yellow', 'ครบกำหนดใน ' + days + ' วัน')) + '</td>' +
            '<td style="text-align:right">→</td></tr>'; }).join('') +
        '</tbody></table></div></div>';
    }

    h += '<div class="card"><div class="chead"><h2>ใบรับรองและเอกสารพนักงาน</h2><span class="sp"></span>' +
      '<button class="btn btn-ghost btn-sm" id="ctTabP">รายคน</button>' +
      '<button class="btn btn-ghost btn-sm" id="ctTabT">รายชนิดใบ</button>' +
      (canManageStaff() ? '<button class="btn btn-accent btn-sm" id="ctAdd">+ เพิ่มใบ</button>' : '') + '</div>';

    if (certTab === 'person') {
      h += '<div class="tw"><table class="t"><thead><tr><th>พนักงาน</th><th class="n">ใช้ได้</th><th class="n">ใกล้หมด</th><th class="n">หมดอายุ</th><th class="n">ยังไม่มี</th><th></th></tr></thead><tbody>';
      emps.forEach(function (e) {
        var cs = C.certsOf(e.id), c = { valid: 0, soon: 0, expired: 0, missing: 0 };
        cs.forEach(function (x) { c[x.status]++; });
        h += '<tr class="clickrow" data-certemp="' + e.id + '"><td>' + U.person(e, e.positionId ? SS.name(SS.position, e.positionId) : 'ยังไม่ระบุตำแหน่ง') + '</td>' +
          '<td class="n">' + c.valid + '</td>' +
          '<td class="n">' + (c.soon ? '<b class="wy">' + c.soon + '</b>' : '0') + '</td>' +
          '<td class="n">' + (c.expired ? '<b class="wr">' + c.expired + '</b>' : '0') + '</td>' +
          '<td class="n">' + (c.missing ? '<b>' + c.missing + '</b>' : '0') + '</td>' +
          '<td style="text-align:right">→</td></tr>';
      });
      h += '</tbody></table></div>';
    } else {
      h += '<div class="tw"><table class="t"><thead><tr><th>ชนิดใบ</th><th>บังคับกับ</th><th class="n">มี</th><th class="n">หมดอายุ</th><th class="n">ยังไม่มี</th><th>กัน</th></tr></thead><tbody>';
      db.certTypes.filter(function (t) { return t.enabled; }).forEach(function (t) {
        var have = 0, exp = 0, miss = 0;
        emps.forEach(function (e) {
          var rec = t.sensitive ? C.latestSensitive(e.id, t.id) : C.latestCert(e.id, t.id);
          var req = C.requiredCertTypes(e.id).some(function (x) { return x.id === t.id; });
          if (rec) { have++; if (C.certsOf(e.id).filter(function (c) { return c.type.id === t.id; })[0].status === 'expired') exp++; }
          else if (req) miss++;
        });
        h += '<tr><td>' + esc(t.name) + (t.sensitive ? ' 🔒' : '') + '</td>' +
          '<td><small>' + esc(reqLabel(t)) + '</small></td>' +
          '<td class="n">' + have + '</td><td class="n">' + (exp ? '<b class="wr">' + exp + '</b>' : '0') + '</td>' +
          '<td class="n">' + (miss ? '<b>' + miss + '</b>' : '0') + '</td>' +
          '<td><small>' + esc(SS.name(function (id) { return SS.CERT_BLOCK_LEVELS.filter(function (b) { return b.id === id; })[0]; }, t.block)) + '</small></td></tr>';
      });
      h += '</tbody></table></div>';
    }

    h += U.note('mock', '<b>การ์ด "ยังไม่มี" สำคัญที่สุดและมักถูกลืม</b> — ระบบต้องรู้ว่าใครยังไม่เคยมีใบบังคับ ไม่ใช่รู้แค่ว่าใบที่มีอยู่หมดอายุหรือยัง · ' +
      '<b>ห้ามเอาการสอบเทียบเครื่องมือมาปนในหน้านี้</b> คนละโมดูล') + '</div>';

    host.innerHTML = h;
    $('#ctTabP').addEventListener('click', function () { certTab = 'person'; SS.app.refresh(); });
    $('#ctTabT').addEventListener('click', function () { certTab = 'type'; SS.app.refresh(); });
    if ($('#ctAdd')) $('#ctAdd').addEventListener('click', function () { certFormModal(null, null); });
    $$('[data-certemp]').forEach(function (r) {
      r.addEventListener('click', function () { certPersonModal(r.getAttribute('data-certemp')); });
    });
  };

  function reqLabel(t) {
    if (t.requiredFor === 'all') return 'ทุกคน';
    if (t.requiredFor.indexOf('job:') === 0) return SS.name(SS.jobType, t.requiredFor.slice(4));
    if (t.requiredFor.indexOf('pos:') === 0) return SS.name(SS.position, t.requiredFor.slice(4));
    return 'ไม่บังคับ';
  }

  /* ==================================================================
     C2 · มุมมองรายคน — ท่อนล่าง "ยังไม่มี" ต้องอยู่ในหน้าเดียวกัน
     ================================================================== */
  function certPersonModal(empId) {
    var e = S.employee(empId);
    var cs = C.certsOf(empId);
    var have = cs.filter(function (c) { return c.rec; });
    var miss = cs.filter(function (c) { return !c.rec; });
    var canSee = canSeeSensitive(empId);

    U.modal({
      title: esc(e.name) + ' · ' + esc(e.id),
      body:
        '<div class="hint" style="margin-bottom:12px">' + esc(e.positionId ? SS.name(SS.position, e.positionId) : 'ยังไม่ระบุตำแหน่ง') +
        ' · ' + esc(e.dept ? SS.name(SS.dept, e.dept) : 'ยังไม่จัดแผนก') + '</div>' +
        '<div class="tw"><table class="t"><thead><tr><th>ชนิดใบ</th><th>วันที่ออก</th><th>หมดอายุ</th><th>สถานะ</th><th>ไฟล์</th></tr></thead><tbody>' +
        (have.length ? have.map(function (c) {
          var r = c.rec;
          var st = SS.certStatus(c.status) || {};
          return '<tr class="clickrow" data-cthist="' + c.type.id + '"><td>' + esc(c.type.name) + (c.sensitive ? ' 🔒' : '') + '</td>' +
            '<td>' + esc(U.date(c.sensitive ? r.checked : r.issued)) + '</td>' +
            '<td>' + esc((c.sensitive ? r.next : r.expiry) ? U.date(c.sensitive ? r.next : r.expiry) : '—') + '</td>' +
            '<td>' + U.pill(st.pill, st.name) +
              (c.sensitive && canSee ? ' ' + (r.pass ? U.pill('pill-green', 'ผ่าน') : U.pill('pill-red', 'ไม่ผ่าน')) : '') + '</td>' +
            '<td>' + (c.sensitive ? '🔒' : (r.attachment ? '✓' : '<span class="wr">✗</span>')) + '</td></tr>';
        }).join('') : '<tr><td colspan="5">' + U.empty('ยังไม่มีใบรับรองในระบบ') + '</td></tr>') +
        '</tbody></table></div>' +
        (miss.length
          ? '<div class="sect">ยังไม่มี</div><div class="misslist">' +
            miss.map(function (c) { return '<span class="misschip">' + esc(c.type.name) + (c.sensitive ? ' 🔒' : '') + '</span>'; }).join('') + '</div>'
          : '<div class="sect">ยังไม่มี</div>' + U.empty('มีใบบังคับครบทุกใบ')) +
        (canSee
          ? U.note('mock', 'คุณเปิดดูเอกสารอ่อนไหวของคนนี้ได้ (เจ้าตัว · หัวหน้างานผู้อนุมัติ · ฝ่ายบุคคล) — <b>ทุกครั้งที่เปิดลง audit log</b>')
          : U.note('cant', 'เอกสารที่ติด 🔒 เปิดดูผลไม่ได้ด้วยสิทธิ์ปัจจุบัน — เปิดได้เฉพาะเจ้าตัว หัวหน้างานผู้อนุมัติ และฝ่ายบุคคล · ผู้บริหารและแอดมินไม่เปิด รายงานแสดงแค่ครบ/ไม่ครบ')),
      buttons: [{ label: 'ปิด', cls: 'btn-ghost' }].concat(canManageStaff()
        ? [{ label: '+ เพิ่มใบให้คนนี้', cls: 'btn-accent', onClick: function () { certFormModal(empId, null); return false; } }]
        : []),
      onOpen: function () {
        /* เปิดดูเอกสารอ่อนไหว → ลง audit log ทุกครั้ง ไม่ใช่แค่ตอนแก้ */
        if (canSee) {
          have.filter(function (c) { return c.sensitive; }).forEach(function (c) {
            S.logSensitiveView(empId, c.type.id);
          });
        }
        $$('[data-cthist]').forEach(function (r) {
          r.addEventListener('click', function () {
            U.closeModal(); certHistoryModal(empId, r.getAttribute('data-cthist'));
          });
        });
      }
    });
  }

  function certHistoryModal(empId, typeId) {
    var t = SS.certType(typeId);
    var rows = t.sensitive
      ? S.get().sensitive.filter(function (x) { return x.empId === empId && x.typeId === typeId; }).sort(function (a, b) { return a.checked < b.checked ? 1 : -1; })
      : C.certHistory(empId, typeId);
    U.modal({
      title: 'ประวัติ · ' + esc(t.name),
      body: '<p style="font-size:13.5px">ต่ออายุคือ<b>การเพิ่มฉบับใหม่ ไม่ใช่ทับของเก่า</b> — ทุกฉบับที่เคยมียังอยู่ เรียงจากใหม่ไปเก่า</p>' +
        '<div class="tw"><table class="t"><tbody>' + rows.map(function (r) {
          return '<tr><td>' + esc(U.date(t.sensitive ? r.checked : r.issued, 'long')) + '</td>' +
            '<td>' + (t.sensitive ? (canSeeSensitive(empId) ? (r.pass ? 'ผ่าน' : 'ไม่ผ่าน') : '🔒 ปกปิด')
                     : esc(r.issuer || '—') + (r.certNo ? ' · ' + esc(r.certNo) : '')) + '</td>' +
            '<td>' + esc((t.sensitive ? r.next : r.expiry) ? 'ถึง ' + U.date(t.sensitive ? r.next : r.expiry) : 'ไม่หมดอายุ') + '</td>' +
            '<td>' + (t.sensitive ? '' : (r.attachment ? '✓ ' + esc(r.attachment) : '<span class="wr">ยังไม่แนบไฟล์</span>')) + '</td></tr>'; }).join('') +
        '</tbody></table></div>',
      buttons: [{ label: 'กลับ', cls: 'btn-ghost', onClick: function () { certPersonModal(empId); return false; } }]
        .concat(canManageStaff() ? [{ label: 'ต่ออายุใบนี้', cls: 'btn-accent', onClick: function () { certFormModal(empId, typeId); return false; } }] : [])
    });
  }

  /* ==================================================================
     C3 · ฟอร์มเพิ่มและต่ออายุใบ   /   C4 · ฟอร์มเอกสารอ่อนไหว
     ชนิดใบที่ติดธง PDPA บังคับใช้ฟอร์ม C4 และซ่อนช่องแนบไฟล์
     ================================================================== */
  function certFormModal(empId, typeId) {
    var db = S.get();
    var st = {
      empId: empId || '',
      typeId: typeId || '',
      issuer: '', certNo: '', issued: SS.d.today(), expiry: '', autoExpiry: true,
      attachment: '', note: '', pass: null, checked: SS.d.today(), next: ''
    };
    var renewing = !!(empId && typeId);

    function calcExpiry() {
      var t = SS.certType(st.typeId);
      if (!t || !t.renewMonths || !st.issued) return '';
      var d = SS.d.parse(st.issued);
      d.setMonth(d.getMonth() + t.renewMonths);
      return SS.d.iso(d);
    }

    function body() {
      var t = st.typeId ? SS.certType(st.typeId) : null;
      var sensitive = t && t.sensitive;
      var h = '';

      if (sensitive) {
        h += '<div class="pdpabox">🔒 <b>เอกสารอ่อนไหวตาม PDPA มาตรา 26</b><br>' +
          'ระบบเก็บได้เฉพาะผลผ่าน/ไม่ผ่านและวันที่ · <b>ห้ามแนบไฟล์ผลตรวจ ห้ามกรอกรายละเอียดผล</b></div>';
      }

      h += '<div class="frow">' +
        '<div class="field"><label>พนักงาน <span class="req">*</span></label>' +
        '<select id="cfEmp"' + (renewing ? ' disabled' : '') + '><option value="">— เลือก —</option>' +
        db.employees.filter(function (e) { return !e.isTest && e.active; })
          .map(function (e) { return '<option value="' + e.id + '"' + (st.empId === e.id ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>' + (sensitive ? 'รายการตรวจ' : 'ชนิดใบ') + ' <span class="req">*</span></label>' +
        '<select id="cfType"' + (renewing ? ' disabled' : '') + '><option value="">— เลือก —</option>' +
        db.certTypes.filter(function (x) { return x.enabled; })
          .map(function (x) { return '<option value="' + x.id + '"' + (st.typeId === x.id ? ' selected' : '') + '>' + esc(x.name) + (x.sensitive ? ' 🔒' : '') + '</option>'; }).join('') +
        '</select><div class="hint"><b>ดรอปดาวน์เท่านั้น ห้ามพิมพ์เอง</b> — ที่มาของชื่อใบเพี้ยนในระบบเดิมคือการพิมพ์เอง</div></div>' +
        '</div>';

      if (t) {
        h += '<div class="okbox">ℹ ' + esc(t.name) + ' · ' +
          (t.renewMonths ? 'ต่ออายุทุก ' + (t.renewMonths % 12 === 0 ? (t.renewMonths / 12) + ' ปี' : t.renewMonths + ' เดือน') : 'ไม่หมดอายุ') +
          ' · ' + (t.requiredFor === 'none' ? 'ไม่บังคับ' : 'เป็นใบบังคับสำหรับ ' + reqLabel(t)) +
          ' · ระดับการกัน: ' + esc((SS.CERT_BLOCK_LEVELS.filter(function (b) { return b.id === t.block; })[0] || {}).name) + '</div>';
      }

      if (sensitive) {
        /* C4 — ไม่มีช่องแนบไฟล์ ไม่มีช่องรายละเอียดผล ไม่มีช่องหมายเหตุ */
        h += '<div class="field"><label>ผล <span class="req">*</span></label><div class="choices">' +
          '<label class="choice' + (st.pass === true ? ' on' : '') + '"><input type="radio" name="cfPass" value="1"' + (st.pass === true ? ' checked' : '') + '> ผ่าน</label>' +
          '<label class="choice' + (st.pass === false ? ' on' : '') + '"><input type="radio" name="cfPass" value="0"' + (st.pass === false ? ' checked' : '') + '> ไม่ผ่าน</label>' +
          '</div></div>' +
          '<div class="frow"><div class="field"><label>วันที่ตรวจ <span class="req">*</span></label><input type="date" id="cfChecked" value="' + esc(st.checked) + '"></div>' +
          '<div class="field"><label>ครบกำหนดถัดไป</label><input type="date" id="cfNext" value="' + esc(st.next) + '"></div></div>';
      } else {
        h += '<div class="frow"><div class="field"><label>ออกโดย/สถาบัน</label><input type="text" id="cfIssuer" value="' + esc(st.issuer) + '"></div>' +
          '<div class="field"><label>เลขที่ใบ</label><input type="text" id="cfNo" value="' + esc(st.certNo) + '"></div></div>' +
          '<div class="frow"><div class="field"><label>วันที่ออก <span class="req">*</span></label><input type="date" id="cfIssued" value="' + esc(st.issued) + '"></div>' +
          '<div class="field"><label>วันหมดอายุ</label><input type="date" id="cfExpiry" value="' + esc(st.autoExpiry ? calcExpiry() : st.expiry) + '"' + (st.autoExpiry ? ' disabled' : '') + '>' +
          '<label class="choice' + (st.autoExpiry ? ' on' : '') + '" style="margin-top:7px"><input type="checkbox" id="cfAuto"' + (st.autoExpiry ? ' checked' : '') + '> คำนวณจากรอบต่ออายุให้</label>' +
          '<div class="hint">บางใบพิมพ์วันหมดอายุมาเอง ติ๊กออกแล้วกรอกเองได้</div></div></div>' +
          '<div class="field"><label>ไฟล์แนบ</label><input type="text" id="cfFile" value="' + esc(st.attachment) + '" placeholder="ชื่อไฟล์ เช่น อบรมที่สูง-สมชาย.pdf">' +
          '<div class="hint">ต้นแบบเก็บแค่ชื่อไฟล์ · ไม่แนบก็บันทึกได้ <b>แต่จะขึ้นเตือนค้างไว้</b></div></div>' +
          '<div class="field"><label>หมายเหตุ</label><input type="text" id="cfNote" value="' + esc(st.note) + '"></div>';
      }

      if (renewing) h += U.note('mock', '<b>ฉบับเดิมจะถูกเก็บเป็นประวัติ ไม่ถูกทับ</b> — ต่ออายุคือการเพิ่มฉบับใหม่');
      return h;
    }

    function grab() {
      if ($('#cfEmp')) st.empId = $('#cfEmp').value;
      if ($('#cfType')) st.typeId = $('#cfType').value;
      if ($('#cfIssuer')) st.issuer = $('#cfIssuer').value;
      if ($('#cfNo')) st.certNo = $('#cfNo').value;
      if ($('#cfIssued')) st.issued = $('#cfIssued').value;
      if ($('#cfExpiry')) st.expiry = $('#cfExpiry').value;
      if ($('#cfFile')) st.attachment = $('#cfFile').value;
      if ($('#cfNote')) st.note = $('#cfNote').value;
      if ($('#cfChecked')) st.checked = $('#cfChecked').value;
      if ($('#cfNext')) st.next = $('#cfNext').value;
      var r = $$('[name=cfPass]').filter(function (x) { return x.checked; })[0];
      if (r) st.pass = r.value === '1';
    }

    function open() {
      var t = st.typeId ? SS.certType(st.typeId) : null;
      U.modal({
        title: (renewing ? 'ต่ออายุ · ' : (t && t.sensitive ? 'บันทึกผลตรวจ' : 'เพิ่มใบรับรอง')) + (renewing ? esc(t.name) : ''),
        body: body(),
        buttons: [
          { label: 'ยกเลิก', cls: 'btn-ghost' },
          { label: 'บันทึก', cls: 'btn-accent', onClick: function () {
              grab();
              var tt = SS.certType(st.typeId);
              if (!st.empId) { U.toast('กรุณาเลือกพนักงาน', 'err'); return false; }
              if (!tt) { U.toast('กรุณาเลือกชนิดใบ', 'err'); return false; }
              var res = tt.sensitive
                ? S.addSensitive({ empId: st.empId, typeId: st.typeId, pass: st.pass, checked: st.checked, next: st.next })
                : S.addCert({ empId: st.empId, typeId: st.typeId, issuer: st.issuer, certNo: st.certNo,
                              issued: st.issued, expiry: st.autoExpiry ? calcExpiry() : st.expiry,
                              attachment: st.attachment, note: st.note });
              if (!res.ok) { U.toast(res.msg, 'err'); return false; }
              U.toast('บันทึกแล้ว' + (!tt.sensitive && !st.attachment ? ' · ⚠ ยังไม่แนบไฟล์ จะขึ้นในรายการงานค้าง' : ''), 'ok');
              SS.app.refresh();
            } }
        ],
        onOpen: function () {
          if ($('#cfType')) $('#cfType').addEventListener('change', function () { grab(); st.typeId = this.value; U.closeModal(); open(); });
          if ($('#cfEmp')) $('#cfEmp').addEventListener('change', function () { st.empId = this.value; });
          if ($('#cfAuto')) $('#cfAuto').addEventListener('change', function () { grab(); st.autoExpiry = this.checked; U.closeModal(); open(); });
          if ($('#cfIssued')) $('#cfIssued').addEventListener('change', function () { grab(); if (st.autoExpiry) { U.closeModal(); open(); } });
        }
      });
    }
    open();
  }

  /* ==================================================================
     C5 · ตั้งค่าชนิดใบรับรอง — 21 ชนิด ตั้งค่าได้ ห้าม hardcode
     ================================================================== */
  SS.views.certtypes = function (host) {
    var h = '<div class="card"><div class="chead"><h2>ชนิดใบรับรอง</h2>' +
      '<span class="sub">S12 · C5 — 21 ชนิด (ลิสต์บริษัท 14 + แนะนำเพิ่ม 7)</span></div>' +
      '<div class="tw"><table class="t"><thead><tr><th>ชื่อ</th><th>รอบต่ออายุ</th><th>บังคับกับ</th><th>กัน</th><th>เตือนล่วงหน้า</th><th>แจ้งใคร</th><th>PDPA</th></tr></thead><tbody>';
    S.get().certTypes.forEach(function (t) {
      h += '<tr' + (t.enabled ? '' : ' style="opacity:.5"') + '><td><b>' + esc(t.name) + '</b></td>' +
        '<td>' + (t.renewMonths ? esc(t.renewMonths % 12 === 0 ? (t.renewMonths / 12) + ' ปี' : t.renewMonths + ' เดือน') : 'ไม่หมดอายุ') + '</td>' +
        '<td><small>' + esc(reqLabel(t)) + '</small></td>' +
        '<td>' + (t.block === 'strong' ? U.pill('pill-red', 'เตือนแรง') : t.block === 'warn' ? U.pill('pill-yellow', 'เตือน') : U.pill('pill-gray', 'ไม่กัน')) + '</td>' +
        '<td class="n">' + t.warnDays + ' วัน</td>' +
        '<td><small>' + esc(t.notify.map(function (x) { return SS.name(function (id) { return SS.CERT_NOTIFY.filter(function (c) { return c.id === id; })[0]; }, x); }).join(' · ')) + '</small></td>' +
        '<td>' + (t.sensitive ? '🔒' : '—') + '</td></tr>';
    });
    h += '</tbody></table></div>' +
      U.note('mock', '<b>รอบต่ออายุอยู่ที่ชนิดใบ ไม่ใช่ในชื่อ</b> — ระบบเดิมเอารอบต่ออายุไปฝังในชื่อใบ ทำให้ค้นและเตือนไม่ได้ · ' +
        'ติ๊กธง PDPA แล้ว<b>บังคับใช้ฟอร์มบันทึกผลตรวจและซ่อนช่องแนบไฟล์</b>') +
      U.note('open', '<b>ยังไม่เคาะ</b> — "อบรม 6 ชม." และ "อบรม 3 ชม." คือหลักสูตรอะไรแน่ · ถ้า 3 ชม. เป็น site induction ของโรงงานลูกค้าจริง มันผูกกับไซต์ ไม่ใช่ผูกกับคน ซึ่งเปลี่ยนโครงสร้างข้อมูล · ' +
        'และ 7 ชนิดที่แนะนำเพิ่ม ยังต้องให้ฝ่ายบุคคลยืนยันว่ารับเข้าลิสต์บริษัทหรือไม่') + '</div>';
    host.innerHTML = h;
  };

  /* ==================================================================
     C6 · หน้าจอตอนใบหมดอายุแล้วยังจะจัดคนลงไซต์
     จุดที่เมนูนี้มีค่าจริง ๆ อยู่ตรงนี้ที่เดียว
     ในเฟสนี้เด้งได้เฉพาะตอนเช็คอินเข้าไซต์ เพราะ S22 ไม่อยู่ในเฟสนี้
     ================================================================== */
  SS.certGate = function (empId, onPass) {
    var all = C.blockingCerts(empId).filter(function (c) { return c.type.block !== 'none'; });
    /* หน้าจอนี้เด้งเมื่อ "ใบบังคับหมดอายุ" ตามที่ C6 เขียนไว้
       ส่วนใบบังคับที่ยังไม่เคยมี แสดงประกอบให้ผู้อนุมัติเห็นภาพครบ แต่ไม่เป็นตัวเด้งเอง
       มิฉะนั้นจะเด้งกับเกือบทุกคนตั้งแต่วันแรกที่ยังกรอกใบไม่ครบ ซึ่งทำให้คนกดผ่านรวดโดยไม่อ่าน */
    var expired = all.filter(function (c) { return c.status === 'expired'; });
    if (!expired.length) return onPass();
    if (C.exemptedToday(empId)) return onPass();            /* ยกเว้นไปแล้ววันนี้ */

    var blocking = expired.concat(all.filter(function (c) { return c.status === 'missing'; }));
    var strong = expired.filter(function (c) { return c.type.block === 'strong'; });
    var e = S.employee(empId);

    U.modal({
      title: '⚠ ' + esc(e.name) + ' มีใบบังคับที่ยังไม่พร้อม',
      body:
        '<div class="tw"><table class="t"><tbody>' + blocking.map(function (c) {
          var d = c.rec && c.rec.expiry ? SS.d.diff(SS.d.today(), c.rec.expiry) : null;
          return '<tr' + (c.status === 'missing' ? ' style="opacity:.6"' : '') + '><td><b>' + esc(c.type.name) + '</b></td>' +
            '<td>' + (c.status === 'missing' ? U.pill('pill-gray', 'ยังไม่เคยมี')
              : U.pill('pill-red', 'หมดอายุ ' + U.date(c.rec.expiry) + ' (' + Math.abs(d) + ' วันที่แล้ว)')) + '</td>' +
            '<td><small>' + esc(c.status === 'missing' ? 'แสดงประกอบ ไม่ใช่ตัวที่กัน'
              : c.type.block === 'strong' ? 'เตือนแรง — ผ่านได้ถ้าระบุเหตุผล' : 'เตือนเฉย ๆ') + '</small></td></tr>'; }).join('') +
        '</tbody></table></div>' +
        (strong.length
          ? '<div class="field" style="margin-top:14px"><label>เหตุผลที่ยังให้ลงไซต์ <span class="req">*</span></label>' +
            '<input type="text" id="gateReason" placeholder="เช่น มีหัวหน้าชุดที่ใบยังไม่หมดคุมงานตลอดวัน">' +
            '<div class="hint">ต้องกรอก · บันทึกชื่อผู้อนุมัติและเวลา และไปโผล่ในรายงานให้ผู้บริหารเห็นว่าเดือนนี้ยกเว้นไปกี่ครั้ง</div></div>'
          : '<div class="hint" style="margin-top:12px">ระดับ "เตือนเฉย ๆ" กดผ่านได้โดยไม่ต้องกรอกอะไร</div>') +
        U.note('mock', '<b>ข้อจำกัดในเฟสนี้</b> — ไม่มีระบบมอบหมายกำลังคนล่วงหน้า (S22 ไม่อยู่ในเฟสนี้) ' +
          'จุดที่หน้าจอนี้เด้งได้จริงจึงมีแค่<b>ตอนเช็คอินเข้าไซต์</b> ไม่ใช่ตอนวางแผน'),
      buttons: [
        { label: 'ยกเลิกการเช็คอิน', cls: 'btn-ghost' },
        { label: 'ยืนยันและบันทึก', cls: 'btn-danger', onClick: function () {
            var reason = $('#gateReason') ? $('#gateReason').value.trim() : 'ระดับเตือนเฉย ๆ — ไม่ต้องระบุเหตุผล';
            if (strong.length && !reason) { U.toast('ต้องกรอกเหตุผลที่ยังให้ลงไซต์', 'err'); return false; }
            var r = S.addCertExemption({ empId: empId, typeIds: expired.map(function (c) { return c.type.id; }), reason: reason });
            if (!r.ok) { U.toast(r.msg, 'err'); return false; }
            U.toast('บันทึกการยกเว้นแล้ว · ลง audit log และจะโผล่ในรายงานของผู้บริหาร', 'ok');
            onPass();
          } }
      ]
    });
  };
})();
