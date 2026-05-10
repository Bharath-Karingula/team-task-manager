import Activity from "../models/Activity.js";
import Project from "../models/project.js";
import Task from "../models/Task.js";

export const getActivities = async (req, res) => {
  try {
    const query = {};

    if (req.query.type && req.query.type !== "all") {
      query.type = req.query.type;
    }

    if (req.query.projectId) {
      query.project = req.query.projectId;
    }

    if (req.user.role === "member") {
      const tasks = await Task.find({ assignedMembers: req.user._id }).select("_id projectId");
      const projectIds = tasks.map((task) => task.projectId).filter(Boolean);

      query.$or = [
        { actor: req.user._id },
        { task: { $in: tasks.map((task) => task._id) } },
        { project: { $in: projectIds } }
      ];
    } else if (req.user.role === "manager") {
      const projects = await Project.find({
        $or: [{ createdBy: req.user._id }, { "team.user": req.user._id }]
      }).select("_id");

      query.$or = [
        { actor: req.user._id },
        { project: { $in: projects.map((project) => project._id) } }
      ];
    }

    const activities = await Activity.find(query)
      .populate("actor", "name email avatar role")
      .populate("project", "title")
      .populate("task", "title status priority")
      .sort({ createdAt: -1 })
      .limit(80);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
