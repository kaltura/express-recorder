export type BlurLevel = "none" | "light" | "medium" | "heavy";

declare var SelfieSegmentation: any;

const MEDIAPIPE_SELFIE_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js";

const BLUR_PX: Record<Exclude<BlurLevel, "none">, number> = {
    light: 5,
    medium: 12,
    heavy: 24
};

export class BackgroundBlurProcessor {
    private inputVideo: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    private segmentation: any = null;
    private animFrameId: number = 0;
    private outputStream: MediaStream | null = null;
    private currentLevel: Exclude<BlurLevel, "none"> = "light";
    private processing: boolean = false;

    // Set this to receive segmentation results for analysis (head position, lighting)
    onAnalysis: ((results: any) => void) | null = null;

    constructor() {
        this.inputVideo = document.createElement("video");
        this.inputVideo.muted = true;
        this.inputVideo.setAttribute("autoplay", "true");
        this.inputVideo.setAttribute("playsinline", "true");
        this.canvas = document.createElement("canvas");
        this.loadModel();
    }

    // Start blur output stream
    start(sourceStream: MediaStream, level: Exclude<BlurLevel, "none">): MediaStream {
        if (this.outputStream && this.inputVideo.srcObject === sourceStream) {
            this.currentLevel = level;
            return this.outputStream;
        }

        this.stopLoop();
        this.currentLevel = level;
        this.inputVideo.srcObject = sourceStream;
        this.inputVideo.play().catch(_e => {
            return;
        });

        const canvasStream = (this.canvas as any).captureStream(30);
        const audioTracks = sourceStream.getAudioTracks();
        this.outputStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

        this.loop();
        return this.outputStream;
    }

    // Start segmentation loop for analysis only (no blur output)
    startAnalysis(sourceStream: MediaStream): void {
        // Already running with blur — loop is active, onAnalysis will fire
        if (this.outputStream) {
            return;
        }
        // Already running analysis on this stream
        if (this.animFrameId && this.inputVideo.srcObject === sourceStream) {
            return;
        }
        this.stopLoop();
        this.inputVideo.srcObject = sourceStream;
        this.inputVideo.play().catch(_e => {
            return;
        });
        this.loop();
    }

    // Stop analysis-only loop (no-op if blur is also running)
    stopAnalysis(): void {
        if (this.outputStream) {
            return;
        }
        this.stopLoop();
        this.inputVideo.srcObject = null;
    }

    updateLevel(level: Exclude<BlurLevel, "none">) {
        this.currentLevel = level;
    }

    stop() {
        this.stopLoop();
        this.inputVideo.srcObject = null;
        if (this.outputStream) {
            this.outputStream.getVideoTracks().forEach(t => t.stop());
            this.outputStream = null;
        }
    }

    private loadModel() {
        const init = () => {
            this.segmentation = new SelfieSegmentation({
                locateFile: (file: string) =>
                    `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${file}`
            });
            this.segmentation.setOptions({ modelSelection: 1 });
            this.segmentation.onResults(this.onResults);
        };

        if (typeof SelfieSegmentation !== "undefined") {
            init();
            return;
        }

        const script = document.createElement("script");
        script.src = MEDIAPIPE_SELFIE_URL;
        script.onload = init;
        document.head.appendChild(script);
    }

    private onResults = (results: any) => {
        // Apply blur if output stream is active
        if (this.outputStream) {
            const ctx = this.canvas.getContext("2d");
            if (ctx) {
                const w = this.canvas.width;
                const h = this.canvas.height;

                ctx.clearRect(0, 0, w, h);
                ctx.globalCompositeOperation = "copy";
                ctx.drawImage(results.segmentationMask, 0, 0, w, h);
                ctx.globalCompositeOperation = "source-in";
                ctx.drawImage(results.image, 0, 0, w, h);
                ctx.globalCompositeOperation = "destination-over";
                ctx.filter = `blur(${BLUR_PX[this.currentLevel]}px)`;
                ctx.drawImage(results.image, 0, 0, w, h);
                ctx.filter = "none";
                ctx.globalCompositeOperation = "source-over";
            }
        }

        if (this.onAnalysis) {
            this.onAnalysis(results);
        }

        this.processing = false;
    };

    private loop = () => {
        this.animFrameId = requestAnimationFrame(this.loop);
        const video = this.inputVideo;
        if (!video.videoWidth || this.processing) {
            return;
        }

        if (this.canvas.width !== video.videoWidth) {
            this.canvas.width = video.videoWidth;
            this.canvas.height = video.videoHeight;
        }

        if (!this.segmentation) {
            // Model not ready — draw raw frame (only matters when outputStream is active)
            if (this.outputStream) {
                const ctx = this.canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
                }
            }
            return;
        }

        this.processing = true;
        this.segmentation.send({ image: video }).catch(() => {
            this.processing = false;
        });
    };

    private stopLoop() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = 0;
        }
        this.processing = false;
    }
}
