import { io } from "socket.io-client";
import { getAccessToken } from "./auth";

const socket = io(
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:5001",
  {
    auth: {
      token: getAccessToken()
    }
  }
);

export default socket;
