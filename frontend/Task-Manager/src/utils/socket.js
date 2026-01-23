import { io } from "socket.io-client";
import { getToken } from "./tokenStorage";

let socketInstance = null;

const resolveSocketUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL;

  if (typeof baseUrl === "string" && baseUrl.trim().startsWith("http")) {
    return baseUrl.trim().replace(/\/+$/, "");
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
