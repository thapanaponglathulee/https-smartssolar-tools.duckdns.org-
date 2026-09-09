#!/usr/bin/env node
/* ==========================================================================
   run-e2e.js — ทดสอบการใช้งานจริงบนเบราว์เซอร์
   เปิดต้นแบบด้วย Chromium แล้วกดใช้งานแบบคนจริง เพื่อตรวจข้อที่ตรรกะล้วนตรวจไม่ได้:
   หน้าจอขึ้นครบไหม · สลับคนได้ไหม · ตัวเลขเงินหลุดมาให้พนักงานเห็นไหม · มือถืออ่านออกไหม

   วิธีรัน:  node tests/e2e/run-e2e.js
   ต้องมี playwright + chromium ในเครื่อง (สภาพแวดล้อมนี้ติดตั้งไว้ให้แล้วที่ระดับ global)
   ถ้าไม่มี สคริปต์จะข้ามทั้งชุดพร้อมบอกวิธีติดตั้ง — ไม่ทำให้ทั้งชุดล้ม
   ========================================================================== */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');
var Module = require('module');

var ROOT = path.resolve(__dirname, '..', '..');
var T = require('../lib/tiny-test.js');

/* playwright ถูกติดตั้งไว้ระดับ global ในสภาพแวดล้อมนี้ จึงต้องบอก path ให้ require เห็น */
function loadPlaywright() {
  var extra = ['/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules'];
  extra.forEach(function (p) { if (Module.globalPaths.indexOf(p) < 0) Module.globalPaths.push(p); });
  var tries = ['playwright'].concat(extra.map(function (p) { return path.join(p, 'playwright'); }));
  for (var i = 0; i < tries.length; i++) {
    try { return require(tries[i]); } catch (e) { /* ลองตัวถัดไป */ }
  }
  return null;
}

var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
             '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
             '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function serve(port) {
  var srv = http.createServer(function (req, res) {
    var rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel === '/') rel = '/index.html';
    var file = path.join(ROOT, rel);
    if (file.indexOf(ROOT) !== 0 || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(function (ok) { srv.listen(port, function () { ok(srv); }); });
}

/* ---------- ตัวช่วยเขียนเทสต์แบบ async ---------- */
var cases = [];
function e2e(id, title, fn) { cases.push({ id: id, title: title, fn: fn }); }
var x = T.expect;
var C = T.C;

/* =====================================================================
   รายการทดสอบ
   ===================================================================== */

e2e('UAT-00', 'หน้าเว็บเปิดได้ ไม่มี JavaScript error และหัวข้อหน้าขึ้นครบ', function (p) {
  return p.errors.length === 0
    ? p.page.textContent('#pageTitle').then(function (t) {
        x.ok(t && t.trim().length > 0, 'ชื่อหน้าต้องไม่ว่าง');
      })
    : Promise.reject(new Error('พบ error ในคอนโซล: ' + p.errors.join(' | ')));
});

e2e('ต้นแบบ-1', 'แถบ "เข้าใช้งานในนาม" มีอยู่ตลอด และสลับได้ครบทั้ง 5 บทบาท', function (p) {
  return p.page.$$eval('#userPicker option', function (os) {
    return os.map(function (o) { return o.textContent; });
  }).then(function (names) {
    x.ok(names.length >= 5, 'ต้องมีคนให้เลือกอย่างน้อย 5 คน');
    ['พนักงาน', 'หัวหน้า', 'ฝ่ายบุคคล', 'ผู้บริหาร', 'แอดมิน'].forEach(function (r) {
      x.ok(names.join(' | ').indexOf(r) >= 0, 'ต้องมีบทบาท ' + r + ' ให้สลับ');
    });
  });
});

e2e('ต้นแบบ-2', 'มีปุ่มรีเซ็ตข้อมูลตัวอย่าง และมีแถบบอกว่าเป็น mockup', function (p) {
  return p.page.textContent('.ribbon').then(function (t) {
    x.has(t, 'MOCKUP', 'ต้องประกาศชัดว่าเป็นต้นแบบ');
    x.has(t, 'รีเซ็ตข้อมูลตัวอย่าง');
    x.has(t, 'ไม่เชื่อมต่อระบบจริง', 'ต้องบอกว่าไม่ใช่ระบบจริง');
  });
});

e2e('S8', 'เมนูเปลี่ยนตามบทบาท — พนักงานไม่เห็นเมนูอนุมัติ หัวหน้าเห็น', function (p) {
  return p.asUser('EMP-201')
    .then(function () { return p.page.textContent('#nav'); })
    .then(function (nav) {
      x.hasNot(nav, 'คิวอนุมัติ', 'พนักงานทั่วไปต้องไม่เห็นคิวอนุมัติ');
      x.has(nav, 'เช็คอิน');
    })
    .then(function () { return p.asUser('EMP-101'); })
    .then(function () { return p.page.textContent('#nav'); })
    .then(function (nav) {
      x.has(nav, 'คิวอนุมัติ', 'หัวหน้างานต้องเห็นคิวอนุมัติ');
      x.has(nav, 'ทีมของฉัน');
    });
});

e2e('CI-03', 'หน้าเช็คอินของพนักงาน ไม่มีจำนวนเงิน จำนวนมื้อ หรืออัตรา', function (p) {
  return p.asUser('EMP-201')
    .then(function () { return p.go('checkin'); })
    .then(function () { return p.page.textContent('#view'); })
    .then(function (t) {
      ['บาท', 'อัตรา', 'จำนวนมื้อ'].forEach(function (bad) {
        x.hasNot(t, bad, 'หน้าเช็คอินต้องไม่มีคำว่า "' + bad + '"');
      });
      x.no(/\d+\s*บ\./.test(t), 'ต้องไม่มีตัวเลขเงินย่อ');
    });
});

e2e('CI-05', 'ไม่กรอกรายละเอียดงานที่ทำ กดเช็คอินแล้วต้องบันทึกไม่ได้', function (p) {
  /* EMP-201 (ธนากร) เป็นคนเดียวกับที่รายการ UAT ใช้ และข้อมูลตัวอย่างยังไม่เช็คอินให้วันนี้ */
  return p.asUser('EMP-201')
    .then(function () { return p.go('checkin'); })
    .then(function () { return p.page.$('#btnCi'); })
    .then(function (btn) {
      x.ok(btn, 'ต้องเจอฟอร์มเช็คอิน — ถ้าไม่เจอแปลว่าฉากทดสอบผิด ไม่ใช่ผ่าน');
      return p.page.fill('#fDetail', '')
        .then(function () { return p.page.click('#btnCi'); })
        .then(function () { return p.page.textContent('body'); })
        .then(function (t) {
          x.ok(/รายละเอียด|กรอก|ระบุ/.test(t), 'ต้องขึ้นข้อความบอกว่าต้องกรอกรายละเอียด');
          return p.page.$('#btnCi');
        })
        .then(function (still) { x.ok(still, 'ต้องยังอยู่ที่ฟอร์มเช็คอิน ไม่ถือว่าบันทึกสำเร็จ'); });
    });
});

e2e('CI-20', 'เลือกประจำออฟฟิศ แล้วช่องไซต์และลักษณะการไปหายไปทั้งคู่', function (p) {
  return p.asUser('EMP-201')
    .then(function () { return p.go('checkin'); })
    .then(function () { return p.page.$('#fJob'); })
    .then(function (sel) {
      x.ok(sel, 'ต้องเจอดรอปดาวน์ประเภทงาน');
      return p.page.selectOption('#fJob', 'office')
        .then(function () { return p.page.$$('#fSite, #fTravel'); })
        .then(function (els) { x.len(els, 0, 'ต้องไม่เหลือช่องไซต์หรือลักษณะการไป'); });
    });
});

e2e('CI-16', 'เปลี่ยนประเภทงานเป็นซ่อมบำรุง แล้วลิสต์ไซต์รีเฟรชและมีโครงการที่ส่งมอบแล้ว', function (p) {
  return p.asUser('EMP-201')
    .then(function () { return p.go('checkin'); })
    .then(function () { return p.page.$('#fJob'); })
    .then(function (sel) {
      x.ok(sel, 'ต้องเจอดรอปดาวน์ประเภทงาน');
      return p.page.selectOption('#fJob', 'onsite')
        .then(function () { return p.page.textContent('#fSite'); })
        .then(function (t) { x.hasNot(t, 'HYS', 'งานหน้าไซต์ต้องไม่เห็นโครงการที่ส่งมอบแล้ว'); })
        .then(function () { return p.page.selectOption('#fJob', 'om'); })
        .then(function () { return p.page.textContent('#fSite'); })
        .then(function (t) { x.has(t, 'HYS', 'ซ่อมบำรุงต้องเห็นโครงการที่ส่งมอบแล้ว'); });
    });
});

e2e('CI-18', 'ในหน้าเช็คอินไม่มีช่อง "เหตุผลที่เลือกต่างจากค่าตั้งต้น" อีกแล้ว', function (p) {
  return p.asUser('EMP-201')
    .then(function () { return p.go('checkin'); })
    .then(function () { return p.page.textContent('#view'); })
    .then(function (t) {
      x.hasNot(t, 'เหตุผลที่เลือกต่าง', 'ช่องนี้ถูกตัดออกเมื่อ 8 ก.ย. 2569');
    });
});

e2e('LV-03', 'หน้ายื่นใบลาบอกจำนวนวันและถังที่จะตัดให้เห็นก่อนกดส่ง', function (p) {
  return p.asUser('EMP-201')
    .then(function () { return p.go('leavenew'); })
    .then(function () { return p.page.textContent('#view'); })
    .then(function (t) {
      x.ok(/จำนวนวัน|รวม.*วัน/.test(t), 'ต้องบอกจำนวนวัน');
      x.ok(/ถัง|หัก/.test(t), 'ต้องบอกว่าจะหักจากถังไหน');
    });
});

e2e('CI-24', 'หน้าสรุปของฉัน ไม่มีตัวเลขเงินหรือคำว่าบาทเลย', function (p) {
  return p.asUser('EMP-201')
    .then(function () { return p.go('mysummary'); })
    .then(function () { return p.page.textContent('#view'); })
    .then(function (t) { x.hasNot(t, 'บาท', 'CI-03 · พนักงานต้องไม่เห็นตัวเงิน'); });
});

e2e('APV-05', 'คิวอนุมัติของหัวหน้างาน ไม่มีรายการเบี้ยเลี้ยงของใครเลย', function (p) {
  return p.asUser('EMP-101')
    .then(function () { return p.go('approvals'); })
    .then(function () { return p.page.textContent('#view'); })
    .then(function (t) { x.hasNot(t, 'บาท', 'หัวหน้างานต้องไม่เห็นตัวเงินเบี้ยเลี้ยง'); });
});

e2e('ข้อ 7', 'หน้าจอเป็นภาษาไทย ไม่มีข้อความ placeholder ภาษาอังกฤษหลงเหลือ', function (p) {
  return p.asUser('EMP-201')
    .then(function () { return p.go('checkin'); })
    .then(function () { return p.page.textContent('#view'); })
    .then(function (t) {
      ['TODO', 'Lorem ipsum', 'undefined', 'NaN', '[object Object]'].forEach(function (bad) {
        x.hasNot(t, bad, 'หน้าจอต้องไม่มี "' + bad + '"');
      });
      x.ok(/[฀-๿]/.test(t), 'เนื้อหาต้องเป็นภาษาไทย');
    });
});

e2e('ข้อ 8', 'เปิดบนมือถือกว้าง 375px แล้วไม่มีการเลื่อนซ้าย-ขวา', function (p) {
  return p.page.setViewportSize({ width: 375, height: 720 })
    .then(function () { return p.asUser('EMP-201'); })
    .then(function () { return p.go('checkin'); })
    .then(function () {
      return p.page.evaluate(function () {
        return { doc: document.documentElement.scrollWidth, win: window.innerWidth };
      });
    })
    .then(function (m) {
      x.ok(m.doc <= m.win + 1, 'ความกว้างเนื้อหา ' + m.doc + 'px เกินจอ ' + m.win + 'px');
      return p.page.setViewportSize({ width: 1280, height: 900 });
    });
});

e2e('ข้อ 8', 'แถบเมนูล่างสำหรับมือถือมีอยู่จริงและมีไม่เกิน 5 ปุ่ม', function (p) {
  return p.page.$$eval('#mbar button', function (b) { return b.length; })
    .then(function (n) {
      x.ok(n > 0, 'ต้องมีแถบเมนูล่าง');
      x.ok(n <= 5, 'ต้องไม่เกิน 5 ปุ่ม — ได้ ' + n);
    });
});

e2e('UAT-01', 'ทุกหน้าจอของทุกบทบาทเปิดได้ ไม่ค้าง ไม่มี error', function (p) {
  var users = ['EMP-201', 'EMP-101', 'EMP-100', 'EMP-001', 'EMP-002'];
  var chain = Promise.resolve();
  users.forEach(function (u) {
    chain = chain.then(function () { return p.asUser(u); })
      .then(function () { return p.page.$$eval('#nav [data-go]', function (bs) {
        return bs.map(function (b) { return b.getAttribute('data-go'); });
      }); })
      .then(function (keys) {
        var c2 = Promise.resolve();
        keys.forEach(function (k) {
          c2 = c2.then(function () { return p.go(k); })
                 .then(function () { return p.page.textContent('#view'); })
                 .then(function (t) {
                   x.ok(t !== null, 'หน้า ' + k + ' ของ ' + u + ' ไม่ขึ้นเนื้อหา');
                   x.hasNot(t, '[object Object]', 'หน้า ' + k + ' ของ ' + u);
                   x.hasNot(t, 'undefined', 'หน้า ' + k + ' ของ ' + u);
                 });
        });
        return c2;
      });
  });
  return chain.then(function () {
    x.len(p.errors, 0, 'พบ error ระหว่างไล่เปิดทุกหน้า: ' + p.errors.join(' | '));
  });
});

/* =====================================================================
   ตัวรัน
   ===================================================================== */
function main() {
  var pw = loadPlaywright();
  if (!pw) {
    console.log('\n' + C.dim + 'ข้ามชุดทดสอบบนเบราว์เซอร์ — ไม่พบ playwright ในเครื่องนี้' + C.off);
    console.log(C.dim + 'ติดตั้งด้วย: npm i -g playwright   (ต้องมี chromium ด้วย)' + C.off);
    return Promise.resolve(0);
  }

  var PORT = 8199, srv, browser, page;
  var errors = [];

  return serve(PORT)
    .then(function (s) { srv = s; return pw.chromium.launch({ args: ['--no-sandbox'] }); })
    .then(function (b) { browser = b; return b.newPage({ viewport: { width: 1280, height: 900 } }); })
    .then(function (pg) {
      page = pg;
      page.on('pageerror', function (e) { errors.push(String(e.message)); });
      page.on('console', function (m) { if (m.type() === 'error') errors.push(m.text()); });
      return page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'networkidle' });
    })
    .then(function () {
      var ctx = {
        page: page, errors: errors,
        asUser: function (id) {
          return page.selectOption('#userPicker', id).then(function () { return page.waitForTimeout(60); });
        },
        go: function (key) {
          return page.evaluate(function (k) { SS.app.go(k); }, key)
                     .then(function () { return page.waitForTimeout(40); });
        }
      };
      console.log('\n' + C.bold + 'E2E · ทดสอบการใช้งานจริงบนเบราว์เซอร์' + C.off);
      var failed = 0, chain = Promise.resolve();
      cases.forEach(function (c) {
        chain = chain
          .then(function () { errors.length = 0; return c.fn(ctx); })
          .then(function () { console.log(C.green + ' PASS' + C.off + '  [' + c.id + '] ' + c.title); })
          .catch(function (e) {
            failed++;
            console.log(C.red + ' FAIL' + C.off + '  [' + c.id + '] ' + c.title);
            console.log('       ' + C.red + (e.assertion ? e.message : (e.stack || e.message)) + C.off);
          });
      });
      return chain.then(function () { return failed; });
    })
    .then(function (failed) {
      var line = new Array(73).join('-');
      console.log('\n' + line);
      console.log('E2E รวม ' + cases.length + ' ข้อ · ' + C.green + 'ผ่าน ' + (cases.length - failed) + C.off +
                  ' · ' + (failed ? C.red + 'ไม่ผ่าน ' + failed + C.off : 'ไม่ผ่าน 0'));
      console.log(line);
      return failed;
    })
    .then(function (failed) {
      return Promise.resolve()
        .then(function () { return browser && browser.close(); })
        .then(function () { srv && srv.close(); })
        .then(function () { return failed; });
    });
}

if (require.main === module) {
  main().then(function (f) { process.exit(f ? 1 : 0); })
        .catch(function (e) { console.error(e); process.exit(1); });
}
module.exports = { main: main };
