import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    description: {
      type: String
    },

    visibility: {
      type: String,
      enum: ["Public", "Private"],
      default: "Private"
    },

    deadline: Date,

    status: {
      type: String,
      enum: ["Planning", "Active", "At Risk", "Completed", "Archived"],
      default: "Active"
    },

    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    favorite: {
      type: Boolean,
      default: false
    },

    archived: {
      type: Boolean,
      default: false
    },

    team: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        role: {
          type: String,
          enum: ["admin", "manager", "member"],
          default: "member"
        }
      }
    ],

    invitedEmails: [
      {
        email: String,
        role: {
          type: String,
          enum: ["manager", "member"],
          default: "member"
        },
        invitedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    activitySummary: {
      type: String
    },

    isDemo: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

projectSchema.index({ createdBy: 1, updatedAt: -1 });
projectSchema.index({ "team.user": 1, updatedAt: -1 });
projectSchema.index({ visibility: 1, updatedAt: -1 });

export default mongoose.model(
  "Project",
  projectSchema
);