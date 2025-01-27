import { Component, h } from "preact";
const styles = require("./style.scss");
declare var KalturaPlayer: any;
import "./player.css";

type Props = {
    cameraMedia?: Blob; // recording from camera
    screenMedia?: Blob; // recording from screen
    partnerId: number;
    uiconfId: number; // must be v3
    autoPlay?: boolean;
    pictureInPicture?: boolean;
};

type State = {};
let uniqueId: number = 0;

/**
 * Component to play the recorded media, uses v3 player.
 */
export class Playback extends Component<Props, State> {
    static defaultProps = {
        autoplay: false,
        pictureInPicture: false
    };
    kalturaPlayer: any;
    kalturaPlayerScreen: any;

    componentDidMount(): void {
        this.embedPlayer();
        uniqueId++;
    }

    componentDidUpdate(previousProps: Props, previousState: State, previousContext: any): void {
        const { cameraMedia, screenMedia } = this.props;
        if (cameraMedia && previousProps.cameraMedia !== cameraMedia && this.kalturaPlayer) {
            // play the new media
            this.setMedia(cameraMedia, this.kalturaPlayer, !!screenMedia);
        }
        if (screenMedia && previousProps.screenMedia !== screenMedia && this.kalturaPlayerScreen) {
            this.setMedia(screenMedia, this.kalturaPlayerScreen);
        }
    }

    setMedia(media: Blob, kalturaPlayer: any, muted = false) {
        const { autoPlay, pictureInPicture } = this.props;
        kalturaPlayer.setMedia({
            sources: {
                dvr: true,
                progressive: [
                    {
                        url: window.URL.createObjectURL(media),
                        mimetype: "video/webm"
                    }
                ],
                type: kalturaPlayer.MediaType.VOD
            },
            plugins: {},
            playback: {
                autoplay: autoPlay,
                pictureInPicture: pictureInPicture,
                muted: muted
            }
        });
    }

    async embedPlayer() {
        const { partnerId, uiconfId, cameraMedia, screenMedia } = this.props;
        try {
            if (cameraMedia) {
                this.kalturaPlayer = KalturaPlayer.setup({
                    targetId: "player-wrap__" + uniqueId,
                    provider: {
                        partnerId: partnerId,
                        uiConfId: uiconfId
                    }
                });
                this.setMedia(cameraMedia, this.kalturaPlayer, !!screenMedia);
            }
            if (screenMedia) {
                this.kalturaPlayerScreen = KalturaPlayer.setup({
                    targetId: "player-wrap-screen__" + uniqueId,
                    provider: {
                        partnerId: partnerId,
                        uiConfId: uiconfId
                    }
                });
                this.setMedia(screenMedia, this.kalturaPlayerScreen);
                if (cameraMedia) {
                    this.kalturaPlayer.addEventListener("play", () =>
                        this.kalturaPlayerScreen.play()
                    );
                    this.kalturaPlayer.addEventListener("pause", () =>
                        this.kalturaPlayerScreen.pause()
                    );

                    KalturaPlayer.getPlayers()["player-wrap__" + uniqueId].addEventListener(
                        "seeking",
                        () => {
                            this.kalturaPlayerScreen.currentTime = this.kalturaPlayer.currentTime;
                        }
                    );
                }
            }
        } catch (e) {
            console.error(e.message);
        }
    }

    render() {
        const { screenMedia, cameraMedia } = this.props;
        return (
            <div className={`players-wrap ${styles["players-wrap"]}`}>
                {cameraMedia && (
                    <div
                        id={"player-wrap__" + uniqueId}
                        className={`xr_player-wrap ${styles["player-wrap"]} ${
                            screenMedia ? "player-wrap__main_controls" : ""
                        }`}
                    />
                )}
                {screenMedia ? (
                    <div
                        id={"player-wrap-screen__" + uniqueId}
                        className={`xr_player-wrap player-wrap-screen ${styles["player-wrap"]} ${
                            cameraMedia ? "player-wrap-screen__with-video" : ""
                        }`}
                    />
                ) : null}
            </div>
        );
    }
}
