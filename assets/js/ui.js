/* ==========================================================================
   ui.js — helper การแสดงผล
   S14 · แสดงปีเป็น พ.ศ. และเดือนภาษาไทยเสมอ
   ========================================================================== */
window.SS = window.SS || {};

SS.ui = (function () {
  var M_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var M_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var DAY_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function be(iso) { return SS.d.year(iso) + 543; }
  function date(iso, style) {
    if (!iso) return '—';
    var d = SS.d.parse(iso);
    if (style === 'full') return 'วัน' + DAY_FULL[d.getDay()] + 'ที่ ' + d.getDate() + ' ' + M_FULL[d.getMonth()] + ' ' + be(iso);
    if (style === 'long') return d.getDate() + ' ' + M_FULL[d.getMonth()] + ' ' + be(iso);
    if (style === 'dow') return DAY_FULL[d.getDay()].slice(0, 2) + ' ' + d.getDate() + ' ' + M_SHORT[d.getMonth()];
    return d.getDate() + ' ' + M_SHORT[d.getMonth()] + ' ' + String(be(iso)).slice(2);
  }
  function range(a, b) { return a === b ? date(a) : date(a) + ' – ' + date(b); }
  function monthName(m) { return M_FULL[+String(m).slice(5, 7) - 1] + ' ' + (+String(m).slice(0, 4) + 543); }
  function num(n) { return (Math.round(n * 10) / 10).toLocaleString('th-TH'); }
  function money(n) { return (Math.round(n)).toLocaleString('th-TH') + ' บาท'; }

  function pill(cls, text) { return '<span class="pill ' + cls + '">' + esc(text) + '</span>'; }
  function dayPill(st) {
    if (st.status === 'absent' && st.notYet) return pill('pill-orange', 'ยังไม่เช็คอิน');
    var d = SS.dayStatus(st.status) || {};
    return pill(d.pill || 'pill-gray', d.name || st.status);
  }
  function leavePill(s) { var o = SS.leaveStatus(s) || {}; return pill(o.pill || 'pill-gray', o.name || s); }

  function initials(name) {
    var p = String(name).trim().split(/\s+/);
    return (p[0] || '').slice(0, 1) + (p[1] || '').slice(0, 1);
  }
  function person(emp, sub) {
    if (!emp) return '—';
    return '<span class="person"><span class="avatar">' + esc(initials(emp.name)) + '</span>' +
      '<span class="pinfo"><span class="pn">' + esc(emp.name) + '</span>' +
      '<span class="pp">' + esc(sub !== undefined ? sub : emp.position) + '</span></span></span>';
  }

  function empty(title, sub) {
    return '<div class="empty"><strong>' + esc(title) + '</strong>' + (sub ? esc(sub) : '') + '</div>';
  }
  function options(list, val, key, label) {
    return list.map(function (o) {
      var v = typeof o === 'string' ? o : o[key || 'id'];
      var l = typeof o === 'string' ? o : o[label || 'name'];
      return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }

  /* หมายเหตุกำกับสิ่งที่ mockup พิสูจน์ไม่ได้ / ของจำลอง */
  function note(kind, text) {
    var icon = kind === 'mock' ? 'ของจำลอง' : kind === 'cant' ? 'ทดสอบที่นี่ไม่ได้' : 'ยังไม่เคาะ';
    return '<div class="specnote sn-' + kind + '"><b>' + icon + '</b><span>' + text + '</span></div>';
  }
  function ref(codes) {
    return '<span class="ref">' + [].concat(codes).map(function (c) { return '<i>' + esc(c) + '</i>'; }).join('') + '</span>';
  }

  /* ---------- modal ---------- */
  var closeCb = null;
  function modal(o) {
    var root = document.getElementById('modalRoot');
    document.getElementById('modalTitle').innerHTML = o.title || '';
    document.getElementById('modalBody').innerHTML = o.body || '';
    var foot = document.getElementById('modalFoot');
    foot.innerHTML = (o.buttons || []).map(function (b, i) {
      return '<button type="button" class="btn ' + (b.cls || 'btn-ghost') + '" data-mb="' + i + '">' + esc(b.label) + '</button>';
    }).join('');
    Array.prototype.forEach.call(foot.querySelectorAll('[data-mb]'), function (el) {
      el.addEventListener('click', function () {
        var b = o.buttons[+el.getAttribute('data-mb')];
        if (!b.onClick || b.onClick(document.getElementById('modalBody')) !== false) closeModal();
      });
    });
    root.hidden = false;
    closeCb = o.onClose || null;
    if (o.onOpen) o.onOpen(document.getElementById('modalBody'));
  }
  function closeModal() {
    var r = document.getElementById('modalRoot');
    if (r) r.hidden = true;
    if (closeCb) { var c = closeCb; closeCb = null; c(); }
  }

  function confirmBox(title, body, onYes, yesLabel, cls) {
    modal({
      title: title, body: body,
      buttons: [
        { label: 'ยกเลิก', cls: 'btn-ghost' },
        { label: yesLabel || 'ยืนยัน', cls: cls || 'btn', onClick: onYes }
      ]
    });
  }

  function toast(msg, kind) {
    var wrap = document.getElementById('toastWrap');
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = msg;
    wrap.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); }, 4200);
  }

  /* การบันทึกไฟล์
     เปิดจากเว็บเซิร์ฟเวอร์ปกติ → ใช้ลิงก์ดาวน์โหลดของเบราว์เซอร์
     เปิดจากลิงก์ artifact ของ claude.ai → ต้องผ่าน claude.use('downloads')
     เพราะตัวแสดงผลไม่อนุญาตให้หน้าเว็บสั่งดาวน์โหลดเอง */
  var dlPromise = null;
  function initDownloads() {
    if (dlPromise) return dlPromise;
    /* ไม่จำผลเป็น null ถ้ายังไม่มี window.claude ตอนเรียก — ให้ถามใหม่ครั้งหน้าได้ */
    if (typeof window.claude !== 'object' || !window.claude || typeof window.claude.use !== 'function')
      return Promise.resolve(null);
    dlPromise = window.claude.use('downloads').catch(function () { return null; });
    return dlPromise;
  }

  function browserSave(filename, text) {
    var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  function csv(filename, rows) {
    var text = '\ufeff' + rows.map(function (r) {
      return r.map(function (c) {
        var s = String(c === null || c === undefined ? '' : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\n');

    initDownloads().then(function (d) {
      if (!d) return browserSave(filename, text);
      d.save({ filename: filename, data: text }).then(function () {
        toast('บันทึกไฟล์ ' + esc(filename) + ' แล้ว', 'ok');
      }, function (e) {
        var code = e && e.code;
        if (code === 'declined') return;
        if (code === 'rate_limited') return toast('มีกล่องยืนยันการบันทึกเปิดอยู่แล้ว กรุณาลองใหม่', 'err');
        browserSave(filename, text);
      });
    });
  }

  return {
    esc: esc, be: be, date: date, range: range, monthName: monthName, num: num, money: money,
    pill: pill, dayPill: dayPill, leavePill: leavePill, person: person, initials: initials,
    empty: empty, options: options, note: note, ref: ref,
    modal: modal, closeModal: closeModal, confirm: confirmBox, toast: toast, csv: csv, initDownloads: initDownloads,
    M_FULL: M_FULL, M_SHORT: M_SHORT, DAY_FULL: DAY_FULL
  };
})();
