import User from "../models/user.js";

export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("name email role avatar emailVerified createdAt")
      .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
