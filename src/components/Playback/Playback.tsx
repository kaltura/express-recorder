import { Component, h } from "preact";
const styles = require("./style.scss");
declare var KalturaPlayer: any;
import "./player.css";

type Props = {
    media?: PlaybackMedia; // the actual recorded media
    screenMedia?: PlaybackMedia; // the actual recorded media
    partnerId: number;
    uiconfId: number; // must be v3
    autoPlay?: boolean;
    pictureInPicture?: boolean;
};

type State = {};
let uniqueId: number = 0;

type PlaybackMedia = { blob: Blob; mimeType: string };

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
        const { media, screenMedia } = this.props;
        if (media && previousProps.media !== media) {
            // play the new media
            this.setMedia(media, this.kalturaPlayer);
        }
        if (screenMedia && previousProps.screenMedia !== screenMedia) {
            this.setMedia(screenMedia, this.kalturaPlayerScreen);
        }
    }

    setMedia(media: PlaybackMedia, kalturaPlayer: any) {
        const { autoPlay, pictureInPicture } = this.props;
        kalturaPlayer.setMedia({
            sources: {
                dvr: true,
                progressive: [
                    {
                        url: window.URL.createObjectURL(media.blob),
                        mimetype: media.mimeType
                    }
                ],
                type: kalturaPlayer.MediaType.VOD
            },
            plugins: {},
            playback: {
                autoplay: autoPlay,
                pictureInPicture: pictureInPicture
            }
        });
    }

    async embedPlayer() {
        const { partnerId, uiconfId, media, screenMedia } = this.props;
        try {
            if (media) {
                this.kalturaPlayer = KalturaPlayer.setup({
                    targetId: "player-wrap__" + uniqueId,
                    provider: {
                        partnerId: partnerId,
                        uiConfId: uiconfId
                    }
                });
                this.setMedia(media, this.kalturaPlayer);
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
                if (media) {
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
        const { screenMedia, media } = this.props;
        return (
            <div className={`players-wrap ${styles["players-wrap"]}`}>
                {media && (
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
                            media ? "player-wrap-screen__with-video" : ""
                        }`}
                    />
                ) : null}
            </div>
        );
    }
}
