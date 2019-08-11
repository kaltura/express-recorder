import { Component, h } from "preact";
import { ProgressBar } from "../progress-bar/progressBar";
const styles = require("./style.scss");

type Props = {
    loaded: number;
    total: number;
    abort: boolean;
    onCancel: () => void;
};

/**
 * ui for upload phase
 */
export class UploadUI extends Component<Props> {
    render() {
        const { loaded, total, abort, onCancel } = this.props;
        const disableCancel = abort || loaded >= total;

        return (
            <div className={`uploader ${styles["uploader"]}`}>
                <div className={`cancel-wrap ${styles["cancel-wrap"]}`}>
                    {loaded < total && (
                        <button
                            className={`btn btn-cancel ${styles["btn"]} ${styles["btn-cancel"]}
                            ${
                                disableCancel
                                    ? `${styles["btn-cancel--disabled"]} btn-cancel--disabled`
                                    : ""
                            }`}
                            onClick={disableCancel ? undefined : onCancel}
                            disabled={disableCancel}
                        >
                            Cancel
                        </button>
                    )}
                </div>
                <div className={`progress-bar-wrap ${styles["progress-bar-wrap"]}`}>
                    {loaded < total && (
                        <div className={`progress-bar ${styles["progress-bar"]}`}>
                            <ProgressBar loaded={loaded} total={total} />{" "}
                        </div>
                    )}
                </div>
                {loaded >= total && total > 0 && (
                    <div className={`upload-success-message ${styles["upload-success-message"]}`}>
                        <strong>Upload Completed!</strong>
                    </div>
                )}
            </div>
        );
    }
}
