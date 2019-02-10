import { Component, h } from "preact";
import { AudioWave } from "./audioWave";

type Props = {
    stream: MediaStream;
    audioOn?: boolean;
};

type State = {
    foundAudioSignal: boolean;
};

/**
 * Process audio level from stream
 */
export class AudioIndicator extends Component<Props, State> {
    static defaultProps = {
        audioOn: true
    };

    audioContext: AudioContext;
    intervalId: number;

    constructor(props: Props) {
        super(props);

        this.state = {
            foundAudioSignal: false
        };

        this.audioContext = new AudioContext();
        this.intervalId = 0;
    }

    componentDidMount() {
        if (!this.props.audioOn) {
            return;
        }

        // create audio analyser
        let analyser = this.audioContext.createAnalyser();

        // get audio source from stream
        let source = this.audioContext.createMediaStreamSource(
            this.props.stream
        );

        // connect analyser with source
        source.connect(analyser);

        // define sample window for fft. Should be power of 2 between 32 - 2048.
        // Bigger number gives more detailed data, but we only need to know if
        // there is a sound or not.
        analyser.fftSize = 32;

        let bufferLength = analyser.frequencyBinCount;
        let dataArray = new Uint8Array(bufferLength);

        // set interval to sample audio sound
        const int: any = setInterval(() => {
            // fill dataArray with frequency data
            analyser.getByteFrequencyData(dataArray);

            // check if found sound - array of zeros means no sound
            const result = dataArray.filter((num: number) => {
                return num > 0;
            });

            if (result.length === 0 && this.state.foundAudioSignal) {
                // no sound found
                this.setState({ foundAudioSignal: false });
            } else if (result.length > 0 && !this.state.foundAudioSignal) {
                // found sound
                this.setState({ foundAudioSignal: true });
            }
        }, 100);

        this.intervalId = int as number;
    }

    componentWillUnmount() {
        clearInterval(this.intervalId);
    }

    render() {
        const { foundAudioSignal } = this.state;
        return <AudioWave active={foundAudioSignal} />;
    }
}
