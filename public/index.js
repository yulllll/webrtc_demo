const state = {
  roomId: "SECRET ROOM",
  userNumber: null,
  localStream: null,
  remoteStream: null,
  rtcPeerConnection: null,
  remoteCandidate: null,
};

const socket = io();

// 1 и 2 пользователь
socket.emit("create or join", state.roomId);

// 1 пользователь
socket.on("created", async () => {
  await createLocalMedia();
  state.userNumber = 1;
});

// 2 пользователь
socket.on("joined", async () => {
  await createLocalMedia();
  state.userNumber = 2;
  socket.emit("ready", state.roomId);
});

// 1 пользователь
socket.on("ready", async () => {
  if (state.userNumber === 1) {
    const rtcPeerConnection = createRTCConnection();

    const dataChannel = rtcPeerConnection.createDataChannel("myDataChannel");
    dataChannel.onopen = () => {
      console.log("datachannel opened");
    };

    const offerSDP = await rtcPeerConnection.createOffer();
    rtcPeerConnection.setLocalDescription(offerSDP);

    socket.emit("offer", {
      type: "offer",
      sdp: offerSDP,
      room: state.roomId,
    });
  }
});

// 2 пользователь
socket.on("offer", async (offerSDP) => {
  if (state.userNumber === 2) {
    const rtcPeerConnection = createRTCConnection();

    rtcPeerConnection.ondatachannel = ({ channel }) => {
      channel.onopen = () => {
        console.log("datachannel opened");
      };
    };

    rtcPeerConnection.setRemoteDescription(offerSDP);

    const answerSDP = await rtcPeerConnection.createAnswer();
    rtcPeerConnection.setLocalDescription(answerSDP);
    socket.emit("answer", {
      type: "answer",
      sdp: answerSDP,
      room: state.roomId,
    });
  }
});

socket.on("answer", (answerSDP) => {
  state.rtcPeerConnection.setRemoteDescription(answerSDP);
  if (state.remoteCandidate) {
    state.rtcPeerConnection.addIceCandidate(state.remoteCandidate);
  }
});

socket.on("candidate", (candidate) => {
  if (state.rtcPeerConnection?.remoteDescription) {
    state.rtcPeerConnection.addIceCandidate(candidate);
  } else {
    state.remoteCandidate = candidate;
  }
});

async function createLocalMedia() {
  const videoEl = document.createElement("video");
  videoEl.setAttribute("autoplay", true);
  videoEl.setAttribute("muted", true);
  videoEl.setAttribute("id", "local");
  document.body.appendChild(videoEl);

  state.localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });

  videoEl.srcObject = state.localStream;
}

function createRTCConnection() {
  const rtcPeerConnection = new RTCPeerConnection({
    iceServer: [
      { urls: "stun:stun.services.mozilla.com" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
  });

  rtcPeerConnection.onicecandidate = onIceCandidate;
  rtcPeerConnection.ontrack = onTrack;

  state.localStream.getTracks().forEach((track) => {
    rtcPeerConnection.addTrack(track, state.localStream);
  });

  state.rtcPeerConnection = rtcPeerConnection;

  return rtcPeerConnection;
}

function onIceCandidate(evt) {
  if (evt.candidate) {
    socket.emit("candidate", {
      type: "candidate",
      room: state.roomId,
      candidate: evt.candidate.toJSON(),
    });
  }
}

function onTrack(evt) {
  let videoEl = document.querySelector("#remote");
  if (!videoEl) {
    videoEl = document.createElement("video");
    videoEl.setAttribute("autoplay", true);
    videoEl.setAttribute("muted", true);
    videoEl.setAttribute("id", "remote");
    document.body.append(videoEl);
  }

  videoEl.srcObject = evt.streams[0];

  state.remoteStream = evt.streams[0];
}

// chrome://webrtc-internals/
