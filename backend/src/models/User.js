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
    name: {
      type: String,
      trim: true,
      default: '',
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: function () {
        // Password required if LOCAL auth provider is active and no Google ID is present
        return !this.googleId && (this.authProviders ? this.authProviders.includes('LOCAL') : true);
      },
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
    authProviders: {
      type: [String],
      enum: ['LOCAL', 'GOOGLE'],
      default: ['LOCAL'],
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
      default: undefined,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    wallet: {
      VEs: {
        type: Number,
        default: 0,
        min: 0,
      },
      SVEs: {
        type: Number,
        default: 0,
        min: 0,
      },
      Tokens: {
        type: Number,
        default: 0,
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
  if (!this.password || !this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password || !enteredPassword) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
