#!/usr/bin/env node
/* รวม mockup เป็นไฟล์เดียว — เขียนออกสองแบบจากเนื้อเดียวกัน

     1. dist/mockup-uat-standalone.html   เอกสาร HTML สมบูรณ์ มี doctype และ meta charset
        → ไฟล์ที่ส่งให้ทีมทดสอบ แนบอีเมลหรือ LINE ได้ ดับเบิลคลิกเปิดได้เลย

     2. dist/mockup-single-file.html      เนื้อล้วนไม่มี doctype/html/head/body
        → ไฟล์สำหรับ publish เป็น artifact ซึ่งห่อ skeleton ให้เอง
          ชื่อไฟล์นี้ผูกกับ URL ของ artifact ที่แชร์ไปแล้ว จึงห้ามเปลี่ยนชื่อ

   ใช้: node tools/build-single-file.js [ไฟล์ standalone ปลายทาง]                */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('index.html');
const css = read('assets/css/app.css');
const scripts = ['masters', 'seed', 'core', 'store', 'ui', 'views-emp', 'views-team', 'views-admin', 'views-staff', 'app']
  .map(n => '/* ===== ' + n + '.js ===== */\n' + read('assets/js/' + n + '.js'));

/* เอาเฉพาะเนื้อใน <body> */
let body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));

/* โลโก้จาก CDN ใช้ไม่ได้เมื่อเปิดแบบออฟไลน์ — ใช้ wordmark แทน */
body = body.replace(/<div class="logo">[\s\S]*?<\/div>\s*<\/div>/,
  '<div class="logo"><div class="fb">SMARTS<i>SOLARS</i></div></div>');
body = body.replace(/\s*<script src="[^"]*"><\/script>/g, '');

const TITLE = 'โมดูลบุคคล Smarts Solars';
const FONTS = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">'
];
/* หน้านี้เป็นธีมเดียวตาม brand — กัน control กลายเป็นธีมมืดตามเครื่องผู้ใช้ */
const STYLE = ['<style>', ':root{color-scheme:light}', css, '</style>'];
const SCRIPT = ['<script>', scripts.join('\n\n'), '</script>'];

const standalone = [
  '<!DOCTYPE html>',
  '<html lang="th">',
  '<head>',
  '<meta charset="utf-8">',                  /* ขาดบรรทัดนี้แล้วภาษาไทยเพี้ยนตอนเปิดจากเครื่อง */
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>' + TITLE + ' — Mockup สำหรับ UAT</title>'
].concat(FONTS, STYLE, ['</head>', '<body>', body.trim()], SCRIPT, ['</body>', '</html>']).join('\n');

const fragment = ['<title>' + TITLE + '</title>']
  .concat(FONTS, STYLE, [body.trim()], SCRIPT).join('\n');

const dest = process.argv[2] || path.join(root, 'dist', 'mockup-uat-standalone.html');
const fragDest = path.join(root, 'dist', 'mockup-single-file.html');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.mkdirSync(path.dirname(fragDest), { recursive: true });
fs.writeFileSync(dest, standalone, 'utf8');
fs.writeFileSync(fragDest, fragment, 'utf8');
const kb = s => Math.round(s.length / 1024) + ' KB';
console.log('ไฟล์ส่งให้ทีมทดสอบ : ' + dest + '  (' + kb(standalone) + ')');
console.log('ไฟล์สำหรับ artifact : ' + fragDest + '  (' + kb(fragment) + ')');
