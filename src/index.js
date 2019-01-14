let poly = require("preact-cli/lib/lib/webpack/polyfills");
import { h, render } from "preact";
import habitat from "preact-habitat";

import { ExpressRecorder } from "./components/app/ExpressRecorder";

let _habitat = habitat(ExpressRecorder);

_habitat.render({
    inline: true,
    clean: true
});

export { ExpressRecorder, render, h };

