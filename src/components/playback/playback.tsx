import { Component, h } from "preact";
const styles = require("./style.scss");
declare var KalturaPlayer: any;

type Props = {
    media: { blob: Blob; mimeType: string };
    partnerId: number;
    uiconfId: number;
};

type State = {};
let uniqueId: number = 0;

export class Playback extends Component<Props, State> {
    kalturaPlayer: any;

    componentDidMount(): void {
        this.embedPlayer();
        uniqueId++;
    }

    componentDidUpdate(
        previousProps: Props,
        previousState: State,
        previousContext: any
    ): void {
        const { media } = this.props;
        if (previousProps.media !== media) {
            // play the new media
            this.setMedia(media);
        }
    }

    setMedia(media: { blob: Blob; mimeType: string }) {
        this.kalturaPlayer.setMedia({
            sources: {
                progressive: [
                    {
                        url: window.URL.createObjectURL(media.blob),
                        mimetype: media.mimeType
                    }
                ]
            },
            plugins: {}
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
                class={`player-wrap ${styles["player-wrap"]}`}
            />
        );
    }
}
