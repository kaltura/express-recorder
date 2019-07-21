declare var MediaRecorder: any;
declare var KalturaPlayer: any;
declare var MediaStreamTrack: any;

declare module "*.scss" {
    const content: { [className: string]: string };
    export = content;
}

declare module "*.svg" {
    const content: any;
    export default content;
}
