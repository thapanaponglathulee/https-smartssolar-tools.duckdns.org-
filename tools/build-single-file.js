#!/usr/bin/env node
/* รวม mockup เป็นไฟล์ HTML ไฟล์เดียว สำหรับส่งให้ทีมทดสอบหรือแนบอีเมล
   ใช้: node tools/build-single-file.js [ไฟล์ปลายทาง]
   ค่าเริ่มต้น: dist/mockup-single-file.html                                  */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('index.html');
const css = read('assets/css/app.css');
const scripts = ['masters', 'seed', 'core', 'store', 'ui', 'views-emp', 'views-team', 'views-admin', 'app']
  .map(n => '/* ===== ' + n + '.js ===== */\n' + read('assets/js/' + n + '.js'));

/* เอาเฉพาะเนื้อใน <body> */
let body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));

/* โลโก้จาก CDN ใช้ไม่ได้เมื่อเปิดแบบออฟไลน์ — ใช้ wordmark แทน */
body = body.replace(/<div class="logo">[\s\S]*?<\/div>\s*<\/div>/,
  '<div class="logo"><div class="fb">SMARTS<i>SOLARS</i></div></div>');
body = body.replace(/\s*<script src="[^"]*"><\/script>/g, '');

const title = 'โมดูลบุคคล Smarts Solars';
const out = [
  '<title>' + title + '</title>',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">',
  '<style>',
  ':root{color-scheme:light}',          /* หน้านี้เป็นธีมเดียวตาม brand — ไม่ให้ control กลายเป็นธีมมืด */
  css,
  '</style>',
  body.trim(),
  '<script>',
  scripts.join('\n\n'),
  '</script>'
].join('\n');

const dest = process.argv[2] || path.join(root, 'dist', 'mockup-single-file.html');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out, 'utf8');
console.log('เขียนแล้ว: ' + dest + '  (' + Math.round(out.length / 1024) + ' KB)');
