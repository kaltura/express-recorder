import { Component, h } from "preact";
const styles = require("./audioWave.scss");

type Props = {
    active: boolean
};

type State = {
};

// Show animation for audio meter
export class AudioWave extends Component<Props, State> {

    render() {
        const inactiveClass = this.props.active ? "" : styles["audio-wave-inactive"];
        return (
            <div className={styles["audio-wave-wrap"] + " " + inactiveClass}>
                <span className={styles["wave"]} />
                <span className={styles["wave"]} />
                <span className={styles["wave"]} />
                <span className={styles["wave"]} />
            </div>
        );
    }
}
