import { Component, h } from "preact";

type Props = {
    stream: MediaStream
};

type State = {
};

/**
 * Component to show countdown from X to 0. uses for delay between clicking on start recording to the actual recording
 */
export class AudioIndicator extends Component<Props, State> {

    audioContext: AudioContext;
    instant: number;
    slow: number;
    clip: number;
    script: ScriptProcessorNode ;

    constructor(props: Props) {
        super(props);

        this.audioContext = new AudioContext();
        this.instant = 0.0;
        this.slow = 0.0;
        this.clip = 0.0;
        this.script = this.audioContext.createScriptProcessor(2048, 1, 1);
    }

    componentDidMount() {
        this.script.onaudioprocess = (event) => {
            const input = event.inputBuffer.getChannelData(0);
            let i;
            let sum = 0.0;
            let clipcount = 0;
            for (i = 0; i < input.length; ++i) {
                sum += input[i] * input[i];
                if (Math.abs(input[i]) > 0.99) {
                    clipcount += 1;
                }
            }
            this.instant = Math.sqrt(sum / input.length);
            this.slow = 0.95 * this.slow + 0.05 * this.instant;
            this.clip = clipcount / input.length;
            //console.log("instant: " + this.instant);
            //console.log("slow: " + this.slow);
            //console.log("clip: " + this.clip);
        };

        this.connectToSource(this.props.stream);
    }

    connectToSource = (stream: MediaStream) => {
        console.log('SoundMeter connecting');

        try {
            let mic = this.audioContext.createMediaStreamSource(stream);
            mic.connect(this.script);
            this.script.connect(this.audioContext.destination);

        } catch (e) {
            console.error(e);

        }
    };

    render() {

        return (
            <div>
            </div>
        );
    }
}
