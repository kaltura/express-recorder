import { Component, h } from "preact";
const styles = require("./style.scss");
declare var KalturaPlayer: any;

type Props = {
    media: { blob: Blob; mimeType: string };
    partnerId: number;
    uiconfId: number;
};

type State = {};

export class Playback extends Component<Props, State> {
    kalturaPlayer: any;

    componentDidMount(): void {
        this.embedPlayer();
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
                        url: window.URL.createObjectURL(
                            media.blob
                        ),
                        mimetype:
                            media.mimeType
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
                targetId: "player-wrap",
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

    render(props: Props) {
        return (
            <div
                id={"player-wrap"}
                class={`player-wrap ${styles["player-wrap"]}`}
            />
        );
    }
}
