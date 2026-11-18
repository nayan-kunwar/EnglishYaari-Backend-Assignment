import type { PipelineStage, Types } from 'mongoose';
import { Types as MongooseTypes } from 'mongoose';

import { Session } from '../models/session.model';
import { Teacher } from '../models/teacher.model';
import { User } from '../models/user.model';
import { ApiError } from '../utils/ApiError';
import { getUtcDayRange } from '../utils/dateRange';
import { assertObjectId } from '../utils/objectId';
import type { CreateSessionInput } from '../validators/session.validator';

export interface TeacherSummary {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  specialization: string;
  experience: number;
}

export interface SessionWithTeacher {
  _id: Types.ObjectId;
  teacherId: Types.ObjectId;
  userId: Types.ObjectId | null;
  startTime: Date;
  endTime: Date;
  status: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  teacher: TeacherSummary;
}

interface UserSessionGroups {
  upcomingSessions: SessionWithTeacher[];
  completedSessions: SessionWithTeacher[];
}

/**
 * Joins teacher details and keeps the response shape consistent across the
 * two aggregation-backed endpoints.
 */
const teacherLookupStages = (): PipelineStage.FacetPipelineStage[] => [
  {
    $lookup: {
      from: 'teachers',
      localField: 'teacherId',
      foreignField: '_id',
      as: 'teacher',
    },
  },
  { $unwind: '$teacher' },
  {
    $project: {
      _id: 1,
      teacherId: 1,
      userId: 1,
      startTime: 1,
      endTime: 1,
      status: 1,
      completedAt: 1,
      createdAt: 1,
      updatedAt: 1,
      teacher: {
        _id: '$teacher._id',
        fullName: '$teacher.fullName',
        email: '$teacher.email',
        specialization: '$teacher.specialization',
        experience: '$teacher.experience',
      },
    },
  },
];

export const createSession = async (input: CreateSessionInput) => {
  const teacherExists = await Teacher.exists({ _id: input.teacherId });

  if (!teacherExists) {
    throw new ApiError(404, 'Teacher not found');
  }

  return Session.create({
    teacherId: input.teacherId,
    startTime: input.startTime,
    endTime: input.endTime,
    status: 'AVAILABLE',
    userId: null,
  });
};

/**
 * GET /sessions/available — implemented with an aggregation pipeline.
 */
export const getAvailableSessions = async (
  date: Date,
): Promise<SessionWithTeacher[]> => {
  const { start, end } = getUtcDayRange(date);

  return Session.aggregate<SessionWithTeacher>([
    {
      $match: {
        status: 'AVAILABLE',
        userId: null,
        startTime: { $gte: start, $lt: end },
      },
    },
    { $sort: { startTime: 1 } },
    ...teacherLookupStages(),
  ]);
};

/**
 * Books a session atomically: the status check and update happen in a single
 * MongoDB operation, so two concurrent requests cannot both succeed.
 */
export const bookSession = async (sessionId: string, userId: string) => {
  assertObjectId(sessionId, 'session id');
  assertObjectId(userId, 'user id');

  const userExists = await User.exists({ _id: userId });

  if (!userExists) {
    throw new ApiError(404, 'User not found');
  }

  const session = await Session.findOneAndUpdate(
    { _id: sessionId, status: 'AVAILABLE' },
    { $set: { status: 'BOOKED', userId } },
    { new: true },
  );

  if (!session) {
    const existingSession = await Session.findById(sessionId)
      .select('status')
      .lean();

    if (!existingSession) {
      throw new ApiError(404, 'Session not found');
    }

    throw new ApiError(
      409,
      `Session cannot be booked because its status is ${existingSession.status}`,
    );
  }

  return session;
};

/**
 * Completes a booked session atomically, preventing duplicate transitions.
 */
export const completeSession = async (sessionId: string) => {
  assertObjectId(sessionId, 'session id');

  const session = await Session.findOneAndUpdate(
    { _id: sessionId, status: 'BOOKED' },
    { $set: { status: 'COMPLETED', completedAt: new Date() } },
    { new: true },
  );

  if (!session) {
    const existingSession = await Session.findById(sessionId)
      .select('status')
      .lean();

    if (!existingSession) {
      throw new ApiError(404, 'Session not found');
    }

    throw new ApiError(
      409,
      `Only BOOKED sessions can be completed (current status: ${existingSession.status})`,
    );
  }

  return session;
};

/**
 * GET /users/:id/sessions — implemented with an aggregation pipeline using
 * $facet to return upcoming and completed sessions in one round trip.
 */
export const getUserSessions = async (
  userId: string,
): Promise<UserSessionGroups> => {
  assertObjectId(userId, 'user id');

  const userExists = await User.exists({ _id: userId });

  if (!userExists) {
    throw new ApiError(404, 'User not found');
  }

  const [result] = await Session.aggregate<UserSessionGroups>([
    { $match: { userId: new MongooseTypes.ObjectId(userId) } },
    {
      $facet: {
        upcomingSessions: [
          { $match: { status: 'BOOKED' } },
          { $sort: { startTime: 1 } },
          ...teacherLookupStages(),
        ],
        completedSessions: [
          { $match: { status: 'COMPLETED' } },
          { $sort: { completedAt: -1 } },
          ...teacherLookupStages(),
        ],
      },
    },
    { $project: { _id: 0, upcomingSessions: 1, completedSessions: 1 } },
  ]);

  return (
    result ?? {
      upcomingSessions: [],
      completedSessions: [],
    }
  );
};
