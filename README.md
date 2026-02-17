# Apple Social Prompt Studio

เว็บแอป static (HTML/CSS/JS) สำหรับช่วยพนักงานขายสร้าง Prompt โฆษณาแบบเร็ว ๆ

## Run ในเครื่อง

```bash
cd /workspace/test
python -m http.server 4173
```

เปิด: <http://127.0.0.1:4173/index.html>

> แนะนำให้เปิดผ่าน HTTP server เพราะแอปมี `fetch('./templates.json')` ถ้าเปิดแบบ `file://` บางเบราว์เซอร์จะไม่อนุญาต

---

## Deploy ฟรี (แนะนำ)

## 1) Netlify (ง่ายสุด)

1. เข้า <https://app.netlify.com/drop>
2. ลากโฟลเดอร์โปรเจกต์นี้ขึ้นไป (หรือ zip แล้วลาก)
3. ได้ URL ใช้งานทันที เช่น `https://xxx.netlify.app`

**ถ้าเชื่อม GitHub**
- Build command: *(เว้นว่าง)*
- Publish directory: `.`

---

## 2) Vercel

1. เข้า <https://vercel.com/new>
2. Import repo นี้
3. Framework Preset: `Other`
4. Build Command: *(เว้นว่าง)*
5. Output Directory: *(เว้นว่าง)*
6. Deploy

---

## 3) GitHub Pages

> เหมาะถ้าเก็บโค้ดบน GitHub อยู่แล้ว

1. push โค้ดขึ้น GitHub
2. ไปที่ **Settings → Pages**
3. Source: `Deploy from a branch`
4. Branch: `main` (หรือ branch ที่ใช้), Folder: `/ (root)`
5. Save แล้วรอ URL ที่ระบบสร้างให้

---

## โครงไฟล์ที่ต้องมี

- `index.html`
- `app.js`
- `style.css`
- `templates.json`

ห้ามลืม `templates.json` เพราะหน้าเว็บโหลดข้อมูลจากไฟล์นี้โดยตรง
