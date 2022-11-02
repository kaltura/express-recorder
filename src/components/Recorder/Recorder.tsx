import { h, Component } from "preact";
import { AudioIndicator } from "../AudioIndicator/AudioIndicator";
const styles = require("./style.scss");
type Props = {
    videoStream?: MediaStream;
    screenStream?: MediaStream;
    screenShareOn: boolean;
    onError?: (error: string) => void;
    doRecording: boolean;
    onRecordingEnd: (duration: number, cameraBlobs?: Blob[], screenBlobs?: Blob[]) => void;
    discard?: boolean;
};

/**
 * Handle the actual recording with given stream. Gather all blob data and handle start/stop.
 */
export class Recorder extends Component<Props> {
    static defaultProps = {
        doRecording: false,
        discard: false
    };

    mediaRecorder?: any; // recorder for audio and camera
    screenRecorder?: any; // recorder for screen sharing
    recordedBlobs: Blob[]; // blobs from stream recording of camera and audio
    screenBlobs: Blob[]; // blobs from stream recording of screen sharing
    videoRef?: HTMLMediaElement;
    screenRef?: HTMLMediaElement;
    startTime: number;

    constructor(props: Props) {
        super(props);
        this.recordedBlobs = [];
        this.screenBlobs = [];
        this.startTime = 0;
    }
    componentDidMount() {
        this.showStreamIfPossible();
    }

    componentDidUpdate(prevProps: Props) {
        const { doRecording, discard, screenStream, videoStream } = this.props;

        if (discard) {
            this.recordedBlobs = [];
            this.screenBlobs = [];
            this.mediaRecorder = undefined;
            this.screenRecorder = undefined;
            return;
        }

        if (!videoStream) {
            this.mediaRecorder = undefined;
        }
        if (!screenStream) {
            this.screenRecorder = undefined;
        }

        this.showStreamIfPossible();

        if (doRecording !== prevProps.doRecording) {
            this.toggleRecording();
        }
    }

    showStreamIfPossible = () => {
        const { videoStream, screenStream } = this.props;

        if (this.videoRef && videoStream) {
            this.videoRef.srcObject = videoStream;
        }

        if (screenStream && this.screenRef) {
            this.screenRef.srcObject = screenStream;
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
                this.mediaRecorder.start(3000); // collect data every 3 seconds
            }
            if (screenShareOn && screenStream) {
                this.screenRecorder = new MediaRecorder(screenStream, options);
                this.screenRecorder.ondataavailable = (event: any) =>
                    this.handleDataAvailable(event, "screen");
                this.screenRecorder.start(3000);
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
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
        }
        if (this.screenRecorder) {
            this.screenRecorder.stop();
        }
        if (this.props.onRecordingEnd) {
            this.props.onRecordingEnd(
                Date.now() - this.startTime,
                this.recordedBlobs.length > 0 ? this.recordedBlobs : undefined,
                this.screenBlobs.length > 0 ? this.screenBlobs : undefined
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
        const { videoStream, screenShareOn, screenStream } = this.props;
        const shareScreenClass = screenShareOn ? "express-recorder__recorder__share-screen" : "";

        return (
            <div class={`xr_video-object-wrap ${styles["video-object-wrap"]}`}>
                {screenShareOn && (
                    <video
                        id={"screenShare"}
                        className={`express-recorder__screen ${styles["express-recorder__screen"]}`}
                        muted={true}
                        autoPlay={true}
                        ref={node => {
                            if (!node) {
                                return;
                            }
                            this.screenRef = node as HTMLMediaElement;
                        }}
                    />
                )}
                {!videoStream || !videoStream.active ? (
                    <div className={`${styles["express-recorder__recorder__no-video"]}`}>
                        <div class={`xr_no-video-text ${styles["no-video-text"]}`}>
                            {!screenShareOn ? (
                                <div class={styles["audio-indicator"]}>
                                    <AudioIndicator stream={videoStream || screenStream} />
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <video
                        id={"recorder"}
                        className={`express-recorder__recorder ${styles["express-recorder__recorder"]} ${styles[shareScreenClass]}`}
                        muted={true}
                        autoPlay={true}
                        ref={node => {
                            if (!node) {
                                return;
                            }
                            this.videoRef = node as HTMLMediaElement;
                        }}
                    />
                )}
            </div>
        );
    }
}
