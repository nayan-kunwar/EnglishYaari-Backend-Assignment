import { connectDB, disconnectDB } from '../config/db';
import { env } from '../config/env';
import { Session } from '../models/session.model';
import { Teacher } from '../models/teacher.model';
import { User } from '../models/user.model';

const utcDate = (dayOffset: number, hour: number): Date => {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + dayOffset,
      hour,
      0,
      0,
      0,
    ),
  );
};

const seed = async (): Promise<void> => {
  await connectDB();

  await Promise.all([
    Session.deleteMany({}),
    User.deleteMany({}),
    Teacher.deleteMany({}),
  ]);

  const [aarav, priya] = await User.create([
    {
      fullName: 'Aarav Sharma',
      email: 'aarav@example.com',
      phone: '+919876543210',
    },
    {
      fullName: 'Priya Verma',
      email: 'priya@example.com',
      phone: '+919876543211',
    },
  ]);

  const [rohan, neha, arjun] = await Teacher.create([
    {
      fullName: 'Rohan Mehta',
      email: 'rohan@example.com',
      specialization: 'Spoken English',
      experience: 8,
    },
    {
      fullName: 'Neha Kapoor',
      email: 'neha@example.com',
      specialization: 'Business English',
      experience: 5,
    },
    {
      fullName: 'Arjun Rao',
      email: 'arjun@example.com',
      specialization: 'IELTS Preparation',
      experience: 10,
    },
  ]);

  await Session.create([
    {
      teacherId: rohan._id,
      userId: null,
      startTime: utcDate(0, 9),
      endTime: utcDate(0, 10),
      status: 'AVAILABLE',
    },
    {
      teacherId: neha._id,
      userId: null,
      startTime: utcDate(0, 11),
      endTime: utcDate(0, 12),
      status: 'AVAILABLE',
    },
    {
      teacherId: arjun._id,
      userId: null,
      startTime: utcDate(0, 16),
      endTime: utcDate(0, 17),
      status: 'AVAILABLE',
    },
    {
      teacherId: arjun._id,
      userId: aarav._id,
      startTime: utcDate(0, 14),
      endTime: utcDate(0, 15),
      status: 'BOOKED',
      completedAt: null,
    },
    {
      teacherId: rohan._id,
      userId: null,
      startTime: utcDate(1, 10),
      endTime: utcDate(1, 11),
      status: 'AVAILABLE',
    },
    {
      teacherId: neha._id,
      userId: aarav._id,
      startTime: utcDate(-1, 10),
      endTime: utcDate(-1, 11),
      status: 'COMPLETED',
      completedAt: utcDate(-1, 11),
    },
    {
      teacherId: rohan._id,
      userId: priya._id,
      startTime: utcDate(-1, 12),
      endTime: utcDate(-1, 13),
      status: 'COMPLETED',
      completedAt: utcDate(-1, 13),
    },
  ]);

  const todayStart = utcDate(0, 0).getTime();

  console.log('Seed complete.\n');
  console.log(`Users:    ${aarav.email} (${aarav._id}), ${priya.email} (${priya._id})`);
  console.log(`Teachers: ${rohan.email} (${rohan._id}), ${neha.email} (${neha._id}), ${arjun.email} (${arjun._id})`);
  console.log('\nAvailable sessions for today (UTC):');
  console.log(
    `  curl "http://localhost:${env.port}/sessions/available?dateTimestamp=${todayStart}"`,
  );
  console.log(`\nAarav's sessions:`);
  console.log(`  curl "http://localhost:${env.port}/users/${aarav._id}/sessions"`);
};

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
