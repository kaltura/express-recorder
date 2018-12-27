let poly = require("preact-cli/lib/lib/webpack/polyfills");
import { h } from "preact";
import habitat from "preact-habitat";
import "./styles.scss";

import { ExpressRecorder } from "./components/app/ExpressRecorder";

let _habitat = habitat(ExpressRecorder);

_habitat.render({
    selector: '[data-widget-host="habitat"]',
    clean: true
});

/*type Config = {
    ks: string;
    serviceUrl: string;
    app: string;
};

export default {
    config: function(config: Config) {
        //LibConfig = config;
    },

    widgets: {
        expressRecorder: {
            new: function(config: Config) {
                return {
                    render() {
                        return (
                            <ExpressRecorder
                                ks={config.ks}
                                serviceUrl={config.serviceUrl}
                                app={config.app}
                            />
                        );
                    },

                    startRecord: () => {
                        return (
                            <ExpressRecorder
                                ks={config.ks}
                                serviceUrl={config.serviceUrl}
                                app={config.app}
                                doRecording={false}
                            />
                        );
                    }
                };
            }
        }
    }
};*/
