import { Component, h } from "preact";
const styles = require("./style.scss");
declare var KalturaPlayer: any;
import "./player.css";

type Props = {
    media: { blob: Blob; mimeType: string }; // recorded media for video with or without audio
    screenMedia?: { blob: Blob; mimeType: string }; // recorded media for screen sharing
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
    kalturaVideoPlayer: any;
    kalturaScreenPlayer: any;

    componentDidMount(): void {
        this.embedPlayer();
        uniqueId++;
    }

    componentDidUpdate(previousProps: Props, previousState: State, previousContext: any): void {
        const { media, screenMedia } = this.props;
        if (previousProps.media !== media) {
            // play the new media
            this.setMedia(media, this.kalturaVideoPlayer);
        }
        if (screenMedia && previousProps.screenMedia !== screenMedia) {
            this.setMedia(screenMedia, this.kalturaScreenPlayer);
        }
    }

    setMedia(media: { blob: Blob; mimeType: string }, kalturaPlayer: any) {
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

    embedPlayer() {
        const { partnerId, uiconfId, media, screenMedia } = this.props;
        try {
            this.kalturaVideoPlayer = KalturaPlayer.setup({
                targetId: "player-wrap_" + uniqueId,
                provider: {
                    partnerId: partnerId,
                    uiConfId: uiconfId
                }
            });
            if (screenMedia) {
                this.kalturaScreenPlayer = KalturaPlayer.setup({
                    targetId: "player-wrap_screen" + uniqueId,
                    provider: {
                        partnerId: partnerId,
                        uiConfId: uiconfId
                    }
                });
                this.setMedia(screenMedia, this.kalturaScreenPlayer);

                this.kalturaVideoPlayer.addEventListener("play", () =>
                    this.kalturaScreenPlayer.play()
                );
                this.kalturaVideoPlayer.addEventListener("pause", () =>
                    this.kalturaScreenPlayer.pause()
                );
                KalturaPlayer.getPlayers()["player-wrap_0"].addEventListener("seeking", () => {
                    this.kalturaScreenPlayer.currentTime = this.kalturaVideoPlayer.currentTime;
                });
            }
            this.setMedia(media, this.kalturaVideoPlayer);
        } catch (e) {
            console.error(e.message);
        }
    }

    render() {
        const { screenMedia } = this.props;

        return (
            <div className={`players-wrap ${styles["players-wrap"]}`}>
                <div
                    id={"player-wrap_" + uniqueId}
                    className={`xr_player-wrap ${styles["player-wrap"]} ${
                        screenMedia ? "player-wrap__main_controls" : ""
                    }`}
                />
                {screenMedia && (
                    <div
                        id={"player-wrap_screen" + uniqueId}
                        className={`xr_player-wrap player-wrap-screen ${styles["player-wrap"]}`}
                    />
                )}
            </div>
        );
    }
}
