import { h, Component } from "preact";
import "./style.scss";
import { Test } from "../test/test";
import { Recorder } from "../Recorder/Recorder";

export default class App extends Component<any, any> {
    render(props: any) {
        return (
            <div>
                <h1 style={{ color: props.color }}>
                    <Test className={"customText"} text={"YESH!!"} />
                    <Recorder audio={true} video={true}/>
                </h1>
            </div>
        );
    }
}
