import { Component, h } from "preact";
const styles = require("./style.scss");
import { Translator } from "../Translator/Translator";

type Props = {
    title?: string;
    text: string;
    onReset: () => void;
};

export function ErrorScreen(props: Props) {
    const { title, text, onReset } = props;
    const translator = Translator.getTranslator();
    return (
        <div className={`xr_error-screen ${styles["error-screen-wrap"]}`}>
            <div className={`${styles["error-screen"]}`}>
                {title && (
                    <h1 className={`xr_error-screen__title ${styles["error-screen__title"]}`}>
                        {title}
                    </h1>
                )}
                <p
                    className={`xr_error-screen__text ${styles["error-screen__text"]}`}
                    dangerouslySetInnerHTML={{ __html: text }}
                />
                <button
                    className={`xr_error-screen__reset-button ${styles["error-screen__reset-button"]}`}
                    onClick={onReset}
                >
                    {translator.translate("Reset App")}
                </button>
            </div>
        </div>
    );
}
