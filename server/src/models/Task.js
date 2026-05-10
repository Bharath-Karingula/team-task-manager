import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    description: {
      type: String
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium"
    },

    status: {
      type: String,
      enum: [
        "Todo",
        "In Progress",
        "Review",
        "Completed"
      ],
      default: "Todo"
    },

    dueDate: Date,

    labels: [
      {
        type: String,
        trim: true
      }
    ],

    attachments: [
      {
        name: String,
        url: String,
        type: String
      }
    ],

    assignedMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    comments: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        body: String,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    reactions: [
      {
        emoji: {
          type: String,
          required: true
        },
        users: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
          }
        ]
      }
    ],

    subtasks: [
      {
        title: String,
        completed: {
          type: Boolean,
          default: false
        }
      }
    ],

    checklist: [
      {
        title: String,
        checked: {
          type: Boolean,
          default: false
        }
      }
    ],

    statusHistory: [
      {
        from: String,
        to: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        changedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    estimatedTime: {
      type: Number,
      default: 0
    },

    trackedTime: {
      type: Number,
      default: 0
    },

    recurring: {
      enabled: {
        type: Boolean,
        default: false
      },
      cadence: {
        type: String,
        enum: ["None", "Daily", "Weekly", "Monthly"],
        default: "None"
      }
    },

    dependencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"
      }
    ],

    blockers: [
      {
        title: String,
        resolved: {
          type: Boolean,
          default: false
        }
      }
    ],

    isDemo: {
      type: Boolean,
      default: false
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project"
    }
  },
  {
    timestamps: true
  }
);

taskSchema.index({ assignedMembers: 1, updatedAt: -1 });
taskSchema.index({ projectId: 1, updatedAt: -1 });
taskSchema.index({ status: 1, updatedAt: -1 });

export default mongoose.model(
  "Task",
  taskSchema
);