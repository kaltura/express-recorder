export type BlurLevel = "none" | "light" | "medium" | "heavy";

declare var SelfieSegmentation: any;

const MEDIAPIPE_SELFIE_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js";

const BLUR_PX: Record<Exclude<BlurLevel, "none">, number> = {
    light: 5,
    medium: 12,
    heavy: 24
};

// ─── Tunable parameters ───────────────────────────────────────────────────────
// Blur applied to the segmentation mask before compositing.
// Larger values = softer, more forgiving edges (recovers more hair/ear pixels).
// Smaller values = sharper cutout but more aliasing at boundaries.
// Recommended range: 3–10 (px at native camera resolution, ~720–1080p).
const MASK_FEATHER_PX = 3;

// MediaPipe model variant.
// 0 = general scene (faster, slightly less accurate at close range)
// 1 = landscape/selfie (slower, significantly more accurate for faces/hair)
const MODEL_SELECTION = 1;
// ─────────────────────────────────────────────────────────────────────────────

export class BackgroundBlurProcessor {
    private inputVideo: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    // Persistent off-screen canvases — allocated once, reused every frame
    private tempCanvas: HTMLCanvasElement; // intermediate: draws mask through a regular canvas so ctx.filter applies
    private maskCanvas: HTMLCanvasElement; // feathered + dilated mask
    private personCanvas: HTMLCanvasElement; // person cutout
    private segmentation: any = null;
    private animFrameId: number = 0;
    private outputStream: MediaStream | null = null;
    private currentLevel: Exclude<BlurLevel, "none"> = "light";
    private processing: boolean = false;

    onAnalysis: ((results: any) => void) | null = null;
    private backgroundImage: HTMLImageElement | null = null;

    constructor() {
        this.inputVideo = document.createElement("video");
        this.inputVideo.muted = true;
        this.inputVideo.setAttribute("autoplay", "true");
        this.inputVideo.setAttribute("playsinline", "true");
        this.canvas = document.createElement("canvas");
        this.tempCanvas = document.createElement("canvas");
        this.maskCanvas = document.createElement("canvas");
        this.personCanvas = document.createElement("canvas");
        this.loadModel();
    }

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

    startAnalysis(sourceStream: MediaStream): void {
        if (this.outputStream) {
            return;
        }
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

    setBackgroundImage(img: HTMLImageElement | null) {
        this.backgroundImage = img;
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
            this.segmentation.setOptions({ modelSelection: MODEL_SELECTION });
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
        if (this.outputStream) {
            const ctx = this.canvas.getContext("2d");
            if (ctx) {
                const w = this.canvas.width;
                const h = this.canvas.height;

                // Keep auxiliary canvases in sync with output size
                if (this.maskCanvas.width !== w || this.maskCanvas.height !== h) {
                    this.tempCanvas.width = this.maskCanvas.width = this.personCanvas.width = w;
                    this.tempCanvas.height = this.maskCanvas.height = this.personCanvas.height = h;
                }

                const tempCtx = this.tempCanvas.getContext("2d") as CanvasRenderingContext2D;
                const maskCtx = this.maskCanvas.getContext("2d") as CanvasRenderingContext2D;
                const personCtx = this.personCanvas.getContext("2d") as CanvasRenderingContext2D;

                // Step 1: Copy the WebGL-backed mask into a plain 2D canvas.
                // ctx.filter cannot be applied directly to a WebGL texture source —
                // it must go through a regular canvas first.
                tempCtx.clearRect(0, 0, w, h);
                tempCtx.drawImage(results.segmentationMask, 0, 0, w, h);

                // Step 2: Build a feathered + dilated mask.
                // (a) Blur spreads the white region outward, recovering edge pixels the
                //     model under-includes (hair, ears, shoulders).
                // (b) Drawing the original hard mask on top with "lighter" restores
                //     full opacity in the confident interior, avoiding a washed-out core.
                maskCtx.clearRect(0, 0, w, h);
                maskCtx.filter = `blur(${MASK_FEATHER_PX}px)`;
                maskCtx.drawImage(this.tempCanvas, 0, 0, w, h);
                maskCtx.filter = "none";
                maskCtx.globalCompositeOperation = "lighter";
                maskCtx.drawImage(this.tempCanvas, 0, 0, w, h);
                maskCtx.globalCompositeOperation = "source-over";

                // Step 3: Cut out person using feathered mask as alpha clip.
                personCtx.clearRect(0, 0, w, h);
                personCtx.drawImage(results.image, 0, 0, w, h);
                personCtx.globalCompositeOperation = "destination-in";
                personCtx.drawImage(this.maskCanvas, 0, 0, w, h);
                personCtx.globalCompositeOperation = "source-over";

                // Step 4: Draw background, then composite person on top.
                ctx.clearRect(0, 0, w, h);
                if (this.backgroundImage) {
                    ctx.drawImage(this.backgroundImage, 0, 0, w, h);
                } else {
                    ctx.filter = `blur(${BLUR_PX[this.currentLevel]}px)`;
                    ctx.drawImage(results.image, 0, 0, w, h);
                    ctx.filter = "none";
                }
                ctx.drawImage(this.personCanvas, 0, 0, w, h);
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
