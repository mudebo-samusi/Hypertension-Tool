import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000"; // Make configurable if needed

export default function useSocket({
  isLive,
  onBPReading,
  onPrediction,
  onError
}) {
  const socketRef = useRef(null);
  const isLiveRef = useRef(isLive);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [error, setError] = useState("");

  useEffect(() => {
    isLiveRef.current = isLive;
  }, [isLive]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      // transports: ["websocket"] // <-- Try commenting this out to allow fallback
    });

    socket.on("connect", () => {
      setConnectionStatus("connected");
      setError("");
    });
    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
      setError("Connection to server lost. Please refresh the page.");
      if (onError) onError();
    });
    socket.on("connect_error", (err) => {
      setConnectionStatus("error");
      setError(`Connection error: ${err.message}`);
      if (onError) onError();
    });

    socket.on("new_bp_reading", (data) => {
      if (isLiveRef.current && onBPReading) onBPReading(data);
    });
    socket.on("prediction_result", (data) => {
      if (isLiveRef.current && onPrediction) onPrediction(data);
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  return { connectionStatus, error };
}