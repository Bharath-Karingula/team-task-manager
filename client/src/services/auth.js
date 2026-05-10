const ACCESS_KEY = "taskflow_access_token";
const REFRESH_KEY = "taskflow_refresh_token";
const USER_KEY = "taskflow_user";
const REMEMBER_KEY = "taskflow_remember";

const storage = () =>
  localStorage.getItem(REMEMBER_KEY) === "true" ? localStorage : sessionStorage;

export const getAccessToken = () =>
  localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY);

export const getRefreshToken = () =>
  localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);

export const getCurrentUser = () => {
  const user = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const saveSession = ({ token, refreshToken, user }, rememberMe = true) => {
  const targetStorage = rememberMe ? localStorage : sessionStorage;
  const otherStorage = rememberMe ? sessionStorage : localStorage;

  otherStorage.removeItem(ACCESS_KEY);
  otherStorage.removeItem(REFRESH_KEY);
  otherStorage.removeItem(USER_KEY);
  localStorage.setItem(REMEMBER_KEY, String(rememberMe));

  if (token) targetStorage.setItem(ACCESS_KEY, token);
  if (refreshToken) targetStorage.setItem(REFRESH_KEY, refreshToken);
  if (user) targetStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const updateAccessToken = (token, refreshToken, user) => {
  const targetStorage = storage();
  if (token) targetStorage.setItem(ACCESS_KEY, token);
  if (refreshToken) targetStorage.setItem(REFRESH_KEY, refreshToken);
  if (user) targetStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  [localStorage, sessionStorage].forEach((targetStorage) => {
    targetStorage.removeItem(ACCESS_KEY);
    targetStorage.removeItem(REFRESH_KEY);
    targetStorage.removeItem(USER_KEY);
  });
};

export const isRemembered = () => localStorage.getItem(REMEMBER_KEY) !== "false";
