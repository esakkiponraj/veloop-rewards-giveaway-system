import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    maskedId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    wallet: {
      VEs: {
        type: Number,
        default: 850,
        min: 0,
      },
      SVEs: {
        type: Number,
        default: 1200,
        min: 0,
      },
      Tokens: {
        type: Number,
        default: 5000,
        min: 0,
      },
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastDailyBonusAt: {
      type: Date,
      default: null,
    },
    deviceHistory: [
      {
        deviceHash: String,
        lastSeenAt: { type: Date, default: Date.now },
        ipAddress: String,
      },
    ],
    isFraudSuspended: {
      type: Boolean,
      default: false,
    },
    fraudRiskScore: {
      type: Number,
      default: 10, // 0 - 100
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
