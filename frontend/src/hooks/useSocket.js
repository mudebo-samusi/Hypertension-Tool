import { useEffect, useRef, useState } from "react";
import { getMonitorSocketSync, onBPReading as registerBPListener, onPrediction as registerPredictionListener, initializeSocket } from "../services/socket";

export default function useSocket({
  isLive,
  onBPReading,
  onPrediction,
  onError
}) {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [error, setError] = useState("");
  const [socket, setSocket] = useState(null);
  const isLiveRef = useRef(isLive);
  const connectionStatusRef = useRef("disconnected");
  const listenersSetup = useRef(false); // Track if listeners are already set up
  
  useEffect(() => {
    // Initialize socket connection when component mounts or when isLive changes
    const initializeConnection = async () => {
      try {
        const newSocket = await initializeSocket('monitor');
        if (newSocket) {
          setSocket(newSocket);
          setConnectionStatus(newSocket.connected ? "connected" : "disconnected");
          setError("");
        }
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        setError("Failed to establish connection");
        setConnectionStatus("error");
      }
    };
    
    // Always try to initialize socket on mount
    initializeConnection();
  }, []); // Only run on mount

  useEffect(() => {
    isLiveRef.current = isLive;
    
    // If we need to connect and don't have a connected socket, try to connect
    if (isLive && !socket?.connected) {
      const connectSocket = async () => {
        try {
          const newSocket = await initializeSocket('monitor');
          if (newSocket) {
            setSocket(newSocket);
            setConnectionStatus(newSocket.connected ? "connected" : "disconnected");
          }
        } catch (error) {
          console.error('Failed to initialize socket:', error);
          setError("Failed to establish connection");
          setConnectionStatus("error");
        }
      };
      connectSocket();
    }
  }, [isLive, socket?.connected]);

  useEffect(() => {
    // Use the current socket from state or get it synchronously
    const currentSocket = socket || getMonitorSocketSync();
    console.log("Monitor socket obtained:", currentSocket ? "Yes" : "No", 
                "Connected:", currentSocket?.connected ? "Yes" : "No");
    
    if (!currentSocket) {
      setConnectionStatus("disconnected");
      setError("No socket connection available");
      return;
    }

    // Update state with current socket if we don't have one
    if (!socket && currentSocket) {
      setSocket(currentSocket);
    }

    // Check if listeners are already set up for any socket to prevent duplicates
    if (listenersSetup.current) {
      console.log("Socket listeners already setup globally, skipping duplicate setup");
      // Still update connection status based on current socket
      const socketConnected = currentSocket.connected;
      const socketId = currentSocket.id;
      if (socketConnected && socketId) {
        setConnectionStatus("connected");
        connectionStatusRef.current = "connected";
      }
      return;
    }
    
    console.log("Setting up socket listeners for the first time");
    listenersSetup.current = true;

    // Track if we're receiving data to determine real connection status
    let dataReceived = false;
    let dataReceivedTimeout;

    // Set up event listeners
    const handleConnect = () => {
      console.log("Socket connected event fired");
      setConnectionStatus("connected");
      connectionStatusRef.current = "connected";
      setError("");
    };
    
    const handleDisconnect = () => {
      console.log("Socket disconnected event fired");
      setConnectionStatus("disconnected");
      connectionStatusRef.current = "disconnected";
      setError("Connection to server lost. Please refresh the page.");
      if (onError) onError();
    };
    
    const handleConnectError = (err) => {
      console.log("Socket connect error event fired:", err);
      setConnectionStatus("error");
      connectionStatusRef.current = "error";
      setError(`Connection error: ${err.message}`);
      if (onError) onError();
    };

    // Add socket event listeners first
    currentSocket.on("connect", handleConnect);
    currentSocket.on("disconnect", handleDisconnect);
    currentSocket.on("connect_error", handleConnectError);

    // Override connection status based on data reception
    const markDataReceived = () => {
      if (!dataReceived) {
        dataReceived = true;
        console.log("Data received - marking socket as connected");
        setConnectionStatus("connected");
        connectionStatusRef.current = "connected";
        setError("");
      }
      // Reset timeout for next data check
      if (dataReceivedTimeout) {
        clearTimeout(dataReceivedTimeout);
      }
      dataReceivedTimeout = setTimeout(() => {
        dataReceived = false;
      }, 15000); // Reset after 15 seconds of no data
    };

    // Check initial connection status
    const socketConnected = currentSocket.connected;
    const socketId = currentSocket.id;
    
    // If socket reports as connected, trust it. Otherwise, we'll detect via data reception
    if (socketConnected && socketId) {
      const initialStatus = "connected";
      setConnectionStatus(initialStatus);
      connectionStatusRef.current = initialStatus;
      console.log("Initial socket status set to:", initialStatus, "Socket.connected:", socketConnected, "Socket.id:", socketId);
    } else {
      // Start in disconnected state but we'll update when data arrives
      const initialStatus = "disconnected";
      setConnectionStatus(initialStatus);
      connectionStatusRef.current = initialStatus;
      console.log("Initial socket status set to:", initialStatus, "- will update when data received");
    }

    // Test direct event listener for troubleshooting
    currentSocket.on("new_bp_reading", (data) => {
      console.log("Direct BP reading event received:", data);
      markDataReceived(); // Mark that we're receiving data
      // Also trigger the callback directly for immediate testing
      if (onBPReading) {
        onBPReading(data);
      }
    });
    
    currentSocket.on("prediction_result", (data) => {
      console.log("Direct prediction event received:", data);
      markDataReceived(); // Mark that we're receiving data
      // Also trigger the callback directly for immediate testing
      if (onPrediction) {
        onPrediction(data);
      }
    });

    // Listen for status messages from the microservice
    currentSocket.on("status", (data) => {
      console.log("Status message received from microservice:", data);
      markDataReceived(); // Mark that we're receiving data
    });

    // Register health event handlers with explicit logging - handle both sync and async
    let bpReadingCleanup = null;
    let predictionCleanup = null;
    
    const setupEventListeners = () => {
      try {
        bpReadingCleanup = registerBPListener((data) => {
          console.log("BP reading callback triggered:", data, "isLive:", isLiveRef.current);
          markDataReceived(); // Mark that we're receiving data
          if (onBPReading) {
            onBPReading(data);
          }
        });
        
        predictionCleanup = registerPredictionListener((data) => {
          console.log("Prediction callback triggered:", data, "isLive:", isLiveRef.current);
          markDataReceived(); // Mark that we're receiving data
          if (onPrediction) {
            onPrediction(data);
          }
        });
      } catch (error) {
        console.error("Failed to setup event listeners:", error);
      }
    };
    
    setupEventListeners();

    // Periodic connection status check
    const statusCheckInterval = setInterval(() => {
      const isCurrentlyConnected = currentSocket.connected && currentSocket.id;
      const currentStatus = connectionStatusRef.current;
      
      // If socket reports connected and we're not already showing connected
      if (isCurrentlyConnected && currentStatus !== "connected") {
        console.log("Socket reconnected - updating status");
        setConnectionStatus("connected");
        connectionStatusRef.current = "connected";
        setError("");
      } 
      // Only mark as disconnected if we're not receiving data and socket reports disconnected
      else if (!isCurrentlyConnected && !dataReceived && currentStatus === "connected") {
        console.log("Socket disconnected and no data received - updating status");
        setConnectionStatus("disconnected");
        connectionStatusRef.current = "disconnected";
      }
      // If we're receiving data but socket reports disconnected, keep connected status
      else if (!isCurrentlyConnected && dataReceived && currentStatus !== "connected") {
        console.log("Socket reports disconnected but receiving data - marking as connected");
        setConnectionStatus("connected");
        connectionStatusRef.current = "connected";
        setError("");
      }
    }, 3000); // Check every 3 seconds

    // Cleanup when component unmounts
    return () => {
      currentSocket.off("connect", handleConnect);
      currentSocket.off("disconnect", handleDisconnect);
      currentSocket.off("connect_error", handleConnectError);
      currentSocket.off("new_bp_reading");
      currentSocket.off("prediction_result");
      
      // Clear the data received timeout
      if (dataReceivedTimeout) {
        clearTimeout(dataReceivedTimeout);
      }
      
      // Clear the status check interval
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
      
      if (bpReadingCleanup) bpReadingCleanup();
      if (predictionCleanup) predictionCleanup();
    };
  }, [socket, onBPReading, onPrediction, onError]);

  return { connectionStatus, error };
}