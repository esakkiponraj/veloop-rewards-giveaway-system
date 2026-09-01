import mongoose from 'mongoose';

const giveawaySchema = new mongoose.Schema(
  {
    giveawayId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subtitle: {
      type: String,
      default: 'Complete eligible activities, use your reward balance, and win exclusive rewards.',
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'ACTIVE', 'ENDED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: true,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    totalParticipants: {
      type: Number,
      default: 8540,
    },
    totalPrizesAwarded: {
      type: Number,
      default: 1240,
    },
    prizes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prize',
      },
    ],
    rules: [
      {
        title: String,
        description: String,
      },
    ],
    termsAndConditions: [
      {
        section: String,
        content: String,
      },
    ],
    importantInformation: [
      {
        title: String,
        content: String,
      },
    ],
    faq: [
      {
        question: String,
        answer: String,
      },
    ],
    winnerAnnouncements: [
      {
        id: String,
        maskedUserId: String,
        prizeName: String,
        avatarColor: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Giveaway = mongoose.model('Giveaway', giveawaySchema);
export default Giveaway;
