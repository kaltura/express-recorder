import { h, Component } from "preact";

type Props = {
    video: boolean;
    audio: boolean;
    stream: MediaStream;
    onError: (error: string) => void;
    doRecording: boolean;
};

type State = {};

export class Recorder extends Component<Props, State> {
    static defaultProps = {
        video: true,
        audio: true,
        doRecording: false
    };

    mediaRecorder: any;
    recordedBlobs: Blob[];
    videoRef: HTMLMediaElement | null;

    constructor(props: Props) {
        super(props);

        this.mediaRecorder = null;
        this.recordedBlobs = [];
        this.videoRef = null;
    }

    componentDidUpdate(prevProps: Props) {
        const { stream, doRecording } = this.props;
        this.videoRef!.srcObject = stream;

        if (doRecording !== prevProps.doRecording) {
            this.toggleRecording();
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
            this.mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            console.error("Exception while creating MediaRecorder: " + e);
            if (this.props.onError) {
                return this.props.onError(
                    "Exception while creating MediaRecorder: " + e
                );
            }
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
                <video
                    id="recorded"
                    muted={true}
                    autoPlay={true}
                    ref={node => (this.videoRef = node as HTMLMediaElement)}
                />
            </div>
        );
    }
}
