import { Component, h } from "preact";
const styles = require("./style.scss");

type Props = {
    percentage: number;
};

type State = {};

/**
 * Handle the progress bar while uploading
 */
export class ProgressBar extends Component<Props, State> {

    constructor(props: Props) {
        super(props);

        this.state = {
            percentage: 50
        };
    }

    render() {
        const percentage = this.props.percentage;
        return (
            <div
                className={`progress ${styles["progress"]}`}
                style="width: 100%;"
            >
                <div
                    className={`bar ${styles["bar"]}`}
                    style={`width: ${percentage}%;`}
                />
            </div>
        );
    }
}