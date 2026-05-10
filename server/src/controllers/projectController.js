import Project from "../models/project.js";
import User from "../models/user.js";
import Activity from "../models/Activity.js";
import Notification from "../models/Notification.js";

const canManageProject = (user, project) => {
  if (user.role === "admin") return true;
  if (user.role === "manager" && project.createdBy?.toString() === user._id.toString()) return true;
  return project.team?.some(
    (member) =>
      member.user?.toString() === user._id.toString() &&
      ["admin", "manager"].includes(member.role)
  );
};

const emitProjectEvents = (req) => {
  req.app.get("io")?.emit("projectUpdated");
  req.app.get("io")?.emit("activityUpdated");
};

export const createProject = async (
  req,
  res
) => {

  try {

    const {
      title,
      description,
      visibility,
      deadline,
      status,
      progress = 0
    } = req.body;

    const project = await Project.create({
      title,
      description,
      visibility,
      deadline,
      status,
      progress,
      createdBy: req.user._id,
      team: [{ user: req.user._id, role: req.user.role === "member" ? "manager" : req.user.role }],
      activitySummary: `${req.user.name} created ${title}`
    });

    await Activity.create({
      type: "project",
      action: "created",
      message: `${req.user.name} created project ${project.title}`,
      actor: req.user._id,
      project: project._id
    });

    emitProjectEvents(req);

    res.status(201).json(project);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

export const getProjects = async (
  req,
  res
) => {

  try {

    const query =
      req.user.role === "admin"
        ? {}
        : {
            $or: [
              { visibility: "Public" },
              { createdBy: req.user._id },
              { "team.user": req.user._id }
            ]
          };

    const projects = await Project.find(query)
      .populate("team.user", "name email avatar role")
      .sort({ favorite: -1, updatedAt: -1 });

    // Deduplicate in case a user matches multiple $or conditions (e.g. creator + team member)
    const seen = new Set();
    const uniqueProjects = projects.filter((p) => {
      const id = p._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    res.status(200).json(uniqueProjects);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!canManageProject(req.user, project)) {
      return res.status(403).json({ message: "Only admins and project managers can update projects." });
    }

    const previousDeadline = project.deadline?.toISOString();
    const fields = [
      "title",
      "description",
      "visibility",
      "deadline",
      "status",
      "progress",
      "favorite",
      "archived"
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) project[field] = req.body[field];
    });

    if (project.archived) project.status = "Archived";
    project.activitySummary = `${req.user.name} updated ${project.title}`;
    await project.save();

    const deadlineChanged =
      req.body.deadline !== undefined && previousDeadline !== project.deadline?.toISOString();

    await Activity.create({
      type: "project",
      action: deadlineChanged ? "deadline_changed" : "updated",
      message: deadlineChanged
        ? `${req.user.name} changed the deadline for ${project.title}`
        : `${req.user.name} updated project ${project.title}`,
      actor: req.user._id,
      project: project._id
    });

    if (deadlineChanged) {
      const recipients = project.team.map((member) => member.user).filter(Boolean);
      await Notification.insertMany(
        recipients.map((recipient) => ({
          recipient,
          actor: req.user._id,
          type: "deadline_updated",
          title: "Project deadline updated",
          message: `${project.title} deadline changed`,
          project: project._id
        }))
      );
      req.app.get("io")?.emit("notificationUpdated");
    }

    emitProjectEvents(req);
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!canManageProject(req.user, project)) {
      return res.status(403).json({ message: "Only admins and project managers can delete projects." });
    }

    await project.deleteOne();
    await Activity.create({
      type: "project",
      action: "deleted",
      message: `${req.user.name} deleted project ${project.title}`,
      actor: req.user._id
    });

    emitProjectEvents(req);
    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const inviteUser = async (req, res) => {
  try {
    const { email, role = "member" } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!canManageProject(req.user, project)) {
      return res.status(403).json({ message: "Only admins and project managers can invite users." });
    }

    const user = await User.findOne({ email: email?.toLowerCase() });

    if (user && !project.team.some((member) => member.user?.toString() === user._id.toString())) {
      project.team.push({ user: user._id, role });
      await Notification.create({
        recipient: user._id,
        actor: req.user._id,
        type: "project_invitation",
        title: "Project invitation",
        message: `${req.user.name} invited you to ${project.title}`,
        project: project._id
      });
    } else if (!user) {
      project.invitedEmails.push({ email: email.toLowerCase(), role });
    }

    project.activitySummary = `${req.user.name} invited ${email}`;
    await project.save();

    await Activity.create({
      type: "team",
      action: "invited",
      message: `${req.user.name} invited ${email} to ${project.title}`,
      actor: req.user._id,
      project: project._id
    });

    req.app.get("io")?.emit("notificationUpdated");
    emitProjectEvents(req);
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeUser = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!canManageProject(req.user, project)) {
      return res.status(403).json({ message: "Only admins and project managers can remove users." });
    }

    project.team = project.team.filter((member) => member.user?.toString() !== req.params.userId);
    await project.save();

    await Activity.create({
      type: "team",
      action: "removed",
      message: `${req.user.name} removed a member from ${project.title}`,
      actor: req.user._id,
      project: project._id
    });

    emitProjectEvents(req);
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};