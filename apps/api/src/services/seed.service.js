/**
 * Auto-Seed Service for SaveRaks
 * Checks if the database is unseeded (e.g. fresh PostgreSQL instance)
 * and seeds baseline students, badges, and reward items automatically.
 */
import { prisma } from '../config/prisma.js';
import { BADGE_DEFINITIONS } from '@saveraks/shared/constants';

export async function autoSeedIfEmpty() {
  try {
    const studentCount = await prisma.studentsMaster.count();
    if (studentCount > 0) {
      return; // Already seeded
    }

    console.log('🌱 Database is empty. Running automatic seed for Surasakmontree School...');

    // 1. Seed Master Student Roster
    const students = [
      { studentId: '53580', prefix: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี', gradeLevel: 'ม.4', classroom: '4/2' },
      { studentId: '53581', prefix: 'น.ส.', firstName: 'วิภาวดี', lastName: 'รักดี', gradeLevel: 'ม.4', classroom: '4/2' },
      { studentId: '53582', prefix: 'นาย', firstName: 'กิตติศักดิ์', lastName: 'มั่นคง', gradeLevel: 'ม.5', classroom: '5/1' },
      { studentId: '53583', prefix: 'น.ส.', firstName: 'ชลธิชา', lastName: 'ศรีสุข', gradeLevel: 'ม.5', classroom: '5/1' },
      { studentId: '53584', prefix: 'นาย', firstName: 'ธนากร', lastName: 'สว่างจิต', gradeLevel: 'ม.6', classroom: '6/3' },
      { studentId: '53585', prefix: 'ด.ช.', firstName: 'พงศธร', lastName: 'รักษ์โลก', gradeLevel: 'ม.1', classroom: '1/4' },
      { studentId: '53586', prefix: 'ด.ญ.', firstName: 'กัญญารัตน์', lastName: 'สดใส', gradeLevel: 'ม.2', classroom: '2/2' },
      { studentId: '53587', prefix: 'นาย', firstName: 'ณัฐพล', lastName: 'ขยันเรียน', gradeLevel: 'ม.3', classroom: '3/1' },
    ];

    for (const student of students) {
      await prisma.studentsMaster.upsert({
        where: { studentId: student.studentId },
        update: {},
        create: student,
      });
    }

    // 2. Seed Badges
    const badges = Object.values(BADGE_DEFINITIONS);
    for (const badge of badges) {
      await prisma.badge.upsert({
        where: { code: badge.code },
        update: {},
        create: {
          code: badge.code,
          name: badge.nameThai,
          description: badge.description,
          icon: badge.icon,
          triggerType: badge.triggerType,
          triggerThreshold: badge.triggerThreshold,
        },
      });
    }

    // 3. Seed Rewards
    const rewards = [
      {
        title: 'คะแนนพฤติกรรม (+10 คะแนน)',
        description: 'เพิ่มคะแนนความประพฤติ 10 คะแนน ยื่นรับรอง ณ ฝ่ายกิจการนักเรียน',
        cost: 100,
        stock: 50,
        imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&q=80',
      },
      {
        title: 'คูปองขนมร้านสวัสดิการโรงเรียน',
        description: 'คูปองมูลค่า 20 บาท แลกซื้อเครื่องดื่มหรือของว่าง ณ ห้องสวัสดิการ',
        cost: 200,
        stock: 30,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
      },
      {
        title: 'พวงกุญแจ / กล่องจุ่มรักษ์โลก',
        description: 'พวงกุญแจ Upcycling ทำจากฝาขวดพลาสติกรีไซเคิลของโรงเรียน',
        cost: 300,
        stock: 25,
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
      },
      {
        title: 'เกียรติบัตรรับรอง Eco-Guardian',
        description: 'เกียรติบัตรทางการลงนามโดยผู้อำนวยการโรงเรียนสุรศักดิ์มนตรี',
        cost: 500,
        stock: 100,
        imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80',
      },
      {
        title: 'ชุดเครื่องเขียนรักษ์โลก',
        description: 'สมุดรีไซเคิลและชุดปากกาหมึกเจลคุณภาพสูงสำหรับนักเรียน',
        cost: 800,
        stock: 15,
        imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=80',
      },
      {
        title: 'แก้วน้ำเก็บความเย็น SaveRaks Edition',
        description: 'กระบอกน้ำสแตนเลสเก็บอุณหภูมิร้อน-เย็น ลายพิเศษ SaveRaks',
        cost: 1000,
        stock: 10,
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80',
      },
    ];

    for (const reward of rewards) {
      const existing = await prisma.rewardItem.findFirst({ where: { title: reward.title } });
      if (!existing) {
        await prisma.rewardItem.create({ data: reward });
      }
    }

    console.log('✅ Automatic database seeding completed successfully.');
  } catch (err) {
    console.warn('⚠️ Auto-seed deferred or database not ready yet:', err.message);
  }
}
