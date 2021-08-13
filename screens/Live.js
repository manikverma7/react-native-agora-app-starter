import React, {useEffect, useRef, useState} from "react";

import {
  StyleSheet,
  Text,
  View,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";

import RtcEngine, {
  ChannelProfile,
  ClientRole,
  RtcLocalView,
  RtcRemoteView,
} from "react-native-agora";
import Ionicons from "react-native-vector-icons/Ionicons";

import {AppId, AppToken} from "../config";
const dimensions = {
  width: Dimensions.get("window").width,
  height: Dimensions.get("window").height,
};
export default function Live(props) {
  const AgoraEngine = useRef();
  const isBroadcaster = props.route.params.type === "create"; //true
  const [joined, setJoined] = useState(false);
  const [audMute, setAudMute] = useState(false);
  const init = async () => {
    AgoraEngine.current = await RtcEngine.create(AppId);
    await AgoraEngine.current.enableVideo();
    await AgoraEngine.current.setChannelProfile(
      ChannelProfile.LiveBroadcasting,
    );

    if (isBroadcaster) {
      await AgoraEngine.current.setClientRole(ClientRole.Broadcaster);
      console.log(isBroadcaster, ClientRole.Broadcaster);
    }

    AgoraEngine.current.addListener(
      "JoinChannelSuccess",
      (channel, uid, elapsed) => {
        console.log("JoinChannelSuccess", channel, uid, elapsed);
        setJoined(true);
      },
    );

    AgoraEngine.current.addListener("UserJoined", (uid, elapsed) => {
      console.log("UserJoined", uid, elapsed);
      // Get current peer IDs
      // const {peerIds} = this.state;
      // // If new user
      // if (peerIds.indexOf(uid) === -1) {
      //   this.setState({
      //     // Add peer ID to state array
      //     peerIds: [...peerIds, uid],
      //   });
      // }
    });

    AgoraEngine.current.addListener("UserOffline", (uid, reason) => {
      console.log("UserOffline", uid, reason);
      // const {peerIds} = this.state;
      // this.setState({
      //   // Remove peer ID from state array
      //   peerIds: peerIds.filter((id) => id !== uid),
      // });
    });

    AgoraEngine.current.addListener("Warning", (warn) => {
      console.log("Warning", warn);
    });

    AgoraEngine.current.addListener("Error", (err) => {
      console.log("Error", err);
    });
  };

  async function requestCameraAndAudioPermission() {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      if (
        granted["android.permission.RECORD_AUDIO"] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted["android.permission.CAMERA"] ===
          PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.log("You can use the cameras & mic");
      } else {
        console.log("Permission denied");
      }
    } catch (err) {
      console.warn(err);
    }
  }

  useEffect(() => {
    if (Platform.OS === "android" && isBroadcaster) {
      async function perm() {
        await requestCameraAndAudioPermission();
      }
      perm();
    }
    const uid = isBroadcaster ? 1 : 0;

    init().then(
      () =>
        AgoraEngine.current.joinChannel(
          AppToken,
          props.route.params.channel,
          null,
          uid,
        ),
      console.log("Joining...", props.route.params.channel),
    );
    return () => {
      AgoraEngine.current.destroy();
    };
  }, []);

  const switchCamera = async () => {
    await AgoraEngine.current.switchCamera();
  };

  const switchMic = async () => {
    await AgoraEngine.current.muteLocalAudioStream(!audMute);
    setAudMute(!audMute);
  };

  const endCall = async () => {
    await AgoraEngine.current.leaveChannel();

    props.navigation.pop();
  };

  return (
    <View style={styles.container}>
      {!joined ? (
        <>
          <ActivityIndicator
            size={60}
            color="#222"
            style={styles.activityIndicator}
          />
          {isBroadcaster ? (
            <Text style={styles.loadingText}>Starting Stream, Please Wait</Text>
          ) : (
            <Text style={styles.loadingText}>Joining Stream, Please Wait</Text>
          )}
        </>
      ) : (
        <>
          {isBroadcaster ? (
            <View style={{flex: 1}}>
              <RtcLocalView.SurfaceView
                style={styles.fullscreen}
                channelId={props.route.params.channel}
              />
              <View style={styles.remoteContainer}>
                <TouchableOpacity onPress={endCall} style={styles.button}>
                  <Text style={styles.buttonText}> End Live </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={switchCamera}>
                  <Ionicons
                    name="camera-reverse-sharp"
                    size={30}
                    color="#000"
                  />
                </TouchableOpacity>

                <TouchableOpacity onPress={switchMic}>
                  {audMute ? (
                    <Ionicons name="mic-off" size={30} color="#000" />
                  ) : (
                    <Ionicons name="mic" size={30} color="#000" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <RtcRemoteView.SurfaceView
              uid={1}
              style={styles.fullscreen}
              channelId={props.route.params.channel}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#222",
  },
  fullscreen: {
    width: dimensions.width,
    height: dimensions.height - 60,
  },
  remoteContainer: {
    width: "100%",
    // position: "absolute",
    // bottom: 5,
    height: 60,
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-evenly",
    backgroundColor: "transparent",
    opacity: 1,
  },

  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#0093E9",
    borderRadius: 25,
  },
  buttonText: {
    color: "#fff",
  },
});
