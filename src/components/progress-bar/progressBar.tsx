import { Component, h } from "preact";
const styles = require("./style.scss");

type Props = {
    loaded: number; // loaded bytes
    total: number; // total size in bytes
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

    bytesToSize = (bytes: number) => {
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        if (bytes === 0) {
            return "0 Bytes";
        }
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        if (i === 0) {
            return bytes + " " + sizes[i];
        }
        return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
    };

    render() {
        const { loaded, total } = this.props;
        const loadedStr = this.bytesToSize(loaded);
        const totalStr = this.bytesToSize(total);
        const percentage = (loaded * 100) / total;
        return (
            <div
                className={`progress ${styles["progress"]}`}
            >
                <div
                    className={`bar ${styles["bar"]}`}
                    style={`width: ${percentage}%;`}
                >
                    <span className={`status ${styles['status']}`}>{loadedStr} / {totalStr} </span>
                </div>
            </div>
        );
    }
}
