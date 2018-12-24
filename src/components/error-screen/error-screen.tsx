import {Component, h} from "preact";
const styles = require('./style.scss');

type Props = {
    title?: string;
    text: string;
}

export function ErrorScreen(props: Props) {
    const {title, text} = props;
    return (
        <div class={`error-screen ${styles['error-screen-wrap']}`}>
            <div className={`${styles['error-screen']}`}>
                {title && <h1 class={`error-screen__title ${styles['error-screen__title']}`}>
                    {title}
                </h1>}
                <p class={`error-screen__text ${styles['error-screen__text']}`}
                   dangerouslySetInnerHTML={{__html: text}}>
                </p>
            </div>
        </div>
    );

}
