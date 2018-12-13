import {Component, h} from "preact";
//import * as style from  "./style.scss";

const style: any = {};
type Props = {
    text: string;
    className: string;
}

type State = {

}


export class Test extends Component<Props, State>{

    render(props:Props) {
        const { text, className: classNameProp } = props;

        return <div className={style[classNameProp]}>{text}</div>
    }
}