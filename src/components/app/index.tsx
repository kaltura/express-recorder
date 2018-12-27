import { h, Component } from "preact";
import "./style.scss";
import { ExpressRecorder } from "../express-recorder/express-recorder";

export default class App extends Component<any, any> {
    render(props: any) {
        return (
            <div>
                <ExpressRecorder
                    ks={
                        "djJ8MjMyNjgyMXxlil9gXjxBNrnq9dmUb3HIOtZPKK35v7Bkt85y_KWwEZfwgykcztusimi77t1T_g-CK-54KjQmihum2BVnLIn-dy3LAgbavKoCFDdSv4pNLOfusEiXtjwv1AZix283cpbCdBkXDT2xQVsuj6863__lKp3b_sbvANkdFfGGr5r9uA=="
                    }
                    serviceUrl={"https://www.kaltura.com"}
                    app={"kms_client"}
                />
            </div>
        );
    }
}
