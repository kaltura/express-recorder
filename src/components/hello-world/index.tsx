import { h, Component } from "preact";
import "./style.scss";
import { Test } from "../test/test";

export default class App extends Component<any, any> {
    render(props: any) {
        return (
            <div>
                <h1 style={{ color: props.color }}>
                    <Test className={"customText"} text={"YESH!!"} />
                </h1>
            </div>
        );
    }
}
