import { io } from "socket.io-client";
import { BASE_URL } from "./apiPaths";
import { getToken } from "./tokenStorage";

let socketInstance = null;

const resolveSocketUrl = () => {
  if (typeof BASE_URL === "string" && BASE_URL.trim().startsWith("http")) {
    return BASE_URL.trim().replace(/\/+$/, "");
  }

  return undefined;
};

export const getSocket = () => {
  if (socketInstance) {
    return socketInstance;
  }

  socketInstance = io(resolveSocketUrl(), {
    autoConnect: false,
    transports: ["websocket"],
  });

  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocket();
  socket.auth = { token: getToken() };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};
