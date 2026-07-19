import { Component, h } from "preact";
import { BackgroundBlurProcessor, BlurLevel } from "../../services/BackgroundBlurProcessor";

const styles = require("./settings-recording.scss");

type HeadPosition = "left" | "center" | "right" | "none";
type LightingStatus = "optimal" | "dark" | "bright" | "unknown";

type Props = {
    cameraStream?: MediaStream;
    processedCameraStream?: MediaStream;
    onBlurChange: (level: BlurLevel) => void;
    blurLevel: BlurLevel;
    blurProcessor: BackgroundBlurProcessor;
};

type State = {
    headPosition: HeadPosition;
    lightingStatus: LightingStatus;
};

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

// Off-screen canvas for brightness sampling
const brightnessCanvas = document.createElement("canvas");
const brightnessCtx = brightnessCanvas.getContext("2d");

function getLightingStatus(
    image: HTMLCanvasElement | HTMLVideoElement | ImageBitmap
): LightingStatus {
    if (!brightnessCtx) {
        return "unknown";
    }
    // Sample at reduced resolution for performance
    const W = 64;
    const H = 36;
    brightnessCanvas.width = W;
    brightnessCanvas.height = H;
    brightnessCtx.drawImage(image as any, 0, 0, W, H);
    const { data } = brightnessCtx.getImageData(0, 0, W, H);
    let sum = 0;
    const total = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const brightness = sum / total;
    return brightness < 125 ? "dark" : brightness > 180 ? "bright" : "optimal";
}

function getHeadPosition(
    mask: ImageBitmap | HTMLCanvasElement,
    width: number,
    height: number
): HeadPosition {
    // Draw top 25% of mask into a small canvas and find horizontal centroid of foreground pixels
    const W = 64;
    const H = 16; // 25% of normalized height at small res
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = W;
    tmpCanvas.height = H;
    const ctx = tmpCanvas.getContext("2d");
    if (!ctx) {
        return "none";
    }
    // Draw only the top quarter of the mask
    ctx.drawImage(mask as any, 0, 0, width, height * 0.25, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);

    let weightedX = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
        // mask is white (255) where person is detected
        const val = data[i]; // R channel
        if (val > 128) {
            const px = (i / 4) % W;
            weightedX += px;
            total++;
        }
    }

    if (total < 20) {
        return "none";
    }

    const cx = weightedX / total;
    const third = W / 3;
    if (cx < third) {
        return "left";
    } else if (cx > third * 2) {
        return "right";
    }
    return "center";
}

export class SettingsRecording extends Component<Props, State> {
    videoRef: HTMLVideoElement | null = null;

    constructor(props: Props) {
        super(props);
        this.state = { headPosition: "none", lightingStatus: "unknown" };
    }

    componentDidMount() {
        this.attachStream();
        this.startAnalysis();
    }

    componentDidUpdate(prevProps: Props) {
        const activeStream = this.props.processedCameraStream || this.props.cameraStream;
        const prevActive = prevProps.processedCameraStream || prevProps.cameraStream;
        if (prevActive !== activeStream) {
            this.attachStream();
        }
        if (prevProps.cameraStream !== this.props.cameraStream) {
            this.stopAnalysis(prevProps);
            this.startAnalysis();
        }
    }

    componentWillUnmount() {
        this.stopAnalysis(this.props);
    }

    setVideoRef = (node: HTMLVideoElement | null) => {
        this.videoRef = node;
    };

    attachStream() {
        if (this.videoRef) {
            const stream = this.props.processedCameraStream || this.props.cameraStream;
            if (stream) {
                this.videoRef.srcObject = stream;
            }
        }
    }

    startAnalysis() {
        const { blurProcessor, cameraStream } = this.props;
        if (!cameraStream) {
            return;
        }
        blurProcessor.onAnalysis = (results: any) => {
            const lighting = getLightingStatus(results.image);
            const headPosition = getHeadPosition(
                results.segmentationMask,
                results.image.width || results.image.videoWidth,
                results.image.height || results.image.videoHeight
            );
            this.setState({ lightingStatus: lighting, headPosition });
        };
        blurProcessor.startAnalysis(cameraStream);
    }

    stopAnalysis(props: Props) {
        const { blurProcessor } = props;
        blurProcessor.onAnalysis = null;
        blurProcessor.stopAnalysis();
    }

    render() {
        const { headPosition, lightingStatus } = this.state;
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
                </div>
                <div className={styles["recording-settings__controls"]}>
                    <div className={styles["head-positioning"]}>
                        <div className={styles["head-positioning__title"]}>Head positioning</div>
                        <div className={styles["head-positioning__icons"]}>
                            <UserIcon color={leftColor} />
                            <UserIcon color={centerColor} />
                            <UserIcon color={rightColor} />
                        </div>
                    </div>
                    <div className={styles["lighting"]}>
                        <div className={styles["lighting__title"]}>Lighting</div>
                        {lightingLabel ? (
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
