import React, { useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000'); // Replace with deployed server URL later

const VideoChat = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);

  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    setPeerConnection(pc);

    socket.on('offer', async (offer) => {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', answer);
    });

    socket.on('answer', async (answer) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', async (candidate) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    return () => pc.close();
  }, []);

  const startCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
  };

  return (
    <div>
      <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '45%' }} />
      <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '45%' }} />
      <button onClick={startCall}>Start Call</button>
    </div>
  );
};

export default VideoChat;





// import React, { useRef, useEffect } from "react";
// import { io } from "socket.io-client";

// const socket = io("http://localhost:5000"); // URL of your signaling server

// const VideoChat = () => {
//   const localVideoRef = useRef(null);

//   useEffect(() => {
//     // Capture audio and video from the user's device
//     const getMedia = async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: true,
//           audio: true,
//         });
//         // Display the local stream in the video element
//         localVideoRef.current.srcObject = stream;
//       } catch (error) {
//         console.error("Error accessing media devices:", error);
//       }
//     };

//     getMedia();
//   }, []);

//   return (
//     <div>
//       <h1>Video Chat</h1>
//       <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "60%" }} />
//     </div>
//   );
// };

// export default VideoChat;
