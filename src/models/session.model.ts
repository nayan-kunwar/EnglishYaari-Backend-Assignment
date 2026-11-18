import { Schema, Types, model } from 'mongoose';

export const SESSION_STATUSES = ['AVAILABLE', 'BOOKED', 'COMPLETED'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export interface ISession {
  teacherId: Types.ObjectId;
  userId: Types.ObjectId | null;
  startTime: Date;
  endTime: Date;
  status: SessionStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'teacherId is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startTime: {
      type: Date,
      required: [true, 'startTime is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'endTime is required'],
    },
    status: {
      type: String,
      enum: {
        values: SESSION_STATUSES,
        message: `status must be one of: ${SESSION_STATUSES.join(', ')}`,
      },
      default: 'AVAILABLE',
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

sessionSchema.pre('validate', function validateTimeRange(next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate('endTime', 'endTime must be greater than startTime');
  }

  next();
});

// Supports GET /sessions/available (status + day range, sorted by start time).
sessionSchema.index({ status: 1, startTime: 1 });
// Supports GET /users/:id/sessions (filter by user, then by status).
sessionSchema.index({ userId: 1, status: 1, startTime: 1 });

export const Session = model<ISession>('Session', sessionSchema);
