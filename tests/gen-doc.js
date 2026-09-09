#!/usr/bin/env node
/* ==========================================================================
   gen-doc.js — สร้าง docs/test-cases.md จากรายการเทสต์จริง
   เขียนเอกสารมือแล้วลืมอัปเดตคือปัญหาคลาสสิก จึงให้เอกสารงอกจากโค้ดเทสต์โดยตรง
     node tests/gen-doc.js
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var T = require('./lib/tiny-test.js');

var dir = path.join(__dirname, 'unit');
fs.readdirSync(dir).filter(function (f) { return /\.test\.js$/.test(f); }).sort()
  .forEach(function (f) { require(path.join(dir, f)); });

/* รายการทดสอบหน้าจอ — อ่านจากไฟล์ e2e โดยไม่ต้องเปิดเบราว์เซอร์ */
function e2eCases() {
  var src = fs.readFileSync(path.join(__dirname, 'e2e', 'run-e2e.js'), 'utf8');
  var out = [], re = /e2e\('([^']+)',\s*'([^']*)'/g, m;
  while ((m = re.exec(src))) out.push({ id: m[1], title: m[2] });
  return out;
}

var lines = [];
function w(s) { lines.push(s === undefined ? '' : s); }

var today = '9 ก.ย. 2569';

w('# รายการทดสอบอัตโนมัติ — ต้นแบบโมดูลบุคคล');
w();
w('> **ไฟล์นี้สร้างจากโค้ดเทสต์โดยตรง ห้ามแก้ด้วยมือ** — แก้ที่ `tests/unit/*.test.js` แล้วรัน `node tests/gen-doc.js`');
w('> อัปเดตล่าสุด ' + today);
w();
w('รายการนี้ **ไม่แทนที่** `docs/uat-checklist.md` ซึ่งเป็นรายการที่คนกดทดสอบเอง');
w('สองรายการทำคนละหน้าที่');
w();
w('| | รายการทดสอบอัตโนมัติ (ไฟล์นี้) | รายการ UAT (`uat-checklist.md`) |');
w('|---|---|---|');
w('| ใครรัน | เครื่อง รันซ้ำได้ทุกครั้งที่แก้โค้ด | คนของบริษัท กดเองบนหน้าจอจริง |');
w('| ตรวจอะไร | กติกาและตัวเลข — นับวัน ตัดถัง เส้นทางอนุมัติ สถานะรายวัน | หน้าตา ความเข้าใจ ความรู้สึกตอนใช้ คำในปุ่ม |');
w('| ตอบคำถาม | "กติกาที่เขียนไว้ ยังทำงานถูกอยู่ไหม" | "ข้อกำหนดที่เขียนไว้ ถูกต้องตามที่บริษัทต้องการไหม" |');
w();
w('## วิธีรัน');
w();
w('```');
w('node tests/run.js            # ชุดตรรกะทั้งหมด');
w('node tests/run.js CI-18      # เฉพาะข้อที่เกี่ยวกับ CI-18');
w('node tests/e2e/run-e2e.js    # ชุดหน้าจอจริงบน Chromium');
w('node tests/run-all.js        # ทั้งสองชุดต่อกัน');
w('```');
w();
w('ไม่ต้องติดตั้งอะไรสำหรับชุดตรรกะ · ชุดหน้าจอต้องมี playwright + chromium ในเครื่อง');
w('ถ้าไม่มี ชุดหน้าจอจะข้ามให้เองพร้อมบอกวิธีติดตั้ง ไม่ทำให้ทั้งชุดล้ม');
w();

/* ---------- ตารางความครอบคลุม ---------- */
var byId = {};
T.registry.forEach(function (t) {
  t.id.split(/\s+/).forEach(function (i) {
    if (!i) return;
    byId[i] = byId[i] || [];
    byId[i].push(t);
  });
});
var ids = Object.keys(byId).sort();

w('## ความครอบคลุมตามรหัสเกณฑ์ตรวจรับ');
w();
w('รวม **' + T.registry.length + ' เทสต์** ครอบคลุม **' + ids.length + ' รหัส**');
w();
w('| รหัส | จำนวนเทสต์ | หัวข้อที่ตรวจ |');
w('|---|---|---|');
ids.forEach(function (id) {
  var titles = byId[id].map(function (t) { return t.title; }).join(' · ');
  if (titles.length > 160) titles = titles.slice(0, 157) + '…';
  w('| `' + id + '` | ' + byId[id].length + ' | ' + titles + ' |');
});
w();

/* ---------- รายการเทสต์ทีละข้อ ---------- */
w('## รายการเทสต์ทั้งหมด');
w();
var groups = [], seen = {};
T.registry.forEach(function (t) { if (!seen[t.group]) { seen[t.group] = 1; groups.push(t.group); } });
groups.forEach(function (g) {
  w('### ' + g);
  w();
  w('| รหัส | สิ่งที่ตรวจ | ผล |');
  w('|---|---|---|');
  T.registry.filter(function (t) { return t.group === g; }).forEach(function (t) {
    w('| `' + t.id + '` | ' + t.title + ' | ' + (t.known ? '**ข้อค้นพบ — ยังไม่แก้**' : 'ผ่าน') + ' |');
  });
  w();
});

w('### ชุดทดสอบหน้าจอจริง (Chromium)');
w();
w('| รหัส | สิ่งที่ตรวจ |');
w('|---|---|');
e2eCases().forEach(function (c) { w('| `' + c.id + '` | ' + c.title + ' |'); });
w();

/* ---------- ข้อค้นพบ ---------- */
var known = T.registry.filter(function (t) { return t.known; });
w('## ข้อค้นพบที่ยังไม่แก้ (' + known.length + ' ข้อ)');
w();
w('เทสต์เหล่านี้ตั้งใจให้ "ไม่ผ่าน" เพราะเป็นเรื่องที่ต้องให้คนตัดสิน ไม่ใช่บั๊กที่แก้เองได้');
w('ถ้าวันไหนมันผ่านขึ้นมา ตัวรันจะเตือนให้ย้ายกลับไปเป็นเทสต์ปกติ');
w();
known.forEach(function (t) {
  w('- **`' + t.id + '` ' + t.title + '**');
  w('  ' + t.note);
});
w();

w('## สิ่งที่เทสต์ชุดนี้พิสูจน์ไม่ได้');
w();
w('ยกไปทดสอบบนระบบจริงเท่านั้น — ห้ามติ๊กผ่านจากผลของต้นแบบ');
w();
w('- การบังคับสิทธิ์ PDPA ที่หลังบ้าน (ต้นแบบทำได้แค่แสดงให้เห็น)');
w('- payload ที่ส่งจาก API ต้องไม่มีข้อมูลเบี้ยเลี้ยงเมื่อผู้ใช้เป็นหัวหน้างาน (APV-05 · ALW-13)');
w('- การแจ้งเตือน 09:00 · LINE · ปุ่มอนุมัติในข้อความ (CI-12 · LV-10 · APV-14)');
w('- บันทึกการอนุมัติที่ลบไม่ได้แม้แต่แอดมิน (APV-13)');
w('- การแปลงข้อมูลเช็คอินเดิม จำนวนก่อน-หลังต้องเท่ากันเป๊ะ (CI-21)');
w('- การเรียก `getProjects` ใหม่ทุกครั้งที่กลับเข้าหน้าเช็คอิน (CI-01)');
w();

fs.writeFileSync(path.join(__dirname, '..', 'docs', 'test-cases.md'), lines.join('\n'), 'utf8');
console.log('เขียน docs/test-cases.md แล้ว · ' + T.registry.length + ' เทสต์ · ' + ids.length + ' รหัส');
