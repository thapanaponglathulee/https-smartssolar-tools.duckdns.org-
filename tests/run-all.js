#!/usr/bin/env node
/* ==========================================================================
   run-all.js — รันทั้งสองชุดต่อกัน: ตรรกะ (Node) แล้วต่อด้วยหน้าจอจริง (Chromium)
     node tests/run-all.js
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var T = require('./lib/tiny-test.js');

var dir = path.join(__dirname, 'unit');
fs.readdirSync(dir).filter(function (f) { return /\.test\.js$/.test(f); }).sort()
  .forEach(function (f) { require(path.join(dir, f)); });

console.log('ต้นแบบโมดูลบุคคล · เทสต์ตามเกณฑ์ตรวจรับ');
var unitFailed = T.run();

require('./e2e/run-e2e.js').main()
  .then(function (e2eFailed) {
    var line = new Array(73).join('-');
    console.log('\n' + line);
    console.log('สรุปรวมทั้งหมด · ตรรกะไม่ผ่าน ' + unitFailed + ' · หน้าจอไม่ผ่าน ' + e2eFailed);
    console.log(line);
    process.exit(unitFailed + e2eFailed ? 1 : 0);
  })
  .catch(function (e) { console.error(e); process.exit(1); });
