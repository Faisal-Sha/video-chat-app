import React, { useRef, useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";

const VideoChat = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const dataChannelRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [roomId, setRoomId] = useState("default-room");

  // Initialize WebRTC peer connection
  const initializePeerConnection = useCallback(() => {
    const config = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(config);
    
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      setConnectionStatus(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log("Signaling State:", pc.signalingState);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log("Sending ICE candidate");
        socketRef.current.emit("ice-candidate", {
          candidate: event.candidate,
          roomId
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.ondatachannel = (event) => {
      console.log("Received data channel");
      setupDataChannel(event.channel);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [roomId]);

  const setupDataChannel = (dataChannel) => {
    dataChannel.onopen = () => {
      console.log("Data channel opened");
      setConnectionStatus('connected');
    };

    dataChannel.onclose = () => {
      console.log("Data channel closed");
      setConnectionStatus('disconnected');
    };

    dataChannel.onerror = (error) => {
      console.error("Data channel error:", error);
      setError(`Data channel error: ${error.message}`);
    };

    dataChannel.onmessage = (event) => {
      console.log("Received message:", event.data);
      setMessages(prev => [...prev, `Peer: ${event.data}`]);
    };

    dataChannelRef.current = dataChannel;
  };

  const processPendingIceCandidates = async () => {
    if (!peerConnectionRef.current?.remoteDescription) return;

    console.log(`Processing ${pendingIceCandidatesRef.current.length} pending ICE candidates`);
    
    while (pendingIceCandidatesRef.current.length) {
      const candidate = pendingIceCandidatesRef.current.shift();
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("Added pending ICE candidate");
      } catch (error) {
        console.error("Error adding pending ICE candidate:", error);
      }
    }
  };

  const handleOffer = async (offer) => {
    console.log("Received offer");
    if (!peerConnectionRef.current) return;
    
    try {
      const signalingState = peerConnectionRef.current.signalingState;
      
      if (signalingState === "stable") {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        await processPendingIceCandidates();
        
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socketRef.current.emit("answer", { answer, roomId });
      } else {
        console.log(`Ignoring offer in signaling state: ${signalingState}`);
      }
    } catch (error) {
      console.error("Error handling offer:", error);
      setError(`Error handling offer: ${error.message}`);
    }
  };

  const handleAnswer = async (answer) => {
    console.log("Received answer");
    if (!peerConnectionRef.current) return;
    
    try {
      const signalingState = peerConnectionRef.current.signalingState;
      
      if (signalingState === "have-local-offer") {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await processPendingIceCandidates();
      } else {
        console.log(`Ignoring answer in signaling state: ${signalingState}`);
      }
    } catch (error) {
      console.error("Error handling answer:", error);
      setError(`Error handling answer: ${error.message}`);
    }
  };

  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      localStreamRef.current = stream;

      if (peerConnectionRef.current) {
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current.addTrack(track, stream);
        });
      }

      return stream;
    } catch (error) {
      console.error("Media access error:", error);
      setError(`Media access error: ${error.message}`);
      throw error;
    }
  }, []);

  const initializeSocket = useCallback(() => {
    const socket = io("http://localhost:5000");

    socket.on("connect", () => {
      console.log("Socket connected");
      socket.emit("join-room", roomId);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setError(`Socket connection error: ${error.message}`);
    });

    socket.on("user-joined", (userId) => {
      console.log("User joined:", userId);
    });

    socket.on("user-left", (userId) => {
      console.log("User left:", userId);
    });

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);

    socket.on("ice-candidate", async ({ candidate }) => {
      console.log("Received ICE candidate");
      if (!peerConnectionRef.current) return;
      
      try {
        if (peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("Added ICE candidate");
        } else {
          console.log("Queuing ICE candidate");
          pendingIceCandidatesRef.current.push(candidate);
        }
      } catch (error) {
        console.error("Error handling ICE candidate:", error);
        setError(`Error handling ICE candidate: ${error.message}`);
      }
    });

    socketRef.current = socket;
    return socket;
  }, [roomId]);

  useEffect(() => {
    const initialize = async () => {
      try {
        initializePeerConnection();
        await initializeMedia();
        initializeSocket();
      } catch (error) {
        console.error("Initialization error:", error);
        setError(`Initialization error: ${error.message}`);
      }
    };

    initialize();

    return () => {
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [initializePeerConnection, initializeMedia, initializeSocket]);

  const startCall = async () => {
    if (!peerConnectionRef.current) {
      setError("Connection not initialized");
      return;
    }

    try {
      console.log("Starting call...");
      const dataChannel = peerConnectionRef.current.createDataChannel("chat");
      setupDataChannel(dataChannel);

      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socketRef.current.emit("offer", { offer, roomId });
    } catch (error) {
      console.error("Error starting call:", error);
      setError(`Error starting call: ${error.message}`);
    }
  };

  const sendMessage = useCallback(() => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
      setError("Chat connection not ready");
      return;
    }

    try {
      dataChannelRef.current.send(message);
      setMessages(prev => [...prev, `You: ${message}`]);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setError(`Error sending message: ${error.message}`);
    }
  }, [message]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Video Chat</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="absolute top-0 right-0 px-4 py-3"
          >
            ×
          </button>
        </div>
      )}
      
      <div className="mb-4">
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter Room ID"
          className="px-3 py-2 border rounded mr-2"
        />
        <button
          onClick={() => socketRef.current?.emit("join-room", roomId)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Join Room
        </button>
      </div>
      
      <div className="flex justify-between mb-4">
        <div className="w-[45%]">
          <h2 className="text-lg font-semibold mb-2">Local Video</h2>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full bg-black rounded"
          />
        </div>
        <div className="w-[45%]">
          <h2 className="text-lg font-semibold mb-2">Remote Video</h2>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full bg-black rounded"
          />
        </div>
      </div>

      <div className="mb-4">
        <button
          onClick={startCall}
          disabled={connectionStatus === 'connected'}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400"
        >
          Start Call
        </button>
        <span className="ml-2 text-sm text-gray-600">
          Status: {connectionStatus}
        </span>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Chat</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message"
            className="flex-1 px-3 py-2 border rounded"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={!dataChannelRef.current || dataChannelRef.current.readyState !== "open"}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className="px-3 py-2 bg-gray-100 rounded"
            >
              {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoChat;