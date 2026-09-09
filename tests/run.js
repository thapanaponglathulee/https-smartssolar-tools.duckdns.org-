#!/usr/bin/env node
/* ==========================================================================
   run.js — รันเทสต์ทั้งหมด
     node tests/run.js              รันทุกข้อ
     node tests/run.js CI-18        รันเฉพาะข้อที่มีคำนี้ในรหัส/ชื่อ/หมวด
   ออกด้วยรหัส 1 เมื่อมีเทสต์ไม่ผ่าน จะได้เอาไปต่อ CI ในอนาคตได้
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var T = require('./lib/tiny-test.js');

var dir = path.join(__dirname, 'unit');
fs.readdirSync(dir).filter(function (f) { return /\.test\.js$/.test(f); }).sort()
  .forEach(function (f) { require(path.join(dir, f)); });

console.log('ต้นแบบโมดูลบุคคล · เทสต์ตามเกณฑ์ตรวจรับ');
var failed = T.run(process.argv[2]);
process.exit(failed ? 1 : 0);
