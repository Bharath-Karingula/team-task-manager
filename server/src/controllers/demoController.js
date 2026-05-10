import bcrypt from "bcryptjs";

import Activity from "../models/Activity.js";
import Notification from "../models/Notification.js";
import Project from "../models/project.js";
import Task from "../models/Task.js";
import User from "../models/user.js";

const dayOffset = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const demoMembers = [
  { name: "Sai", email: "sai@teamtask.local", role: "admin" },
  { name: "Pramodh", email: "pramodh@teamtask.local", role: "manager" },
  { name: "Raj", email: "raj@teamtask.local", role: "member" },
  { name: "Rahul", email: "rahul@teamtask.local", role: "member" }
];

const avatar = (name) => `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`;

const findOrCreateDemoUser = async (member) => {
  const existing = await User.findOne({ email: member.email });
  if (existing) return existing;

  return User.create({
    ...member,
    password: await bcrypt.hash("123456", 10),
    emailVerified: true,
    avatar: avatar(member.name)
  });
};

const ensureProject = async ({ title, data, currentUser, team }) => {
  // Delete any duplicates first, keep only the first one
  const allMatches = await Project.find({ title, isDemo: true }).sort({ createdAt: 1 });
  if (allMatches.length > 1) {
    const [keep, ...dupes] = allMatches;
    await Project.deleteMany({ _id: { $in: dupes.map(d => d._id) } });
  }

  let project = await Project.findOne({ title, isDemo: true });

  if (!project) {
    project = await Project.create({
      title,
      ...data,
      isDemo: true,
      createdBy: currentUser._id,
      team,
      activitySummary: `${currentUser.name} started ${title}`
    });
    return { project, changed: true };
  }

  // Add current user to team if not already there
  const teamIds = new Set(project.team.map((member) => member.user?.toString()));
  team.forEach((member) => {
    if (!teamIds.has(member.user.toString())) {
      project.team.push(member);
    }
  });

  Object.assign(project, data);
  await project.save();
  return { project, changed: false };
};

const ensureTask = async ({ task, currentUser }) => {
  const existing = await Task.findOne({ title: task.title, projectId: task.projectId });

  if (existing) {
    existing.assignedMembers = [...new Set([...existing.assignedMembers.map(String), ...task.assignedMembers.map(String)])];
    existing.dueDate = task.dueDate;
    existing.estimatedTime = task.estimatedTime;
    existing.trackedTime = Math.max(existing.trackedTime || 0, task.trackedTime || 0);
    existing.status = task.status;
    existing.priority = task.priority;
    existing.labels = task.labels;
    await existing.save();
    return { task: existing, changed: false };
  }

  const created = await Task.create({
    ...task,
    isDemo: true,
    statusHistory: [{ from: "New", to: task.status || "Todo", changedBy: currentUser._id }]
  });
  return { task: created, changed: true };
};

export const seedDemoWorkspace = async (req, res) => {
  try {
    let changed = false;
    const demoUsers = await Promise.all(demoMembers.map(findOrCreateDemoUser));
    const byName = Object.fromEntries(demoUsers.map((user) => [user.name.toLowerCase(), user]));
    const currentRole = req.user.role === "member" ? "member" : req.user.role;

    const team = [
      { user: req.user._id, role: currentRole },
      { user: byName.sai._id, role: "admin" },
      { user: byName.pramodh._id, role: "manager" },
      { user: byName.raj._id, role: "member" },
      { user: byName.rahul._id, role: "member" }
    ];

    const projectDefinitions = [
      {
        title: "Website Redesign",
        data: {
          description: "Refresh the marketing pages and improve conversion.",
          visibility: "Private",
          deadline: dayOffset(14),
          status: "Active",
          progress: 72,
          favorite: true
        }
      },
      {
        title: "Mobile App Launch",
        data: {
          description: "Ship the beta app with onboarding, notifications, and QA.",
          visibility: "Public",
          deadline: dayOffset(28),
          status: "Planning",
          progress: 41
        }
      },
      {
        title: "Customer Support Portal",
        data: {
          description: "Create a faster issue workflow for support teams.",
          visibility: "Private",
          deadline: dayOffset(7),
          status: "At Risk",
          progress: 58
        }
      },
      {
        title: "Analytics Reporting",
        data: {
          description: "Build reporting views for project velocity and team workload.",
          visibility: "Private",
          deadline: dayOffset(21),
          status: "Active",
          progress: 49
        }
      }
    ];

    const projectResults = await Promise.all(
      projectDefinitions.map((definition) =>
        ensureProject({ ...definition, currentUser: req.user, team })
      )
    );
    changed = projectResults.some((result) => result.changed);
    const [website, mobile, support, analytics] = projectResults.map((result) => result.project);

    const taskDefinitions = [
      {
        title: "Design dashboard cards",
        description: "Create polished metric cards for the dashboard overview.",
        priority: "High",
        status: "Completed",
        dueDate: dayOffset(-1),
        labels: ["UI", "Dashboard"],
        assignedMembers: [req.user._id, byName.pramodh._id],
        projectId: website._id,
        checklist: [{ title: "Wireframe", checked: true }, { title: "Responsive pass", checked: true }],
        estimatedTime: 5,
        trackedTime: 6
      },
      {
        title: "Build project invite flow",
        description: "Allow admins and managers to invite members by email.",
        priority: "Medium",
        status: "In Progress",
        dueDate: dayOffset(2),
        labels: ["Team", "API"],
        assignedMembers: [req.user._id, byName.sai._id],
        projectId: website._id,
        checklist: [{ title: "Backend route", checked: true }, { title: "UI feedback", checked: false }],
        estimatedTime: 8,
        trackedTime: 4
      },
      {
        title: "QA mobile onboarding",
        description: "Test signup, login, and first task creation on mobile.",
        priority: "Urgent",
        status: "Review",
        dueDate: dayOffset(1),
        labels: ["QA", "Mobile"],
        assignedMembers: [req.user._id, byName.rahul._id],
        projectId: mobile._id,
        estimatedTime: 6,
        trackedTime: 5,
        blockers: [{ title: "Waiting for final icons", resolved: false }]
      },
      {
        title: "Write support portal copy",
        description: "Prepare empty states, error copy, and notification labels.",
        priority: "Low",
        status: "Todo",
        dueDate: dayOffset(5),
        labels: ["Content"],
        assignedMembers: [req.user._id, byName.raj._id],
        projectId: support._id,
        estimatedTime: 4,
        trackedTime: 2,
        recurring: { enabled: true, cadence: "Weekly" }
      },
      {
        title: "Connect notification center",
        description: "Show read/unread task and project notifications in real time.",
        priority: "High",
        status: "In Progress",
        dueDate: dayOffset(3),
        labels: ["Realtime"],
        assignedMembers: [req.user._id, byName.sai._id],
        projectId: support._id,
        estimatedTime: 7,
        trackedTime: 3
      },
      {
        title: "Create analytics chart API",
        description: "Provide task count and tracked time data for charts.",
        priority: "High",
        status: "In Progress",
        dueDate: dayOffset(4),
        labels: ["Analytics", "Backend"],
        assignedMembers: [req.user._id, byName.pramodh._id],
        projectId: analytics._id,
        estimatedTime: 9,
        trackedTime: 4
      },
      {
        title: "Review workload distribution",
        description: "Balance work across Sai, Pramodh, Raj, Rahul, and the current user.",
        priority: "Medium",
        status: "Todo",
        dueDate: dayOffset(6),
        labels: ["Planning"],
        assignedMembers: [req.user._id, byName.raj._id, byName.rahul._id],
        projectId: analytics._id,
        estimatedTime: 5,
        trackedTime: 1
      }
    ];

    const taskResults = [];
    for (const task of taskDefinitions) {
      const result = await ensureTask({ task: { ...task, isDemo: true }, currentUser: req.user });
      // Also ensure existing demo tasks are flagged
      if (!result.task.isDemo) {
        result.task.isDemo = true;
        await result.task.save();
      }
      taskResults.push(result.task);
      changed = changed || result.changed;
    }

    const assignedTask = taskResults.find((task) => task.title === "QA mobile onboarding");
    const existingNotification = await Notification.findOne({
      recipient: req.user._id,
      task: assignedTask._id,
      type: "task_assigned"
    });

    if (!existingNotification) {
      await Notification.create({
        recipient: req.user._id,
        actor: byName.pramodh._id,
        type: "task_assigned",
        title: "Task assigned",
        message: "Pramodh assigned you QA mobile onboarding",
        project: mobile._id,
        task: assignedTask._id
      });
      changed = true;
    }

    const dueNotification = await Notification.findOne({
      recipient: req.user._id,
      task: assignedTask._id,
      type: "due_soon"
    });

    if (!dueNotification) {
      await Notification.create({
        recipient: req.user._id,
        actor: byName.sai._id,
        type: "due_soon",
        title: "Task due soon",
        message: "QA mobile onboarding is due tomorrow",
        project: mobile._id,
        task: assignedTask._id
      });
      changed = true;
    }

    const existingActivity = await Activity.findOne({
      actor: req.user._id,
      action: "demo_seeded"
    });

    if (!existingActivity) {
      await Activity.insertMany([
        {
          type: "project",
          action: "demo_seeded",
          message: `${req.user.name} loaded demo projects for Sai, Pramodh, Raj, and Rahul`,
          actor: req.user._id,
          project: website._id
        },
        {
          type: "task",
          action: "status_changed",
          message: `${req.user.name} has QA mobile onboarding in Review`,
          actor: req.user._id,
          project: mobile._id,
          task: assignedTask._id
        }
      ]);
      changed = true;
    }

    if (changed) {
      req.app.get("io")?.emit("projectUpdated");
      req.app.get("io")?.emit("refreshTasks");
      req.app.get("io")?.emit("activityUpdated");
      req.app.get("io")?.emit("notificationUpdated");
    }

    res.status(changed ? 201 : 200).json({
      message: changed ? "Demo workspace updated" : "Demo workspace already up to date",
      changed,
      projects: projectResults.map((result) => result.project),
      tasks: taskResults
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const clearDemoData = async (req, res) => {
  try {
    // Delete ALL tasks and demo projects completely
    const deletedTasks = await Task.deleteMany({});
    await Project.deleteMany({ isDemo: true });
    await Activity.deleteMany({ action: "demo_seeded" });

    req.app.get("io")?.emit("refreshTasks");
    req.app.get("io")?.emit("projectUpdated");
    req.app.get("io")?.emit("activityUpdated");
    req.app.get("io")?.emit("notificationUpdated");

    res.json({
      message: "All tasks and demo projects cleared",
      deletedTasks: deletedTasks.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};