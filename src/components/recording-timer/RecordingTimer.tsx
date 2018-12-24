import {Component, h} from "preact";
import Timer = NodeJS.Timer;
const styles = require('./style.scss');

type Props = {
    onCountdownComplete: () => void;
}

type State = {
    currentTime:number; // in seconds
}


export class RecordingTimer extends Component<Props, State>{

    interval:Timer | undefined;


    constructor(props:Props) {
        super(props);
        this.state = { currentTime: 0 };
    }

    componentDidMount() {
        this.interval = setInterval(() => {
            this.update();
        }, 1000);
    }

    update() {
        this.setState({currentTime: this.state.currentTime++});
    }

    render(props:Props, state:State) {
        const {currentTime} = state;
        return (
            <div class={`timer ${styles['timer']}`}>
                <button type={"button"} class={`timer-button ${styles['timer-button']}`}>
                <i class={`icon-gear ${styles['icon-gear']}`} />
                    {currentTime}
                </button>
            </div>
        );
    }
}