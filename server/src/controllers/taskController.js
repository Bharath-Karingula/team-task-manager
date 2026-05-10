import Task from "../models/Task.js";
import Project from "../models/project.js";
import Activity from "../models/Activity.js";
import Notification from "../models/Notification.js";
import User from "../models/user.js";

const statusLabels = ["Todo", "In Progress", "Review", "Completed"];

const canEditTask = async (user, task) => {
  if (user.role === "admin" || user.role === "manager") return true;
  return task.assignedMembers?.some((member) => member.toString() === user._id.toString());
};

const canCreateTask = async (user, projectId) => {
  if (user.role === "admin") return true;
  if (user.role !== "manager") return false;
  if (!projectId) return true;

  const project = await Project.findById(projectId);
  return project?.team?.some(
    (member) =>
      member.user?.toString() === user._id.toString() &&
      ["admin", "manager"].includes(member.role)
  );
};

const emitTaskEvents = (req) => {
  req.app.get("io")?.emit("refreshTasks");
  req.app.get("io")?.emit("activityUpdated");
};

const visibleProjectQuery = (user) =>
  user.role === "admin"
    ? {}
    : {
        $or: [
          { visibility: "Public" },
          { createdBy: user._id },
          { "team.user": user._id }
        ]
      };

export const createTask = async (
  req,
  res
) => {

  try {

    const {
      title,
      description,
      priority,
      status,
      dueDate,
      labels = [],
      assignedMembers = [],
      projectId,
      subtasks = [],
      checklist = [],
      estimatedTime = 0,
      trackedTime = 0,
      recurring,
      dependencies = [],
      blockers = [],
      attachments = []
    } = req.body;

    if (!(await canCreateTask(req.user, projectId))) {
      return res.status(403).json({
        message: "Only admins and assigned project managers can create tasks."
      });
    }

    const task = await Task.create({
      title,
      description,
      priority,
      status,
      dueDate,
      labels,
      assignedMembers,
      projectId,
      subtasks,
      checklist,
      estimatedTime,
      trackedTime,
      recurring,
      dependencies,
      blockers,
      attachments,
      statusHistory: [{ from: "New", to: status || "Todo", changedBy: req.user._id }]
    });

    await Activity.create({
      type: "task",
      action: "created",
      message: `${req.user.name} created task ${task.title}`,
      actor: req.user._id,
      project: projectId,
      task: task._id
    });

    if (assignedMembers.length) {
      await Notification.insertMany(
        assignedMembers.map((recipient) => ({
          recipient,
          actor: req.user._id,
          type: "task_assigned",
          title: "Task assigned",
          message: `${req.user.name} assigned you ${task.title}`,
          project: projectId,
          task: task._id
        }))
      );
      req.app.get("io")?.emit("notificationUpdated");
    }

    emitTaskEvents(req);

    res.status(201).json(task);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

export const getTasks = async (
  req,
  res
) => {

  try {

    const query = req.query.projectId ? { projectId: req.query.projectId } : {};

    // Exclude demo tasks when dashboard requests it
    if (req.query.excludeDemo === "true") {
      query.isDemo = { $ne: true };
    }

    if (req.user.role === "member") {
      query.assignedMembers = req.user._id;
    } else if (req.user.role === "manager") {
      const projects = await Project.find({
        $or: [{ createdBy: req.user._id }, { "team.user": req.user._id }]
      }).select("_id");

      query.$or = [{ projectId: { $in: projects.map((project) => project._id) } }, { projectId: null }];
    }

    const tasks = await Task.find(query)
      .populate("assignedMembers", "name email avatar role")
      .populate("projectId", "title status")
      .populate("comments.author", "name avatar")
      .sort({ updatedAt: -1 });

    res.status(200).json(tasks);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

export const updateTaskStatus = async (
  req,
  res
) => {

  try {

    const payload = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!(await canEditTask(req.user, task))) {
      return res.status(403).json({ message: "Members can only work on assigned project tasks." });
    }

    if (req.user.role === "member") {
      const allowedFields = ["status", "trackedTime", "checklist", "subtasks", "comments"];
      Object.keys(payload).forEach((field) => {
        if (!allowedFields.includes(field)) delete payload[field];
      });
    }

    const previousStatus = task.status;
    const previousPriority = task.priority;
    const previousDueDate = task.dueDate?.toISOString();

    [
      "title",
      "description",
      "priority",
      "status",
      "dueDate",
      "labels",
      "attachments",
      "assignedMembers",
      "subtasks",
      "checklist",
      "estimatedTime",
      "trackedTime",
      "recurring",
      "dependencies",
      "blockers",
      "projectId"
    ].forEach((field) => {
      if (payload[field] !== undefined) task[field] = payload[field];
    });

    if (payload.status && payload.status !== previousStatus && statusLabels.includes(payload.status)) {
      task.statusHistory.push({
        from: previousStatus,
        to: payload.status,
        changedBy: req.user._id
      });
    }

    await task.save();

    const activities = [];
    if (payload.status && payload.status !== previousStatus) {
      activities.push({
        type: "task",
        action: "status_changed",
        message: `${req.user.name} moved ${task.title} to ${task.status}`,
        actor: req.user._id,
        project: task.projectId,
        task: task._id
      });
    }

    if (payload.priority && payload.priority !== previousPriority) {
      activities.push({
        type: "task",
        action: "priority_updated",
        message: `${req.user.name} updated ${task.title} priority to ${task.priority}`,
        actor: req.user._id,
        project: task.projectId,
        task: task._id
      });
    }

    if (payload.dueDate !== undefined && previousDueDate !== task.dueDate?.toISOString()) {
      activities.push({
        type: "task",
        action: "deadline_changed",
        message: `${req.user.name} changed the deadline for ${task.title}`,
        actor: req.user._id,
        project: task.projectId,
        task: task._id
      });
    }

    if (!activities.length) {
      activities.push({
        type: "task",
        action: "updated",
        message: `${req.user.name} updated task ${task.title}`,
        actor: req.user._id,
        project: task.projectId,
        task: task._id
      });
    }

    await Activity.insertMany(activities);

    const recipients = [...new Set((task.assignedMembers || []).map((id) => id.toString()))].filter(
      (id) => id !== req.user._id.toString()
    );

    if (recipients.length && payload.status && payload.status !== previousStatus) {
      await Notification.insertMany(
        recipients.map((recipient) => ({
          recipient,
          actor: req.user._id,
          type: "status_changed",
          title: "Task status changed",
          message: `${task.title} moved to ${task.status}`,
          project: task.projectId,
          task: task._id
        }))
      );
      req.app.get("io")?.emit("notificationUpdated");
    }

    emitTaskEvents(req);

    res.status(200).json(task);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

export const seedWorkflowTasks = async (req, res) => {
  try {
    const users = await User.find().select("_id name role").sort({ createdAt: 1 });
    const projects = await Project.find(visibleProjectQuery(req.user))
      .select("_id title team createdBy")
      .sort({ updatedAt: -1 });

    if (!users.length || !projects.length) {
      return res.status(400).json({ message: "Existing users and projects are required first." });
    }

    const currentUserId = req.user._id.toString();
    const sampleDefinitions = Array.from({ length: 8 }, (_, index) => {
      const status = statusLabels[index % statusLabels.length];
      const priorities = ["Low", "Medium", "High", "Urgent"];
      const project = projects[index % projects.length];
      const projectMembers = (project.team || [])
        .map((member) => member.user?.toString())
        .filter(Boolean);
      const fallbackMember = users.find((user) => user.role === "member") || users[index % users.length];
      const helper = users[(index + 1) % users.length];
      const assignedMembers = [
        ...new Set(
          [
            projectMembers[index % projectMembers.length],
            projectMembers[(index + 1) % projectMembers.length],
            fallbackMember?._id.toString(),
            helper?._id.toString(),
            currentUserId
          ].filter(Boolean)
        )
      ];

      return {
        title: `${project.title} - ${status} member task ${Math.floor(index / statusLabels.length) + 1}`,
        description: `Assigned project work for ${project.title}. Members can move it through Todo, In Progress, Review, and Completed.`,
        priority: priorities[index % priorities.length],
        status,
        dueDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
        labels: ["Workflow", project.title],
        assignedMembers,
        projectId: project._id,
        estimatedTime: index + 2,
        trackedTime: index,
        checklist: [{ title: "Review requirements", checked: status !== "Todo" }],
        subtasks: [{ title: "Coordinate with assigned member", completed: status === "Completed" }],
        blockers: status === "Review" ? [{ title: "Waiting for approval", resolved: false }] : [],
        statusHistory: [{ from: "New", to: status, changedBy: req.user._id }]
      };
    });

    const createdTasks = [];
    for (const taskData of sampleDefinitions) {
      const existing = await Task.findOne({ title: taskData.title, projectId: taskData.projectId });
      if (!existing) {
        createdTasks.push(await Task.create(taskData));
      }
    }

    if (createdTasks.length) {
      await Activity.insertMany(
        createdTasks.map((task) => ({
          type: "task",
          action: "created",
          message: `${req.user.name} added workflow task ${task.title}`,
          actor: req.user._id,
          project: task.projectId,
          task: task._id
        }))
      );
      emitTaskEvents(req);
    }

    res.status(createdTasks.length ? 201 : 200).json({
      message: createdTasks.length ? "Workflow tasks added" : "Workflow tasks already exist",
      tasks: createdTasks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!(await canEditTask(req.user, task))) {
      return res.status(403).json({ message: "You cannot delete this task." });
    }

    await task.deleteOne();
    await Activity.create({
      type: "task",
      action: "deleted",
      message: `${req.user.name} deleted task ${task.title}`,
      actor: req.user._id,
      project: task.projectId
    });

    emitTaskEvents(req);
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!(await canEditTask(req.user, task))) {
      return res.status(403).json({ message: "Members can only comment on assigned tasks." });
    }

    task.comments.push({ author: req.user._id, body: req.body.body });
    await task.save();

    const mentions = (req.body.body || "").match(/@([\w.-]+@[\w.-]+\.\w+)/g) || [];
    const mentionedEmails = mentions.map((mention) => mention.slice(1).toLowerCase());

    if (mentionedEmails.length) {
      const users = await import("../models/user.js").then(({ default: User }) =>
        User.find({ email: { $in: mentionedEmails } })
      );

      await Notification.insertMany(
        users.map((user) => ({
          recipient: user._id,
          actor: req.user._id,
          type: "mention",
          title: "Mentioned in comment",
          message: `${req.user.name} mentioned you on ${task.title}`,
          project: task.projectId,
          task: task._id
        }))
      );
      req.app.get("io")?.emit("notificationUpdated");
    }

    await Activity.create({
      type: "task",
      action: "commented",
      message: `${req.user.name} commented on ${task.title}`,
      actor: req.user._id,
      project: task.projectId,
      task: task._id
    });

    emitTaskEvents(req);
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const allowed = ["👍", "🔥", "✅", "💡", "🎉"];
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!allowed.includes(emoji)) {
      return res.status(400).json({ message: "Unsupported reaction" });
    }

    if (!(await canEditTask(req.user, task))) {
      return res.status(403).json({ message: "Members can only react to assigned tasks." });
    }

    const reaction = task.reactions.find((item) => item.emoji === emoji);
    if (reaction) {
      const hasReacted = reaction.users.some((userId) => userId.toString() === req.user._id.toString());
      reaction.users = hasReacted
        ? reaction.users.filter((userId) => userId.toString() !== req.user._id.toString())
        : [...reaction.users, req.user._id];
    } else {
      task.reactions.push({ emoji, users: [req.user._id] });
    }

    task.reactions = task.reactions.filter((item) => item.users.length > 0);
    await task.save();

    emitTaskEvents(req);
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};