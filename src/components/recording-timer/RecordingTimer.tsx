import {Component, h} from "preact";
const styles = require('./style.scss');

type Props = {
    onButtonClick: () => void;
}

type State = {
    currentTime:number; // in seconds
    clickedOnce:boolean;
}


export class RecordingTimer extends Component<Props, State>{

    interval:number | undefined;


    constructor(props:Props) {
        super(props);
        this.state = { currentTime: 0 , clickedOnce: false};
        this.clickHandler = this.clickHandler.bind(this);
    }

    componentDidMount() {
        const int:any = setInterval(() => {
            this.update();
        }, 1000);
        this.interval = int as number;
    }

    update() {
        this.setState({currentTime: this.state.currentTime + 1});
    }

    clickHandler() {
        if (this.state.clickedOnce) {
            return;
        }

        clearInterval(this.interval);
        this.setState({clickedOnce: true}, () => {
            if (this.props.onButtonClick) {
                this.props.onButtonClick();
            }
        })
    }

    render(props:Props, state:State) {
        const {currentTime} = state;
        return (
            <div class={`timer ${styles['timer']}`}>
                <button type={"button"} class={`timer-button ${styles['timer-button']}`} onClick={this.clickHandler}>
                <i class={`icon-stop ${styles['icon-stop']}`} />
                    {currentTime}
                </button>
            </div>
        );
    }
}