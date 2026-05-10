import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["auth", "project", "task", "team", "notification"],
      default: "project"
    },
    action: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project"
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task"
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
