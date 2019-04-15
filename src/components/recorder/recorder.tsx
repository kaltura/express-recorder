import { h, Component } from "preact";
import { Playback } from "../playback/playback";
import { AudioIndicator } from "../audioIndicator/AudioIndicator";
const styles = require("./style.scss");
const fixVid = require("./webmFix.js");
type Props = {
    video: boolean;
    stream: MediaStream;
    onError?: (error: string) => void;
    doRecording: boolean;
    onRecordingEnd: (recorderBlobs: Blob[]) => void;
    discard?: boolean;
    doPlayback: boolean;
    partnerId: number;
    uiConfId: number;
};

type State = {
    blobFixReady: boolean;
};

/**
 * Handle the actual recording with given stream. Gather all blob data and handle start/stop.
 */
export class Recorder extends Component<Props, State> {
    static defaultProps = {
        doRecording: false,
        discard: false,
        doPlayback: false
    };

    mediaRecorder: any;
    startTime: number;
    duration: number;
    recordedBlobs: Blob[];
    videoRef: HTMLMediaElement | null;
    fixedBlob: any;

    constructor(props: Props) {
        super(props);
        this.startTime = 0;
        this.duration = 0;
        this.mediaRecorder = null;
        this.videoRef = null;
        this.recordedBlobs = [];
        this.fixedBlob = null;

        this.state = { blobFixReady: false };
    }

    componentDidUpdate(prevProps: Props) {
        const { stream, doRecording, discard, doPlayback } = this.props;

        if (!doPlayback) {
            this.videoRef!.srcObject = stream;
        }

        if (doRecording !== prevProps.doRecording) {
            this.toggleRecording();
        }

        if (discard) {
            this.recordedBlobs = [];
        }
    }

    toggleRecording = () => {
        const doRecording = this.props.doRecording;
        if (doRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    };

    startRecording = () => {
        const { stream } = this.props;
        let options = { mimeType: "video/webm;codecs=vp9" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: "video/webm;codecs=vp8" };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: "video/webm" };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: "" };
                }
            }
        }
        try {
            this.mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            if (this.props.onError) {
                this.props.onError("Browser not supported: " + e.message);
            }
            return;
        }

        this.mediaRecorder.ondataavailable = this.handleDataAvailable;
        this.mediaRecorder.start(10); // collect 10ms of data
        this.startTime = new Date().getTime();
        this.fixedBlob = null;
        this.setState({ blobFixReady: false });
    };

    stopRecording = () => {
        this.mediaRecorder.stop();
        if (this.props.onRecordingEnd) {
            //since there a known issue with video/webm mime type where there is no duration tag resulting in LIVE displayed in the player and no seek bar,
            //(see https://github.com/muaz-khan/RecordRTC/issues/145) a fix that adds this tag is used here.
            this.duration = new Date().getTime() - this.startTime;
            const blob = new Blob(this.recordedBlobs, { type: "video/webm" });
            fixVid(blob, this.duration, this.handleFixedBlob);
        }
        const videoTracks = this.props.stream.getVideoTracks();
        const audioTracks = this.props.stream.getAudioTracks();

        // Release video and media devices
        videoTracks.map((item: MediaStreamTrack) => {
            item.stop();
        });
        audioTracks.map((item: MediaStreamTrack) => {
            item.stop();
        });
    };

    handleDataAvailable = (event: any) => {
        if (event.data && event.data.size > 0) {
            this.recordedBlobs.push(event.data);
        }
    };

    /*
    Called by the webm fixer once the fix is ready.
     */
    handleFixedBlob = (blob: any) => {
        this.props.onRecordingEnd(this.recordedBlobs);
        this.fixedBlob = blob;
        this.setState({ blobFixReady: true });
    };

    render(props: Props) {
        const { doPlayback, partnerId, uiConfId, video, stream } = this.props;
        let noVideoClass = !video ? "__no-video" : "";

        if (doPlayback && this.recordedBlobs.length > 0) {
            if (this.state.blobFixReady) {
                const media = {
                    blob: this.fixedBlob,
                    mimeType: "video/webm"
                };

                return (
                    <div className={styles["express-recorder__playback"]}>
                        <Playback
                            partnerId={partnerId}
                            uiconfId={uiConfId}
                            media={media}
                            autoPlay={true}
                        />
                    </div>
                );
            }
        }

        return (
            <div>
                {!video && (
                    <div class={`no-video-text ${styles["no-video-text"]}`}>
                        Recording Audio Only
                        {stream && (
                            <div class={styles["audio-indicator"]}>
                                <AudioIndicator stream={stream} />
                            </div>
                        )}
                    </div>
                )}
                <video
                    id="recorder"
                    className={`express-recorder__recorder ${
                        styles["express-recorder__recorder" + noVideoClass]
                    }`}
                    muted={true}
                    autoPlay={true}
                    ref={node => (this.videoRef = node as HTMLMediaElement)}
                />
            </div>
        );
    }
}
