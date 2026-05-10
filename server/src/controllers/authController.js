import crypto from "crypto";
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Activity from "../models/Activity.js";

const accessSecret = () => process.env.JWT_SECRET || "dev_access_secret";
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  emailVerified: user.emailVerified
});

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, accessSecret(), { expiresIn: "15m" });

const signRefreshToken = (user, sessionId, rememberMe) =>
  jwt.sign({ id: user._id, sessionId }, refreshSecret(), {
    expiresIn: rememberMe ? "30d" : "1d"
  });

const issueTokens = async (user, req, rememberMe = false, existingSessionId) => {
  const sessionId = existingSessionId || crypto.randomUUID();
  const refreshToken = signRefreshToken(user, sessionId, rememberMe);
  const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000);
  const device = req.headers["user-agent"] || "Unknown device";

  user.refreshTokens = (user.refreshTokens || []).filter(
    (session) => session.sessionId !== sessionId && session.expiresAt > new Date()
  );

  user.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    sessionId,
    device,
    rememberMe,
    expiresAt,
    lastUsedAt: new Date()
  });

  await user.save();

  return {
    token: signAccessToken(user),
    refreshToken,
    expiresIn: 15 * 60,
    sessionId
  };
};

export const register = async (req, res) => {

  try {

    const { name, email, password, role = "member" } = req.body;

    const existingUser = await User.findOne({
      email: email?.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: ["admin", "manager", "member"].includes(role) ? role : "member",
      avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
      emailVerificationToken: crypto.randomBytes(24).toString("hex"),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await Activity.create({
      type: "auth",
      action: "signup",
      message: `${user.name} created an account`,
      actor: user._id
    });

    res.status(201).json({
      message: "User registered successfully",
      user: publicUser(user)
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

export const login = async (req, res) => {

  try {

    const { email, password, rememberMe = false } = req.body;

    const user = await User.findOne({
      email: email?.toLowerCase()
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    const tokens = await issueTokens(user, req, rememberMe);

    await Activity.create({
      type: "auth",
      action: "login",
      message: `${user.name} logged in`,
      actor: user._id
    });

    res.status(200).json({
      message: "Login successful",
      ...tokens,
      user: publicUser(user)
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, refreshSecret());
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Session expired. Please login again." });
    }

    const tokenHash = hashToken(refreshToken);
    const session = user.refreshTokens.find(
      (item) =>
        item.sessionId === decoded.sessionId &&
        item.tokenHash === tokenHash &&
        item.expiresAt > new Date()
    );

    if (!session) {
      user.refreshTokens = user.refreshTokens.filter(
        (item) => item.sessionId !== decoded.sessionId
      );
      await user.save();
      return res.status(401).json({ message: "Session expired. Please login again." });
    }

    const tokens = await issueTokens(user, req, session.rememberMe, decoded.sessionId);

    res.json({
      message: "Session refreshed",
      ...tokens,
      user: publicUser(user)
    });
  } catch (error) {
    res.status(401).json({ message: "Session expired. Please login again." });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { tokenHash } }
      });
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });

    if (!user) {
      return res.json({ message: "If that email exists, a reset link has been prepared." });
    }

    user.resetPasswordToken = crypto.randomBytes(24).toString("hex");
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    res.json({
      message: "Password reset token generated",
      resetToken: user.resetPasswordToken
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or expired." });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    res.json({ message: "Password reset successful. Please login again." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({
      emailVerificationToken: req.params.token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Verification link is invalid or expired." });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully", user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const me = async (req, res) => {
  res.json({
    user: publicUser(req.user),
    sessions: req.user.refreshTokens?.map((session) => ({
      sessionId: session.sessionId,
      device: session.device,
      rememberMe: session.rememberMe,
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt
    }))
  });
};
