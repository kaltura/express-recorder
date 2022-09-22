import { h, Component } from "preact";
import { Playback } from "../Playback/Playback";
import { AudioIndicator } from "../AudioIndicator/AudioIndicator";
const styles = require("./style.scss");
type Props = {
    video: boolean;
    videoStream?: MediaStream;
    screenStream?: MediaStream;
    screenShareOn: boolean;
    onError?: (error: string) => void;
    doRecording: boolean;
    onRecordingEnd: (recorderBlobs: Blob[], duration: number, screenBlobs?: Blob[]) => void;
    discard?: boolean;
    doPlayback: boolean;
    partnerId: number;
    uiConfId: number;
    blob: Blob;
    screenBlob: Blob;
};

type State = {};

/**
 * Handle the actual recording with given stream. Gather all blob data and handle start/stop.
 */
export class Recorder extends Component<Props, State> {
    static defaultProps = {
        doRecording: false,
        discard: false,
        doPlayback: false
    };

    mediaRecorder: any; // recorder for audio and camera
    screenRecorder?: any; // recorder for screen sharing
    recordedBlobs: Blob[]; // blobs from stream recording of camera and audio
    screenBlobs: Blob[]; // blobs from stream recording of screen sharing
    videoRef?: HTMLMediaElement;
    screenRef?: HTMLMediaElement;
    startTime: number;

    constructor(props: Props) {
        super(props);
        this.mediaRecorder = null;
        this.recordedBlobs = [];
        this.screenBlobs = [];
        this.startTime = 0;
    }
    componentDidMount() {
        this.startStreamIfPossible();
    }

    componentDidUpdate(prevProps: Props) {
        const { doRecording, discard } = this.props;
        this.startStreamIfPossible();

        if (doRecording !== prevProps.doRecording) {
            this.toggleRecording();
        }

        if (discard) {
            this.recordedBlobs = [];
            this.screenBlobs = [];
        }
    }

    startStreamIfPossible = () => {
        const { videoStream, screenStream, doPlayback } = this.props;
        if (!doPlayback) {
            if (this.videoRef && videoStream) {
                this.videoRef.srcObject = videoStream;
            }

            if (screenStream && this.screenRef) {
                this.screenRef.srcObject = screenStream;
            }
        }
    };

    toggleRecording = () => {
        const doRecording = this.props.doRecording;
        if (doRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    };

    startRecording = () => {
        const { videoStream, screenStream, screenShareOn } = this.props;

        const mimeTypes = [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs:vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm;codecs:vp8,opus",
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm;codecs=h264",
            "video/webm;codecs=H264",
            "video/webm",
            "video/mpeg4",
            ""
        ];
        let options = { mimeType: "" };
        for (let i = 0; i < mimeTypes.length; i++) {
            let mimeType = mimeTypes[i];
            options = { mimeType: mimeType };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.log(mimeType + " is not Supported");
            } else {
                break;
            }
        }

        console.log(options.mimeType + " is selected");

        try {
            if (videoStream) {
                this.mediaRecorder = new MediaRecorder(videoStream, options);
                this.mediaRecorder.ondataavailable = (event: any) =>
                    this.handleDataAvailable(event, "video");
                this.mediaRecorder.start(10); // collect 10ms of data
            }
            if (screenShareOn && screenStream) {
                this.screenRecorder = new MediaRecorder(screenStream, options);
                this.screenRecorder.ondataavailable = (event: any) =>
                    this.handleDataAvailable(event, "screen");
                this.screenRecorder.start(10);
            }
        } catch (e) {
            if (this.props.onError) {
                this.props.onError("Browser not supported: " + e.message);
            }
            return;
        }

        this.startTime = Date.now();
    };

    stopRecording = () => {
        const { screenStream, screenShareOn } = this.props;

        this.mediaRecorder && this.mediaRecorder.stop();
        if (screenStream && screenShareOn) {
            this.screenRecorder.stop();
        }
        if (this.props.onRecordingEnd) {
            this.props.onRecordingEnd(
                this.recordedBlobs,
                Date.now() - this.startTime,
                this.screenBlobs
            );
        }
    };

    handleDataAvailable = (event: any, dataType: "video" | "screen") => {
        if (event.data && event.data.size > 0) {
            if (dataType === "video") {
                this.recordedBlobs.push(event.data);
            } else {
                this.screenBlobs.push(event.data);
            }
        }
    };

    render(props: Props) {
        const {
            doPlayback,
            partnerId,
            uiConfId,
            videoStream,
            screenShareOn,
            video,
            screenStream
        } = this.props;
        const shareScreenClass = screenShareOn ? "express-recorder__recorder__share-screen" : "";
        let media = undefined,
            screenMedia = undefined;

        if (doPlayback) {
            if (this.recordedBlobs && this.recordedBlobs.length > 0) {
                media = {
                    blob: this.props.blob,
                    mimeType: "video/webm"
                };
            }
            if (this.screenBlobs && this.screenBlobs.length > 0) {
                screenMedia = {
                    blob: this.props.screenBlob,
                    mimeType: "video/webm"
                };
            }

            return (
                <div
                    className={`express-recorder__playback ${styles["express-recorder__playback"]}`}
                >
                    <Playback
                        partnerId={partnerId}
                        uiconfId={uiConfId}
                        cameraMedia={media}
                        screenMedia={screenMedia}
                        autoPlay={false}
                    />
                </div>
            );
        }

        return (
            <div class={`xr_video-object-wrap ${styles["video-object-wrap"]}`}>
                {screenShareOn && (
                    <video
                        id={"screenShare"}
                        className={`express-recorder__screen ${styles["express-recorder__screen"]}`}
                        muted={true}
                        autoPlay={true}
                        ref={node => {
                            this.screenRef = node as HTMLMediaElement;
                        }}
                    />
                )}
                {!video ? (
                    <div className={`${styles["express-recorder__recorder__no-video"]}`}>
                        <div class={`xr_no-video-text ${styles["no-video-text"]}`}>
                            {screenShareOn ? (
                                <div class={styles["audio-indicator"]}>
                                    <AudioIndicator stream={videoStream || screenStream} />
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <video
                        id="recorder"
                        className={`express-recorder__recorder ${styles["express-recorder__recorder"]} ${styles[shareScreenClass]}`}
                        muted={true}
                        autoPlay={true}
                        ref={node => {
                            this.videoRef = node as HTMLMediaElement;
                        }}
                    />
                )}
            </div>
        );
    }
}
