import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app';
import { Session } from '../src/models/session.model';
import { Teacher } from '../src/models/teacher.model';
import { User } from '../src/models/user.model';

let mongoServer: MongoMemoryServer | undefined;

// Fixed dates keep the aggregation day-range tests deterministic.
const FIXED_DAY_START = Date.UTC(2030, 0, 15);
const DAY_MS = 24 * 60 * 60 * 1000;

const at = (hour: number, dayOffset = 0): Date =>
  new Date(FIXED_DAY_START + dayOffset * DAY_MS + hour * 60 * 60 * 1000);

const uniqueEmail = (prefix: string): string =>
  `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;

const createUserDoc = (email = uniqueEmail('user')) =>
  User.create({
    fullName: 'Test User',
    email,
    phone: '+919876543210',
  });

const createTeacherDoc = (email = uniqueEmail('teacher')) =>
  Teacher.create({
    fullName: 'Test Teacher',
    email,
    specialization: 'Spoken English',
    experience: 5,
  });

const createSessionDoc = async (
  teacherId: mongoose.Types.ObjectId,
  options: {
    startTime?: Date;
    endTime?: Date;
    status?: 'AVAILABLE' | 'BOOKED' | 'COMPLETED';
    userId?: mongoose.Types.ObjectId | null;
    completedAt?: Date | null;
  } = {},
) =>
  Session.create({
    teacherId,
    userId: options.userId ?? null,
    startTime: options.startTime ?? at(10),
    endTime: options.endTime ?? at(11),
    status: options.status ?? 'AVAILABLE',
    completedAt: options.completedAt ?? null,
  });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([User.init(), Teacher.init(), Session.init()]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Teacher.deleteMany({}),
    Session.deleteMany({}),
  ]);
});

describe('Health', () => {
  it('returns 200 with an ok status', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });
});

describe('POST /users', () => {
  it('creates a user and returns 201', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        fullName: 'Aarav Sharma',
        email: 'Aarav@Example.com',
        phone: '+919876543210',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('aarav@example.com');
    expect(await User.countDocuments()).toBe(1);
  });

  it('rejects a duplicate email with 409 (case-insensitive)', async () => {
    await request(app)
      .post('/users')
      .send({
        fullName: 'First User',
        email: 'duplicate@example.com',
        phone: '+919876543210',
      })
      .expect(201);

    const response = await request(app)
      .post('/users')
      .send({
        fullName: 'Second User',
        email: 'DUPLICATE@example.com',
        phone: '+919876543211',
      })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/already exists/i);
  });

  it('returns 400 with field errors for invalid input', async () => {
    const response = await request(app)
      .post('/users')
      .send({ fullName: 'A', email: 'not-an-email', phone: '12' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.errors).toBeInstanceOf(Array);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });
});

describe('POST /teachers (supporting endpoint)', () => {
  it('creates a teacher', async () => {
    const response = await request(app)
      .post('/teachers')
      .send({
        fullName: 'Neha Kapoor',
        email: 'neha@example.com',
        specialization: 'Business English',
        experience: 6,
      })
      .expect(201);

    expect(response.body.data.specialization).toBe('Business English');
  });

  it('rejects a duplicate teacher email with 409', async () => {
    const teacher = await createTeacherDoc('teacher.dup@example.com');

    await request(app)
      .post('/teachers')
      .send({
        fullName: teacher.fullName,
        email: 'TEACHER.DUP@example.com',
        specialization: teacher.specialization,
        experience: teacher.experience,
      })
      .expect(409);
  });
});

describe('POST /sessions', () => {
  it('creates an AVAILABLE session when the teacher exists', async () => {
    const teacher = await createTeacherDoc();

    const response = await request(app)
      .post('/sessions')
      .send({
        teacherId: teacher._id.toString(),
        startTime: at(10).toISOString(),
        endTime: at(11).toISOString(),
      })
      .expect(201);

    expect(response.body.data.status).toBe('AVAILABLE');
    expect(response.body.data.userId).toBeNull();
    expect(response.body.data.teacherId).toBe(teacher._id.toString());
  });

  it('returns 404 when the teacher does not exist', async () => {
    const response = await request(app)
      .post('/sessions')
      .send({
        teacherId: new mongoose.Types.ObjectId().toString(),
        startTime: at(10).toISOString(),
        endTime: at(11).toISOString(),
      })
      .expect(404);

    expect(response.body.message).toMatch(/teacher not found/i);
  });

  it('returns 400 when endTime is not after startTime', async () => {
    const teacher = await createTeacherDoc();

    const response = await request(app)
      .post('/sessions')
      .send({
        teacherId: teacher._id.toString(),
        startTime: at(11).toISOString(),
        endTime: at(11).toISOString(),
      })
      .expect(400);

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'endTime' }),
      ]),
    );
  });
});

describe('GET /sessions/available', () => {
  it('returns only AVAILABLE sessions for the requested UTC day', async () => {
    const teacher = await createTeacherDoc();
    const user = await createUserDoc();

    const available = await createSessionDoc(teacher._id, {
      startTime: at(9),
      endTime: at(10),
    });
    await createSessionDoc(teacher._id, {
      startTime: at(11),
      endTime: at(12),
      status: 'BOOKED',
      userId: user._id,
    });
    await createSessionDoc(teacher._id, {
      startTime: at(13, 1),
      endTime: at(14, 1),
    });

    const response = await request(app)
      .get(`/sessions/available?dateTimestamp=${FIXED_DAY_START}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]._id).toBe(available._id.toString());
    expect(response.body.data[0].teacher.fullName).toBe(teacher.fullName);
  });

  it('accepts an ISO-8601 dateTimestamp', async () => {
    const teacher = await createTeacherDoc();
    await createSessionDoc(teacher._id);

    const response = await request(app)
      .get(
        `/sessions/available?dateTimestamp=${new Date(FIXED_DAY_START).toISOString()}`,
      )
      .expect(200);

    expect(response.body.data).toHaveLength(1);
  });

  it('returns 400 when dateTimestamp is missing', async () => {
    const response = await request(app)
      .get('/sessions/available')
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('returns 400 when dateTimestamp is invalid', async () => {
    await request(app)
      .get('/sessions/available?dateTimestamp=not-a-date')
      .expect(400);
  });
});

describe('POST /sessions/:id/book', () => {
  it('books an available session', async () => {
    const teacher = await createTeacherDoc();
    const user = await createUserDoc();
    const session = await createSessionDoc(teacher._id);

    const response = await request(app)
      .post(`/sessions/${session._id}/book`)
      .send({ userId: user._id.toString() })
      .expect(200);

    expect(response.body.data.status).toBe('BOOKED');
    expect(response.body.data.userId).toBe(user._id.toString());

    const stored = await Session.findById(session._id);
    expect(stored?.status).toBe('BOOKED');
  });

  it('returns 404 when the user does not exist', async () => {
    const teacher = await createTeacherDoc();
    const session = await createSessionDoc(teacher._id);

    await request(app)
      .post(`/sessions/${session._id}/book`)
      .send({ userId: new mongoose.Types.ObjectId().toString() })
      .expect(404);
  });

  it('returns 404 when the session does not exist', async () => {
    const user = await createUserDoc();

    await request(app)
      .post(`/sessions/${new mongoose.Types.ObjectId().toString()}/book`)
      .send({ userId: user._id.toString() })
      .expect(404);
  });

  it('rejects booking an already booked session with 409', async () => {
    const teacher = await createTeacherDoc();
    const user = await createUserDoc();
    const session = await createSessionDoc(teacher._id, {
      status: 'BOOKED',
      userId: user._id,
    });

    const response = await request(app)
      .post(`/sessions/${session._id}/book`)
      .send({ userId: user._id.toString() })
      .expect(409);

    expect(response.body.message).toMatch(/status is BOOKED/i);
  });

  it('allows exactly one of two concurrent bookings to succeed', async () => {
    const teacher = await createTeacherDoc();
    const user = await createUserDoc();
    const session = await createSessionDoc(teacher._id);

    const [first, second] = await Promise.all([
      request(app)
        .post(`/sessions/${session._id}/book`)
        .send({ userId: user._id.toString() }),
      request(app)
        .post(`/sessions/${session._id}/book`)
        .send({ userId: user._id.toString() }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);

    const stored = await Session.findById(session._id);
    expect(stored?.status).toBe('BOOKED');
  });
});

describe('PATCH /sessions/:id/complete', () => {
  it('marks a booked session as COMPLETED and sets completedAt', async () => {
    const teacher = await createTeacherDoc();
    const user = await createUserDoc();
    const session = await createSessionDoc(teacher._id, {
      status: 'BOOKED',
      userId: user._id,
    });

    const response = await request(app)
      .patch(`/sessions/${session._id}/complete`)
      .expect(200);

    expect(response.body.data.status).toBe('COMPLETED');
    expect(response.body.data.completedAt).toBeTruthy();

    const stored = await Session.findById(session._id);
    expect(stored?.completedAt).toBeInstanceOf(Date);
  });

  it('returns 409 when the session is not BOOKED', async () => {
    const teacher = await createTeacherDoc();
    const session = await createSessionDoc(teacher._id);

    const response = await request(app)
      .patch(`/sessions/${session._id}/complete`)
      .expect(409);

    expect(response.body.message).toMatch(/AVAILABLE/i);
  });

  it('returns 404 when the session does not exist', async () => {
    await request(app)
      .patch(`/sessions/${new mongoose.Types.ObjectId().toString()}/complete`)
      .expect(404);
  });
});

describe('GET /users/:id/sessions', () => {
  it('splits booked and completed sessions into the correct groups', async () => {
    const teacher = await createTeacherDoc();
    const user = await createUserDoc();

    const upcoming = await createSessionDoc(teacher._id, {
      startTime: at(10, 1),
      endTime: at(11, 1),
      status: 'BOOKED',
      userId: user._id,
    });
    const completed = await createSessionDoc(teacher._id, {
      startTime: at(10, -1),
      endTime: at(11, -1),
      status: 'COMPLETED',
      userId: user._id,
      completedAt: at(11, -1),
    });
    await createSessionDoc(teacher._id, {
      startTime: at(12),
      endTime: at(13),
    });

    const response = await request(app)
      .get(`/users/${user._id}/sessions`)
      .expect(200);

    const { upcomingSessions, completedSessions } = response.body.data;

    expect(upcomingSessions).toHaveLength(1);
    expect(completedSessions).toHaveLength(1);
    expect(upcomingSessions[0]._id).toBe(upcoming._id.toString());
    expect(upcomingSessions[0].status).toBe('BOOKED');
    expect(upcomingSessions[0].teacher).toBeTruthy();
    expect(completedSessions[0]._id).toBe(completed._id.toString());
    expect(completedSessions[0].status).toBe('COMPLETED');
    expect(completedSessions[0].teacher).toBeTruthy();
  });

  it('returns 404 for an unknown user', async () => {
    await request(app)
      .get(`/users/${new mongoose.Types.ObjectId().toString()}/sessions`)
      .expect(404);
  });

  it('returns 400 for an invalid user id', async () => {
    await request(app).get('/users/not-an-object-id/sessions').expect(400);
  });
});
