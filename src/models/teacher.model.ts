import { Schema, model } from 'mongoose';

export interface ITeacher {
  fullName: string;
  email: string;
  specialization: string;
  experience: number;
  createdAt: Date;
  updatedAt: Date;
}

const teacherSchema = new Schema<ITeacher>(
  {
    fullName: {
      type: String,
      required: [true, 'fullName is required'],
      trim: true,
      minlength: [2, 'fullName must be at least 2 characters long'],
      maxlength: [100, 'fullName must be at most 100 characters long'],
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'specialization is required'],
      trim: true,
      maxlength: [100, 'specialization must be at most 100 characters long'],
    },
    experience: {
      type: Number,
      required: [true, 'experience is required'],
      min: [0, 'experience cannot be negative'],
      max: [70, 'experience cannot exceed 70 years'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Teacher = model<ITeacher>('Teacher', teacherSchema);
