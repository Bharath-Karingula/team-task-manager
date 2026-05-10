import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["admin", "manager", "member"],
      default: "member"
    },

    avatar: {
      type: String
    },

    emailVerified: {
      type: Boolean,
      default: false
    },

    emailVerificationToken: String,
    emailVerificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    refreshTokens: [
      {
        tokenHash: String,
        sessionId: String,
        device: String,
        rememberMe: Boolean,
        expiresAt: Date,
        createdAt: {
          type: Date,
          default: Date.now
        },
        lastUsedAt: Date
      }
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model("User", userSchema);
