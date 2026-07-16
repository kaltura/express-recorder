import { Component, h } from "preact";
import { BlurLevel } from "../../services/BackgroundBlurProcessor";

const styles = require("./settings-recording.scss");

type HeadPosition = "left" | "center" | "right" | "none";
type LightingStatus = "optimal" | "dark" | "bright" | "unknown";

type Props = {
    cameraStream?: MediaStream;
    processedCameraStream?: MediaStream;
    onBlurChange: (level: BlurLevel) => void;
    blurLevel: BlurLevel;
};

type State = {
    headPosition: HeadPosition;
    lightingStatus: LightingStatus;
    modelLoading: boolean;
};

declare var blazeface: any;

const BLAZEFACE_URL = "https://unpkg.com/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js";
const TFJS_URL = "https://unpkg.com/@tensorflow/tfjs@4.17.0/dist/tf.min.js";

const UserIcon = ({ color }: { color: string }) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            fill={color}
            d="M12 13c2.2091 0 4-1.7909 4-4 0-2.2091-1.7909-4-4-4-2.2091 0-4 1.7909-4 4 0 2.2091 1.7909 4 4 4Zm-7 5.5C5 16.567 6.567 15 8.5 15h7c1.933 0 3.5 1.567 3.5 3.5V20H5v-1.5Z"
        />
    </svg>
);

const BLUR_OPTIONS: { label: string; value: BlurLevel }[] = [
    { label: "No blur", value: "none" },
    { label: "Light", value: "light" },
    { label: "Medium", value: "medium" },
    { label: "Heavy", value: "heavy" }
];

export class SettingsRecording extends Component<Props, State> {
    videoRef: HTMLVideoElement | null = null;
    canvasRef: HTMLCanvasElement | null = null;
    intervalId: number = 0;
    model: any = null;

    constructor(props: Props) {
        super(props);
        this.state = { headPosition: "none", lightingStatus: "unknown", modelLoading: true };
    }

    componentDidMount() {
        this.attachStream();
        this.loadModelAndStart();
    }

    componentDidUpdate(prevProps: Props) {
        const activeStream = this.props.processedCameraStream || this.props.cameraStream;
        const prevActive = prevProps.processedCameraStream || prevProps.cameraStream;
        if (prevActive !== activeStream) {
            this.attachStream();
        }
    }

    componentWillUnmount() {
        this.stopDetection();
    }

    setVideoRef = (node: HTMLVideoElement | null) => {
        this.videoRef = node;
    };

    setCanvasRef = (node: HTMLCanvasElement | null) => {
        this.canvasRef = node;
    };

    attachStream() {
        if (this.videoRef) {
            const stream = this.props.processedCameraStream || this.props.cameraStream;
            if (stream) {
                this.videoRef.srcObject = stream;
            }
        }
    }

    stopDetection() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = 0;
        }
    }

    loadModelAndStart() {
        const loadBlazeFace = () => {
            blazeface.load().then((model: any) => {
                this.model = model;
                this.startDetection();
            });
        };

        if (typeof blazeface !== "undefined") {
            loadBlazeFace();
            return;
        }

        const loadTF = () => {
            const bfScript = document.createElement("script");
            bfScript.src = BLAZEFACE_URL;
            bfScript.onload = loadBlazeFace;
            document.head.appendChild(bfScript);
        };

        if (typeof (window as any).tf !== "undefined") {
            loadTF();
            return;
        }

        const tfScript = document.createElement("script");
        tfScript.src = TFJS_URL;
        tfScript.onload = loadTF;
        document.head.appendChild(tfScript);
    }

    startDetection() {
        const canvas = this.canvasRef;
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        this.setState({ modelLoading: false });

        this.intervalId = (setInterval(async () => {
            const video = this.videoRef;
            if (!video || !video.videoWidth) {
                return;
            }
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let sum = 0;
            const total = data.length / 4;
            for (let i = 0; i < data.length; i += 4) {
                sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            }
            const brightness = sum / total;
            const lightingStatus: LightingStatus =
                brightness < 125 ? "dark" : brightness > 180 ? "bright" : "optimal";
            this.setState({ lightingStatus });

            const predictions = await this.model.estimateFaces(canvas, false);

            if (!predictions.length) {
                this.setState({ headPosition: "none" });
                return;
            }

            const face = predictions[0];
            const [x1] = face.topLeft;
            const [x2] = face.bottomRight;
            const centerX = (x1 + x2) / 2;
            const third = canvas.width / 3;

            if (centerX < third) {
                this.setState({ headPosition: "left" });
            } else if (centerX > third * 2) {
                this.setState({ headPosition: "right" });
            } else {
                this.setState({ headPosition: "center" });
            }
        }, 350) as any) as number;
    }

    render() {
        const { headPosition, lightingStatus, modelLoading } = this.state;
        const { blurLevel, onBlurChange } = this.props;

        const grey = "#555555";
        const green = "#00cc66";
        const orange = "#ff9900";

        const leftColor = headPosition === "left" ? orange : grey;
        const centerColor = headPosition === "center" ? green : grey;
        const rightColor = headPosition === "right" ? orange : grey;

        const lightingColor =
            lightingStatus === "optimal" ? green : lightingStatus === "unknown" ? grey : orange;
        const lightingLabel =
            lightingStatus === "optimal"
                ? "Optimal"
                : lightingStatus === "dark"
                ? "Too dark"
                : lightingStatus === "bright"
                ? "Too bright"
                : "";

        return (
            <div className={styles["recording-settings"]}>
                <div className={styles["recording-settings__preview"]}>
                    <div className={styles["recording-settings__video-border"]}>
                        <video
                            ref={this.setVideoRef}
                            className={styles["recording-settings__video"]}
                            autoPlay={true}
                            muted={true}
                        />
                    </div>
                    <canvas ref={this.setCanvasRef} style={{ display: "none" }} />
                </div>
                <div className={styles["recording-settings__controls"]}>
                    <div className={styles["head-positioning"]}>
                        <div className={styles["head-positioning__title"]}>Head positioning</div>
                        {modelLoading ? (
                            <div className={styles["head-positioning__loading"]}>Loading...</div>
                        ) : (
                            <div className={styles["head-positioning__icons"]}>
                                <UserIcon color={leftColor} />
                                <UserIcon color={centerColor} />
                                <UserIcon color={rightColor} />
                            </div>
                        )}
                    </div>
                    <div className={styles["lighting"]}>
                        <div className={styles["lighting__title"]}>Lighting</div>
                        {modelLoading ? (
                            <div className={styles["lighting__loading"]}>Loading...</div>
                        ) : lightingLabel ? (
                            <div
                                className={styles["lighting__status"]}
                                style={{ color: lightingColor }}
                            >
                                {lightingLabel}
                            </div>
                        ) : null}
                    </div>
                    <div className={styles["blur-settings"]}>
                        <div className={styles["blur-settings__title"]}>Blur</div>
                        <div className={styles["blur-settings__options"]}>
                            {BLUR_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    className={`${styles["blur-option"]} ${
                                        blurLevel === opt.value ? styles["blur-option--active"] : ""
                                    }`}
                                    onClick={() => onBlurChange(opt.value)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
