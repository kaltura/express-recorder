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
        const totalStr = this.bytesToSize(total);
        const loadedStr = loaded > total ? totalStr : this.bytesToSize(loaded);
        const percentage = (loaded * 100) / total;
        return (
            <div className={`xr_progress ${styles["progress"]}`} style={"margin-top: 0;"}>
                <div className={`xr_upload-status ${styles["upload-status"]}`}>
                    {loadedStr} / {totalStr}{" "}
                </div>
                <div className={`xr_bar ${styles["bar"]}`} style={`width: ${percentage}%;`} />
            </div>
        );
    }
}
