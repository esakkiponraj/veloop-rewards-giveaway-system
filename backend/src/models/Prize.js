import mongoose from 'mongoose';

const prizeSchema = new mongoose.Schema(
  {
    prizeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    giveawayId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      index: true,
    },
    tagline: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: true,
    },
    specifications: [
      {
        label: String,
        value: String,
      },
    ],
    position: {
      type: String,
      enum: ['1st Prize', '2nd Prize', '3rd Prize', 'Lucky Draw', 'Special Reward', 'Milestone Reward'],
      default: '1st Prize',
    },
    positionRank: {
      type: Number,
      default: 1,
    },
    image: {
      type: String,
      required: true,
    },
    accentColor: {
      type: String,
      default: '#8b5cf6',
    },
    prizeType: {
      type: String,
      enum: ['PHYSICAL', 'GIFT_CARD', 'DIGITAL'],
      required: true,
      default: 'PHYSICAL',
    },
    entryCurrency: {
      type: String,
      enum: ['VEs', 'SVEs', 'Tokens'],
      required: true,
      default: 'VEs',
    },
    entryAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    winnerCount: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    claimType: {
      type: String,
      enum: ['SHIPPING_ADDRESS', 'EMAIL_DELIVERY', 'IN_APP_VOUCHER'],
      default: 'SHIPPING_ADDRESS',
    },
    marketValue: {
      type: String,
      default: '₹0',
    },
    isPendingConfirmation: {
      type: Boolean,
      default: false,
    },
    pendingConfirmationNote: {
      type: String,
      default: '',
    },
    eligibilityNotes: {
      type: String,
      default: 'Open to verified VELOOP members in eligible regions.',
    },
  },
  {
    timestamps: true,
  }
);

const Prize = mongoose.model('Prize', prizeSchema);
export default Prize;
