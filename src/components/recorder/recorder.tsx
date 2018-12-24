import { h, Component } from "preact";

type Props = {
    video: boolean;
    audio: boolean;
    stream: MediaStream;
};

type State = {
    isRecording: boolean;
};

export class Recorder extends Component<Props, State> {
    static defaultProps = {
        video: true,
        audio: true
    };

    mediaRecorder: any;
    recordedBlobs: Blob[];
    videoRef: HTMLMediaElement | null;

    constructor(props: Props) {
        super(props);
        this.state = {
            isRecording: false
        };

        this.mediaRecorder = null;
        this.recordedBlobs = [];
        this.videoRef = null;
    }

    componentDidUpdate() {
        this.videoRef!.srcObject = this.props.stream;
    }

    toggleRecording = () => {
        const isRecording = this.state.isRecording;
        if (!isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
        this.setState({ isRecording: !isRecording });
    };

    startRecording = () => {
        let options = { mimeType: "video/webm;codecs=vp9" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.log(options.mimeType + " is not Supported");
            options = { mimeType: "video/webm;codecs=vp8" };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.log(options.mimeType + " is not Supported");
                options = { mimeType: "video/webm" };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.log(options.mimeType + " is not Supported");
                    options = { mimeType: "" };
                }
            }
        }
        try {
            this.mediaRecorder = new MediaRecorder(this.props.stream, options);
        } catch (e) {
            console.error("Exception while creating MediaRecorder: " + e);
            alert("Exception while creating MediaRecorder: " + e);
            return;
        }
        console.log(
            "Created MediaRecorder",
            this.mediaRecorder,
            "with options",
            options
        );

        this.mediaRecorder.ondataavailable = this.handleDataAvailable;
        this.mediaRecorder.start(10); // collect 10ms of data
        console.log("MediaRecorder started", this.mediaRecorder);
    };

    stopRecording = () => {
        this.mediaRecorder.stop();
        console.log("Recorded Blobs: ", this.recordedBlobs);
    };

    handleDataAvailable = (event: any) => {
        if (event.data && event.data.size > 0) {
            this.recordedBlobs.push(event.data);
        }
    };

    render(props: Props) {
        return (
            <div>
                <h1>Recorded Stream</h1>
                <video
                    id="recorded"
                    muted={true}
                    autoPlay={true}
                    ref={node => (this.videoRef = node as HTMLMediaElement)}
                />
                <div>
                    <button id="record" onClick={this.toggleRecording}>
                        {this.state.isRecording && <span>Stop Recording</span>}
                        {!this.state.isRecording && (
                            <span>Start Recording</span>
                        )}
                    </button>
                </div>
            </div>
        );
    }
}
