//-------------------- WEBSOCKET --------------------------------------

//var hostArray = window.location.host.split(":");
//var serverLoc = "ws://" + hostArray[0] + ":8080/";
//var socket = new WebSocket(serverLoc); 

//socket.addEventListener("message", onWebSocketMessage, false);

var socket = io.connect('http://localhost:8080/');

socket.on('message', function (data) {
    console.log("client a reçu un message : " + JSON.stringify(data));

        var message = JSON.parse(data);
    if (message.messageType === 'offer') {
        console.log("Received offer...")
      
        if (!mediaFlowing) {
            //createPeerConnection();
            mediaFlowing = true;
        }
        console.log('Creating remote session description...');
        var remoteDescription = message.peerDescription;

        var RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.RTCSessionDescription;
        pc.setRemoteDescription(new RTCSessionDescription(remoteDescription), function () {
            console.log('Sending answer...');
            pc.createAnswer(setLocalDescAndSendMessageAnswer, onCreateAnswerFailed);
        }, function () {
            console.log('Error setting remote description');
        });
    } else if (message.messageType === 'answer' && mediaFlowing) {
        console.log('Received answer...');
        console.log('Setting remote session description...');
        var remoteDescription = message.peerDescription;
        var RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.RTCSessionDescription;
        pc.setRemoteDescription(new RTCSessionDescription(remoteDescription));
    } else if (message.messageType === "iceCandidate" && mediaFlowing) {
        console.log('Received ICE candidate...');
        var RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.RTCIceCandidate;
        var candidate = new RTCIceCandidate({ sdpMLineIndex: message.candidate.sdpMLineIndex, sdpMid: message.candidate.sdpMid, candidate: message.candidate.candidate });
        pc.addIceCandidate(candidate);
    } else if (message.messageType === 'bye' && mediaFlowing) {
        console.log("Received bye");
        stop();
    }
});

//function onWebSocketMessage(evt) {
//    var message = JSON.parse(evt.data);
//    if (message.messageType === 'offer') {
//        console.log("Received offer...")
//        console.log(evt);
//        if (!mediaFlowing) {
//            createPeerConnection();
//            mediaFlowing = true;
//        }
//        console.log('Creating remote session description...');
//        var remoteDescription = message.peerDescription;

//        var RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.RTCSessionDescription;
//        pc.setRemoteDescription(new RTCSessionDescription(remoteDescription), function () {
//            console.log('Sending answer...');
//            pc.createAnswer(setLocalDescAndSendMessageAnswer, onCreateAnswerFailed);
//        }, function () {
//            console.log('Error setting remote description');
//        });
//    } else if (message.messageType === 'answer' && mediaFlowing) {
//        console.log('Received answer...');
//        console.log('Setting remote session description...');
//        var remoteDescription = message.peerDescription;
//        var RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.RTCSessionDescription;
//        pc.setRemoteDescription(new RTCSessionDescription(remoteDescription));
//    } else if (message.messageType === "iceCandidate" && mediaFlowing) {
//        console.log('Received ICE candidate...');
//        var RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.RTCIceCandidate;
//        var candidate = new RTCIceCandidate({ sdpMLineIndex: message.candidate.sdpMLineIndex, sdpMid: message.candidate.sdpMid, candidate: message.candidate.candidate });
//        pc.addIceCandidate(candidate);
//    } else if (message.messageType === 'bye' && mediaFlowing) {
//        console.log("Received bye");
//        stop();
//    }
//}

//-------------------- WEBRTC ------------------------------------------

var yourVideo = document.getElementById("myVideo");
var friendsVideo = document.getElementById("otherVideo");
var yourId = Math.floor(Math.random() * 1000000000);
var servers = { "iceServers": [] };
var mediaFlowing = false;
var mediaConstraints = {
    'mandatory': {
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': true
    }
};
//try {
//    pc = new RTCPeerConnection(servers);
//} catch (e) {
//    console.log("Failed to create PeerConnection, exception: " + e.message);
//}

var mediaRecorderLocal;
var mediaRecorderRemote;
var chunksLocal = [];
var chunksRemote = [];
var recorderDate;
var streamLocal;

//pc.onicecandidateerror = (event) => {
//    console.log("ice candidate error " + event);
//}
//pc.onicecandidate = (event => event.candidate ? socket.emit(JSON.stringify({'ice': event.candidate })) : verifyIceCandidates());
////Si l'ICE candidate n'est pas bon (la connexion n'est pas passée) on relance une offer
//function verifyIceCandidates() {
//    console.log("verify");
//    console.log("Sent All Ice, connectionState : " + pc.connectionState);
//    if (pc.connectionState === "failed") {
//        console.log("failed");
//    }
//}



var constraints = {
    audio: true, video: {width:240, height:320} };

navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
    for (const track of mediaStream.getTracks()) {
        pc.addTrack(track, mediaStream);
        console.log("mediastream id local : " + mediaStream.id);
    }
    yourVideo.srcObject = mediaStream;
    console.log(mediaStream);

    mediaRecorderLocal = new MediaRecorder(mediaStream);

    mediaRecorderLocal.ondataavailable = function (e) {
        chunksLocal.push(e.data);
    }

    mediaRecorderLocal.onstop = function (e) {
        console.log("MediaRecoreLocal onStop");

        if (mediaRecorderRemote.state == "recording") {
            mediaRecorderRemote.stop();
        }

        if (recorderDate == undefined) {
            recorderDate = Date.now();
        }

        var blob = new Blob(chunksLocal, { type: "video/webm" });
        chunksLocal = [];
        console.log(blob);

        var videoRef = storageRef.child("/historique/" + recorderDate + "/local");
        videoRef.put(blob).then(function (snapshot) {
            console.log('Uploaded local video to firebase storage');
        });
    }
}).catch((err) => {
    console.log(err);
    });

function setLocalDescAndSendMessageOffer(sessionDescription) {
    //if (useH264) {
    //    // use H264 video codec in offer every time
    //    sessionDescription.sdp = useH264Codec(sessionDescription.sdp);
    //}
    pc.setLocalDescription(sessionDescription);
    console.log("Sending SDP offer: ");
    console.log(sessionDescription);
    socket.emit("message", JSON.stringify({
        "messageType": "offer",
        "peerDescription": sessionDescription
    }));
    //socket.send(JSON.stringify({
    //    "messageType": "offer",
    //    "peerDescription": sessionDescription
    //}));
}

function setLocalDescAndSendMessageAnswer(sessionDescription) {
    //if (useH264) {
    //    // use H264 video codec in offer every time 
    //    sessionDescription.sdp = useH264Codec(sessionDescription.sdp);
    //}
    pc.setLocalDescription(sessionDescription);

    console.log("Sending SDP answer:");
    console.log(sessionDescription);
    socket.emit("message", JSON.stringify({
        "messageType": "answer",
        "peerDescription": sessionDescription
    }));
    //socket.send(JSON.stringify({
    //    "messageType": "answer",
    //    "peerDescription": sessionDescription
    //}));
}

function call() {
    if (!mediaFlowing) {
        
        mediaFlowing = true;
        pc.createOffer(setLocalDescAndSendMessageOffer, onCreateOfferFailed, mediaConstraints);
    } else {
        alert("Local stream not running yet or media still flowing");
    }
}

// stop the connection on button click 
function disconnect() {
    console.log("disconnect.");
    socket.emit("message", JSON.stringify({ messageType: "bye" }));
    //socket.send(JSON.stringify({ messageType: "bye" }));
    stop();
}
function stop() {
    pc.close();
    pc = null;
    friendsVideo.src = null;
    mediaFlowing = false;
}
function onCreateAnswerFailed(error) {
    console.log("Create Answer failed:", error);
}

function onCreateOfferFailed() {
    console.log("Create Offer failed");
}



    RTCPeerConnection = window.webkitRTCPeerConnection || window.RTCPeerConnection;
    var pc_config = { "iceServers": [] };
    try {
        pc = new RTCPeerConnection(pc_config);
    } catch (e) {
        console.log("Failed to create PeerConnection, exception: " + e.message);
    }
    // send any ice candidates to the other peer
    pc.onicecandidate = function (evt) {
        if (evt.candidate) {
            console.log('Sending ICE candidate...');
            console.log(evt.candidate);
            socket.send(JSON.stringify({
                "messageType": "iceCandidate",
                "candidate": evt.candidate
            }));
        } else {
            console.log("End of candidates.");
        }
    };
    pc.ontrack = ({ streams: [stream] }) => {
        //window.stream ==> passage du stream dans l'objet window de la page web
        window.stream = stream;
        if ("srcObject" in friendsVideo) {
            friendsVideo.srcObject = stream;
        } else {
            friendsVideo.src = window.URL.createObjectURL(stream);
        }
        friendsVideo.onloadedmetadata = function (e) {
            console.log("onloadedmetadata");
            friendsVideo.play();
        };

        mediaRecorderRemote = new MediaRecorder(stream);
        mediaRecorderRemote.start();
        mediaRecorderLocal.start();
        console.log(mediaRecorderRemote.state);
        console.log("recorders started : Remote : " + mediaRecorderRemote.state + " Local : " + mediaRecorderLocal.state);

        mediaRecorderRemote.ondataavailable = function (e) {
            chunksRemote.push(e.data);
        }

        mediaRecorderRemote.onstop = function (e) {
            console.log("MediaRecoreRemote onStop");

            if (recorderDate == undefined) {
                recorderDate = Date.now();
            }

            var blob = new Blob(chunksRemote, { type: "video/webm" });
            chunksRemote = [];
            console.log(blob);

            var videoRef = storageRef.child("/historique/" + recorderDate + "/remote");
            videoRef.put(blob).then(function (snapshot) {
                console.log('Uploaded remote video to firebase storage');
            });
        }
    }
