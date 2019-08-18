import { Component, h } from "preact";
const styles = require("./style.scss");
declare var KalturaPlayer: any;

type Props = {
    media: { blob: Blob; mimeType: string }; // the actual recorded media
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

    componentDidMount(): void {
        this.embedPlayer();
        uniqueId++;
    }

    componentDidUpdate(previousProps: Props, previousState: State, previousContext: any): void {
        const { media } = this.props;
        if (previousProps.media !== media) {
            // play the new media
            this.setMedia(media);
        }
    }

    setMedia(media: { blob: Blob; mimeType: string }) {
        const { autoPlay, pictureInPicture } = this.props;
        this.kalturaPlayer.setMedia({
            sources: {
                dvr: true,
                progressive: [
                    {
                        url: window.URL.createObjectURL(media.blob),
                        mimetype: media.mimeType
                    }
                ],
                type: this.kalturaPlayer.MediaType.VOD
            },
            plugins: {},
            playback: {
                autoplay: autoPlay,
                pictureInPicture: pictureInPicture
            }
        });
    }

    embedPlayer() {
        const { media, partnerId, uiconfId } = this.props;
        try {
            this.kalturaPlayer = KalturaPlayer.setup({
                targetId: "player-wrap_" + uniqueId,
                provider: {
                    partnerId: partnerId,
                    uiConfId: uiconfId
                }
            });
            this.setMedia(media);
        } catch (e) {
            console.error(e.message);
        }
    }

    render() {
        return (
            <div
                id={"player-wrap_" + uniqueId}
                className={`xr_player-wrap ${styles["player-wrap"]}`}
            />
        );
    }
}
