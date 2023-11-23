import {WebRTCAdaptor} from '@antmedia/webrtc_adaptor'
import {getUrlParameter} from '@antmedia/webrtc_adaptor'
// @ts-ignore
import { generateRandomString, getWebSocketURL, errorHandler } from '@antmedia/webrtc_adaptor';
/**
 * This page accepts 3 arguments through url parameter
 * 1. "streamId": the stream id to publish stream. It's optional. ?streamId=stream1
 * 2. "playOnly": If it's true, user does not publish stream. It only play streams in the room.
 * 3. "token": It's experimental.
 */

var token: string = typeof getUrlParameter("token") == "string" ? <string> getUrlParameter("token") : "";
var publishStreamId: string = typeof getUrlParameter("streamId") == "string" ? <string>  getUrlParameter("streamId") : generateRandomString();
var playOnly: boolean = getUrlParameter("playOnly") == "boolean" ? <boolean>  getUrlParameter("playOnly") : false;
var dcOnly: boolean = typeof getUrlParameter("dcOnly") == "boolean" ? <boolean> getUrlParameter("dcOnly") : false;

var roomId: string = typeof getUrlParameter("roomId") == "string" ? <string> getUrlParameter("roomId") : "";
var streamName: string = typeof getUrlParameter("streamName") == "string"? <string>  getUrlParameter("streamName") : "";

var subscriberId: string = typeof getUrlParameter("subscriberId") == "string" ? <string>  getUrlParameter("subscriberId") : "";
var subscriberCode: string = typeof getUrlParameter("subscriberCode") == "string" ? <string>  getUrlParameter("subscriberCode") : "";

var join_publish_button: HTMLElement | null = document.getElementById("join_publish_button");
join_publish_button?.addEventListener("click", joinRoom, false);
var stop_publish_button: HTMLElement | null = document.getElementById("stop_publish_button");
stop_publish_button?.addEventListener("click", leaveRoom, false);
var turn_off_camera_button: HTMLElement | null = document.getElementById("turn_off_camera_button");
turn_off_camera_button?.addEventListener("click", turnOffLocalCamera,false)
var turn_on_camera_button: HTMLElement | null = document.getElementById("turn_on_camera_button");
turn_on_camera_button?.addEventListener("click", turnOnLocalCamera,false)
var mute_mic_button: HTMLElement | null = document.getElementById("mute_mic_button");
mute_mic_button?.addEventListener("click", muteLocalMic,false)
var unmute_mic_button: HTMLElement | null = document.getElementById("unmute_mic_button");
unmute_mic_button?.addEventListener("click", unmuteLocalMic,false)
var options: HTMLElement | null = document.getElementById("options");
options?.addEventListener("click", toggleOptions, false);
var send: HTMLElement | null = document.getElementById("send");
send?.addEventListener("click", sendData, false);


//Handles radio buttons for screen share feature
if (document.querySelector('input[name="videoSource"]')) {
    document.querySelectorAll('input[name="videoSource"]').forEach((elem) => {
        elem.addEventListener("change", function(event) {
            var item: HTMLInputElement = <HTMLInputElement> event.target;
            switchVideoMode(item)
        });
    });
}


var roomNameBox: HTMLInputElement | null = <HTMLInputElement> document.getElementById("roomName");

if (roomId != null && typeof roomId === "string") {
    roomNameBox?.setAttribute("value", roomId);
}

var isDataChannelOpen: boolean = false;
var isMicMuted: boolean = false;
var isCameraOff: boolean = false;
var roomTimerId: ReturnType<typeof setTimeout> | number = -1;


function toggleOptions() {
    $(".options").toggle();
}

function switchVideoMode(chbx: HTMLInputElement){
    if(chbx.value == "screen") {
        webRTCAdaptor.switchDesktopCapture(publishStreamId);
    }
    else if(chbx.value == "screen+camera"){
        webRTCAdaptor.switchDesktopCaptureWithCamera(publishStreamId);
    }
    else {
        webRTCAdaptor.switchVideoCameraCapture(publishStreamId, chbx.value);
    }
}

function turnOffLocalCamera() {
    webRTCAdaptor.turnOffLocalCamera(publishStreamId);
    isCameraOff = true;
    handleCameraButtons();
    sendNotificationEvent("CAM_TURNED_OFF");
}

function turnOnLocalCamera() {
    webRTCAdaptor.turnOnLocalCamera(publishStreamId);
    isCameraOff = false;
    handleCameraButtons();
    sendNotificationEvent("CAM_TURNED_ON");
}

function muteLocalMic(){
    webRTCAdaptor.muteLocalMic();
    isMicMuted = true;
    handleMicButtons();
    sendNotificationEvent("MIC_MUTED");
}

function unmuteLocalMic() {
    webRTCAdaptor.unmuteLocalMic();
    isMicMuted = false;
    handleMicButtons();
    sendNotificationEvent("MIC_UNMUTED");
}

function sendNotificationEvent(eventType: string) {
    if(isDataChannelOpen) {
        var notEvent = { streamId: publishStreamId, eventType:eventType };

        webRTCAdaptor.sendData(publishStreamId, JSON.stringify(notEvent));
    }	else {
        console.log("Could not send the notification because data channel is not open.");
    }
}

function sendData() {
    try {
        var iceState = webRTCAdaptor.iceConnectionState(publishStreamId);
        if (iceState != null && iceState != "failed" && iceState != "disconnected") {

            var msg = $("#dataTextbox").val();
            var notEvent = { streamId: publishStreamId, eventType:"CHAT_MESSAGE", message:msg };

            webRTCAdaptor.sendData(publishStreamId, JSON.stringify(notEvent));
            $("#all-messages").append("Sent: " + msg+ "<br>");
            $("#dataTextbox").val("");
        }
        else {
            console.warn("WebRTC playing is not active. Please click Start Playing first");
        }
    }
    catch (exception) {
        console.error(exception);
    }
}

function handleCameraButtons() {
    if(isCameraOff) {
        turn_off_camera_button?.setAttribute("disabled", "true");
        turn_on_camera_button?.removeAttribute("disabled");
    } else {
        turn_off_camera_button?.removeAttribute("disabled");
        turn_on_camera_button?.setAttribute("disabled", "true");
    }
}

function handleMicButtons() {
    if(isMicMuted) {
        mute_mic_button?.setAttribute("disabled", "true");
        unmute_mic_button?.removeAttribute("disabled");
    } else {
        mute_mic_button?.removeAttribute("disabled");
        unmute_mic_button?.setAttribute("disabled", "true");
    }
}

function handleNotificationEvent(data: any) {
    console.log("Received data : ", data.data);
    var notificationEvent = JSON.parse(data.data);
    if(notificationEvent != null && typeof(notificationEvent) == "object") {
        var eventStreamId = notificationEvent.streamId;
        var eventTyp = notificationEvent.eventType;

        if(eventTyp == "CAM_TURNED_OFF") {
            console.log("Camera turned off for : ", eventStreamId);
        } else if (eventTyp == "CAM_TURNED_ON"){
            console.log("Camera turned on for : ", eventStreamId);
        } else if (eventTyp == "MIC_MUTED"){
            console.log("Microphone muted for : ", eventStreamId);
        } else if (eventTyp == "MIC_UNMUTED"){
            console.log("Microphone unmuted for : ", eventStreamId);
        } else if (eventTyp == "CHAT_MESSAGE"){
            $("#all-messages").append("Received: " + notificationEvent.message + "<br>");
        }
    }
}

function joinRoom() {
    //if streamId is received as query parameter, use it to join the room
    webRTCAdaptor.joinRoom(roomNameBox!!.value, publishStreamId, "multitrack");
}

function leaveRoom() {
    if (roomTimerId != -1) {
        //clear roomTimerId if user immediately joins and left the room
        clearInterval(roomTimerId);
        roomTimerId = -1;
    }
    let roomName: string = roomNameBox?.value != null ? roomNameBox.value : "";
    webRTCAdaptor.leaveFromRoom(roomName);
}

function publish(streamId: string, token: string) {
    //update the publishStreamId to make sure it's correct
    publishStreamId = streamId;
    webRTCAdaptor.publish(publishStreamId, token, subscriberId, subscriberCode, streamName, roomNameBox!!.value,"{someKey:someValue}");
}

function playVideo(obj: any) {

    //In multitrack conferencing the stream is same, tracks are being and remove from the stream

    var roomId: string | undefined = roomNameBox?.value;
    console.log("new track available with id: "
        + obj.trackId + " and kind: " + obj.track.kind + " on the room:" + roomId);

    //trackId is ARDAMSv+STREAM_ID or  ARDAMSa+STREAM_ID
    var incomingTrackId = obj.trackId.substring("ARDAMSx".length);

    if(incomingTrackId == roomId || incomingTrackId == publishStreamId) {
        return;
    }

    var video: HTMLVideoElement | null = <HTMLVideoElement> document.getElementById("remoteVideo"+incomingTrackId);

    if (video == null) {
        createRemoteVideo(incomingTrackId);
        video = <HTMLVideoElement> document.getElementById("remoteVideo"+incomingTrackId);
        video.srcObject = new MediaStream();
    }

    // @ts-ignore
    video.srcObject?.addTrack(obj.track)

    obj.stream.onremovetrack = (event: any) => {
        console.log("track is removed with id: " + event.track.id )
        console.log(event);
        var removedTrackId = event.track.id.substring("ARDAMSx".length);
        removeRemoteVideo(removedTrackId);
    }

}

function enableAudioLevel() {
    //TODO: Disable this one if user stops publishing
    webRTCAdaptor.enableAudioLevelForLocalStream((value: any) => {

        //PAY ATTENTION: No need to send audio level any more because server side can get it from the RTP header in AMS v2.7+
        //webRTCAdaptor.updateAudioLevel(publishStreamId,  Math.floor(value*100));
    }, 200);
};

function createRemoteVideo(streamId: string) {
    var player = document.createElement("div");
    player.className = "col-sm-3";
    player.id = "player"+streamId;
    player.innerHTML = '<video id="remoteVideo'+streamId+'"controls autoplay playsinline></video>'+streamId;
    document.getElementById("players")?.appendChild(player);
}

function removeRemoteVideo(streamId: string) {
    var video: HTMLVideoElement | null = <HTMLVideoElement> document.getElementById("remoteVideo"+streamId);
    if (video != null) {
        var player: HTMLDivElement | null = <HTMLDivElement> document.getElementById("player" + streamId);
        video.srcObject = null;
        document.getElementById("players")?.removeChild(player);
    }
}

function removeAllRemoteVideos() {
    //remove all remote video under players
    //just don't remove the first element because it's local camera
    var children: HTMLCollection | null = <HTMLCollection> document.getElementById("players")?.children;
    let i = 1;
    while (i < children.length) {
        document.getElementById("players")?.removeChild(children[i]);
        i++;
    }
}

function startAnimation() {

    $("#broadcastingInfo")
        .fadeIn(
            800,
            function() {
                $("#broadcastingInfo")
                    .fadeOut(
                        800,
                        function() {
                            var state = webRTCAdaptor
                                .signallingState(publishStreamId);
                            if (state != null
                                && state != "closed") {
                                var iceState = webRTCAdaptor
                                    .iceConnectionState(publishStreamId);
                                if (iceState != null
                                    && iceState != "failed"
                                    && iceState != "disconnected") {
                                    startAnimation();
                                }
                            }
                        });
            });

}

var mediaConstraints: any = {
    video : !dcOnly ? { width: {min: 176, max:360}} : !dcOnly,
    audio : !dcOnly
};

var websocketURL = getWebSocketURL(location);

var isPlaying: boolean = false;
var webRTCAdaptor: WebRTCAdaptor = new WebRTCAdaptor(
    {
        websocket_url : websocketURL,
        mediaConstraints : mediaConstraints,
        localVideoId : "localVideo",
        isPlayMode : playOnly,
        onlyDataChannel : dcOnly,
        debug : true,
        callback : (info: any, obj: any): void => {
            if (info == "initialized") {
                console.log("initialized");
                join_publish_button?.removeAttribute("disabled");
                stop_publish_button?.setAttribute("disabled", "true");
                if(playOnly){
                    isCameraOff = true;
                    handleCameraButtons();
                }
            }
            else if (info == "joinedTheRoom") {
                let room: string = obj.room;
                console.log("joined the room: " + room);
                console.log(obj)

                publishStreamId = obj.streamId;

                console.log(obj.streams);

                if(playOnly) {
                    join_publish_button?.setAttribute("disabled", "true");
                    stop_publish_button?.removeAttribute("disabled");
                    isCameraOff = true;
                    handleCameraButtons();
                }
                else {
                    publish(obj.streamId, token);
                }

                if (obj.streams.length > 0) {
                    var tempList = obj.streams;
                    //just disable itself
                    tempList.push("!"+publishStreamId);

                    webRTCAdaptor.play(roomNameBox!!.value, token, roomNameBox!!.value, [], subscriberId, subscriberCode, "{someKey:someValue}");
                }

                //just call once - no need to have periodic check
                roomTimerId = setTimeout(function () {

                    webRTCAdaptor.getRoomInfo(roomNameBox!!.value, publishStreamId);
                }, 3000);

            }
            else if (info == "newTrackAvailable") {
                playVideo(obj);
            }
            else if (info == "publish_started") {
                //stream is being published
                console.debug("publish started to room " + roomNameBox?.value);
                join_publish_button?.setAttribute("disabled", "true");
                stop_publish_button?.removeAttribute("disabled");
                startAnimation();

                enableAudioLevel();
            }
            else if (info == "publish_finished") {
                //stream is being finished
                console.debug("publish finished");
            }
            else if (info == "browser_screen_share_supported") {
                console.log("browser screen share supported");
            }
            else if (info == "leavedFromRoom") {
                var room = obj.ATTR_ROOM_NAME;
                console.debug("leaved from the room:" + room);

                join_publish_button?.removeAttribute("disabled");
                stop_publish_button?.setAttribute("disabled", "true");

                removeAllRemoteVideos();
                isPlaying = false;
            }
            else if (info == "play_started") {
                isPlaying = true;
            }
            else if (info == "play_finished") {
                //this event is fired when room is finished to play
                console.log("play_finished for stream:" + obj.streamId);
                removeAllRemoteVideos();
                isPlaying = false;
            }
            else if (info == "roomInformation") {

                if(!isPlaying && obj.streams.length > 0) {
                    var tempList = obj.streams;
                    //just disable itself
                    tempList.push("!"+publishStreamId);
                    webRTCAdaptor.play(roomNameBox!!.value, token, roomNameBox!!.value, tempList, subscriberId, subscriberCode, "{someKey:someValue}");
                    isPlaying = true;
                }
            }
            else if (info == "data_channel_opened") {
                console.log("Data Channel open for stream id", obj );
                isDataChannelOpen = true;
            }
            else if (info == "data_channel_closed") {
                console.log("Data Channel closed for stream id", obj );
                isDataChannelOpen = false;
            }
            else if(info == "data_received") {
                handleNotificationEvent(obj);
            }
            else if(info == "session_restored"){
                handleCameraButtons();
                startAnimation();
                console.log(info + "notification received");
            }
        },
        callbackError : function(error: any, message: any) {
            //some of the possible errors, NotFoundError, SecurityError,PermissionDeniedError

            var errorMessage = '';
            if (error.indexOf("NotAllowedError") != -1
                || error.indexOf("PermissionDeniedError") != -1) {
                errorMessage = "You are not allowed to access camera and mic.";
            } else if (error.indexOf("ScreenSharePermissionDenied") != -1) {
                errorMessage = "You are not allowed to access screen share";
            }

            if (error.indexOf("no_active_streams_in_room") != -1){

                roomTimerId = setTimeout(function () {
                    webRTCAdaptor.getRoomInfo(roomNameBox!!.value, publishStreamId);
                }, 3000);
            }
            else {
                console.error("Warning: " + errorHandler(error, message));
            }

        }
    });

(<any>window).webRTCAdaptor = webRTCAdaptor;