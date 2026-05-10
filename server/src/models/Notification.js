import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "due_soon",
        "mention",
        "project_invitation",
        "status_changed",
        "deadline_updated"
      ],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project"
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task"
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

export default mongoose.model("Notification", notificationSchema);
