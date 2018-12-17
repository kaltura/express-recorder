import { h, Component } from "preact";

type Props = {
    video: boolean;
    audio: boolean;
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
    stream: MediaStream | null;
    recordedBlobs: any[];
    videoRef: HTMLMediaElement | null;

    constructor(props: Props) {
        super(props);
        this.state = {
            isRecording: false
        };

        this.mediaRecorder = null;
        this.stream = null;
        this.recordedBlobs = [];
        this.videoRef = null;
    }

    componentDidMount = () => {
        this.getMediaStream();
        //this.videoRef = document.getElementById("video");
    };

    toggleRecording = () => {
        const isRecording = this.state.isRecording;
        if (!isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
        this.setState((prev: State) => {
            return { isRecording: !prev.isRecording };
        });
    };

    getMediaStream = async () => {
        const constraints = {
            audio: this.props.audio,
            video: this.props.video
        };

        const stream = await navigator.mediaDevices
            .getUserMedia(constraints)
            .then(this.handleSuccess)
            .catch(this.handleError);
    };

    handleSuccess = (stream: MediaStream) => {
        console.log("getUserMedia() got stream: ", stream);
        this.stream = stream;
        // if (window.URL) {
        //   this.videoRef!.src = window.URL.createObjectURL(stream);
        // } else {
        //const aaa: any = stream;
        this.videoRef!.srcObject = stream;
        // }
    };

    handleError = (error: any) => {
        console.log("handleError : " + error);
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
            this.mediaRecorder = new MediaRecorder(this.stream, options);
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
