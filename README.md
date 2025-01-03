# Video Chat App

In this coding challenge we’re going to build a simple video chat application that allows two people to connect a call and speak to each other with live audio and video.

There are two obvious approaches you can take for this challenge. Building a chat application that works in the browser using WebRTC, or building a desktop application. For a desktop you could use a video and audio capture library to capture the camera and mic, then establish a direct connection to stream the video and audio.

## Step Zero
For this step you’re going to set your environment up, ready to begin developing and testing your solution.

You’re probably going to be building a full stack web application - a sensible approach for this coding challenge - so consider the languages and technology stack you’re either most comfortable with or want to get more practice using. It all depends whether you’re here to learn the tech stack, learn how to build a video chat app, or both!

If full-stack is not your thing, then you could of course build it all in one application as a desktop app too. It’s your project, have fun!

## Step 1
In this step your goal is to create a way for two users to find each other. In WebRTC terms this is a signalling server. Signalling servers are normally regular HTTP-based Web APIs (i.e. REST) and allow the client applications to relay the necessary information to find and establish a peer connection.

If you’re going the WebRTC route read about signalling for WebRTC. If you’re building your own solution you simply need a simple solution to allow people to find each other. You can do that via a simple server at a well known address.

## Step 2
In this step your goal is to capture audio and video on the client application and display it to them locally.

## Step 3
In this step your goal is to establish the peer-to-peer network connection. Now that your two clients have found each other you should establish a peer to peer connection. The benefit of a peer-to-peer is that the data is private, it’s not going through a server in the middle that could be storing the data (it being fully private assumes you are using end-to-end encryption). If you’re going the WebRTC route be sure to learn about ICE, STUN and TURN.

At this stage, if you’re doing it yourself, you could simply build a simple peer to peer text based chat on top of what you have so far in order to prove you have a working peer-to-peer connection.

## Step 4
In this step your goal is to play audio and video from the remote client alongside the video from the local client.

Congratulations you now have a simple peer-to-peer video chat application!

