# เตรียม Backend สำหรับ SaveRaks

เอกสารนี้แยกของที่มีอยู่ใน repository ออกจากของที่โรงเรียนต้องเตรียมเอง เพื่อไม่ให้ใช้ข้อมูลตัวอย่างเป็นข้อมูลจริงโดยไม่ตั้งใจ

## โครงสร้างที่มีอยู่

- API: Node.js, Express และ Prisma อยู่ใน \`apps/api\`
- ฐานข้อมูล: PostgreSQL
- API ใช้พอร์ต \`4000\`; หน้าเว็บ Vite ใช้ \`5173\` และ proxy \`/api\` ไปที่ API
- ตารางและ migration เริ่มต้นอยู่ใน \`apps/api/prisma\`
- ตรวจสถานะ API และฐานข้อมูลได้ที่ \`http://localhost:4000/api/health\`

## ของที่ต้องเตรียมสำหรับ Local

1. ติดตั้งและเปิด PostgreSQL ให้รับการเชื่อมต่อที่ \`localhost:5432\` แล้วสร้างฐานข้อมูล เช่น \`saveraks\`
2. ใส่ connection string ใน \`apps/api/.env\`:

   \`\`\`env
   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/saveraks?schema=public
   PORT=4000
   \`\`\`

   อย่า commit ไฟล์ \`.env\` หรือส่งรหัสผ่านฐานข้อมูลในแชต

3. สร้างตารางจาก migration:

   \`\`\`powershell
   cd D:\\Project_SaveRaks
   pnpm --filter @saveraks/api exec prisma migrate deploy
   \`\`\`

4. เปิด API และเว็บแยกกันคนละหน้าต่าง PowerShell:

   \`\`\`powershell
   pnpm --filter @saveraks/api dev
   \`\`\`

   \`\`\`powershell
   pnpm --filter @saveraks/web dev
   \`\`\`

5. เปิด \`http://localhost:5173\` และตรวจ \`http://localhost:4000/api/health\` ให้รายงานว่าเชื่อมฐานข้อมูลแล้ว

## ข้อมูลโรงเรียนที่ต้องเตรียม

- รายชื่อนักเรียนจากแหล่งทางการ: รหัสนักเรียน 5 หลัก, คำนำหน้า, ชื่อ, นามสกุล, ระดับชั้น และห้องเรียน เพื่อบันทึกใน \`StudentsMaster\`
- รายการรางวัลที่อนุมัติแล้ว: ชื่อ รายละเอียด ราคาคะแนน จำนวนคงเหลือ และภาพที่มีสิทธิ์ใช้งาน
- ขั้นตอนสร้างบัญชี ADMIN เริ่มต้น: ตอนนี้ endpoint สมัครเจ้าหน้าที่สร้าง role \`STAFF\` เท่านั้น และไม่มี bootstrap command สำหรับ ADMIN
- นโยบายคะแนน/CO₂ และผู้มีสิทธิ์ตรวจหลักฐาน
- ถ้าต้องการให้แผนที่แสดงตำแหน่งถังหรือสถานีที่กำหนดไว้ล่วงหน้า ต้องเตรียมพิกัดจริงและเพิ่มแหล่งข้อมูลนั้นด้วย ปัจจุบันหน้าแผนที่แสดงรายงานที่ผู้ใช้ส่งเข้าระบบ ไม่ได้มีชุดพิกัดสถานีโรงเรียนที่ยืนยันแล้ว

อย่านำรายชื่อนักเรียนจริงใส่ใน repository สาธารณะหรือ seed script โดยไม่ผ่านการอนุมัติด้านข้อมูลส่วนบุคคล

## สิ่งที่ต้องแก้ก่อนใช้ข้อมูลจริง

- \`apps/api/prisma/seed.js\` มีรายชื่อและรายการตัวอย่างสำหรับพัฒนา ไม่ใช่บัญชีหรือ roster จริง อย่ารันกับฐานข้อมูลโรงเรียนจนกว่าจะเปลี่ยนเป็นข้อมูลที่โรงเรียนอนุมัติ
- หน้าสมัครเจ้าหน้าที่ตรวจ \`STAFF_INVITE_SECRET\`; ตั้งรหัสเชิญและส่งให้เฉพาะเจ้าหน้าที่ที่ได้รับอนุญาต
- ไม่มี endpoint สำหรับสร้าง ADMIN คนแรก ต้องกำหนดวิธี bootstrap ที่ปลอดภัยก่อนเปิดระบบจริง
- Storage service เรียก Cloudinary แบบ dynamic import แต่ \`cloudinary\` ยังไม่อยู่ใน dependencies ของ API และยังไม่มี adapter S3/MinIO ที่ใช้งานได้จริง แม้ config จะมีชื่อ provider เหล่านั้น
- โหมด \`mock\` ใช้ data URI สำหรับภาพ เหมาะกับการพัฒนาเท่านั้น; production ต้องมี persistent object storage และเพิ่ม SDK/adapter ให้ตรงกับ provider

## ค่าตั้งต้นตามสภาพแวดล้อม

### จำเป็นสำหรับ production

- \`DATABASE_URL\`: PostgreSQL ที่สำรองข้อมูลและเข้าถึงได้จาก API
- \`NODE_ENV=production\`
- \`JWT_SECRET\`: สุ่มใหม่และยาวอย่างน้อย 32 ตัวอักษร
- \`STAFF_INVITE_SECRET\`: สุ่มใหม่และยาวอย่างน้อย 16 ตัวอักษร
- \`CORS_ALLOWED_ORIGINS\`: โดเมนเว็บจริง
- \`STORAGE_PROVIDER\` และ credential ของ object storage ที่ติดตั้ง adapter แล้ว
- \`VITE_API_URL\`: URL ของ API สำหรับ build หน้าเว็บ

### เพิ่มตามฟีเจอร์ที่โรงเรียนเปิดใช้

- \`GROQ_API_KEY\` หรือ \`GEMINI_API_KEY\`: วิเคราะห์ภาพจริง; หากไม่มี provider ระบบจะส่งผลเข้าคิวตรวจสอบ ไม่ควรแสดงว่า AI วิเคราะห์สำเร็จ
- \`GOOGLE_CLIENT_ID\` ที่ API และ \`VITE_GOOGLE_CLIENT_ID\` ที่เว็บ: ใช้เมื่อเปิด Google sign-in
- Cloudinary: \`CLOUDINARY_CLOUD_NAME\`, \`CLOUDINARY_API_KEY\`, \`CLOUDINARY_API_SECRET\` หลังเพิ่ม dependency และยืนยันการอัปโหลดแล้ว

ห้ามใส่ secret ลงในตัวแปร \`VITE_*\` เพราะค่ากลุ่มนี้ถูก bundle ไปกับ JavaScript ฝั่ง browser

## สถานะเครื่องที่ตรวจล่าสุด

ขณะตรวจครั้งนี้ไม่มี service กำลัง listen ที่พอร์ต \`4000\` หรือ \`5432\` จึงยังเปิดเว็บที่เชื่อมฐานข้อมูลจริงครบ flow ไม่ได้ ต้องเปิด PostgreSQL ก่อน แล้วค่อยรัน migration และ API ตามลำดับข้างต้น
