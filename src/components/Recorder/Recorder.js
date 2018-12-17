var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { h, Component } from "preact";
var Recorder = /** @class */ (function (_super) {
    __extends(Recorder, _super);
    function Recorder(props) {
        var _this = _super.call(this, props) || this;
        _this.componentDidMount = function () {
            _this.getMediaStream();
            //this.videoRef = document.getElementById("video");
        };
        _this.toggleRecording = function () {
            var isRecording = _this.state.isRecording;
            if (!isRecording) {
                _this.startRecording();
            }
            else {
                _this.stopRecording();
            }
            _this.setState(function (prev) {
                return { isRecording: !prev.isRecording };
            });
        };
        _this.getMediaStream = function () { return __awaiter(_this, void 0, void 0, function () {
            var constraints, stream;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        constraints = {
                            audio: this.props.audio,
                            video: this.props.video
                        };
                        return [4 /*yield*/, navigator.mediaDevices
                                .getUserMedia(constraints)
                                .then(this.handleSuccess)
                                .catch(this.handleError)];
                    case 1:
                        stream = _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        _this.handleSuccess = function (stream) {
            console.log("getUserMedia() got stream: ", stream);
            _this.stream = stream;
            // if (window.URL) {
            //   this.videoRef!.src = window.URL.createObjectURL(stream);
            // } else {
            //const aaa: any = stream;
            _this.videoRef.srcObject = stream;
            // }
        };
        _this.handleError = function (error) {
            console.log("handleError : " + error);
        };
        _this.startRecording = function () {
            var options = { mimeType: "video/webm;codecs=vp9" };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.log(options.mimeType + " is not Supported");
                options = { mimeType: "video/webm;codecs=vp8" };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.log(options.mimeType + " is not Supported");
                    options = { mimeType: "video/webm" };
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        console.log(options.mimeType + " is not Supported");
                        options = { mimeType: "" };
                    }
                }
            }
            try {
                _this.mediaRecorder = new MediaRecorder(_this.stream, options);
            }
            catch (e) {
                console.error("Exception while creating MediaRecorder: " + e);
                alert("Exception while creating MediaRecorder: " + e);
                return;
            }
            console.log("Created MediaRecorder", _this.mediaRecorder, "with options", options);
            _this.mediaRecorder.ondataavailable = _this.handleDataAvailable;
            _this.mediaRecorder.start(10); // collect 10ms of data
            console.log("MediaRecorder started", _this.mediaRecorder);
        };
        _this.stopRecording = function () {
            _this.mediaRecorder.stop();
            console.log("Recorded Blobs: ", _this.recordedBlobs);
        };
        _this.handleDataAvailable = function (event) {
            if (event.data && event.data.size > 0) {
                _this.recordedBlobs.push(event.data);
            }
        };
        _this.state = {
            isRecording: false
        };
        _this.mediaRecorder = null;
        _this.stream = null;
        _this.recordedBlobs = [];
        _this.videoRef = null;
        return _this;
    }
    Recorder.prototype.render = function (props) {
        var _this = this;
        return (h("div", null,
            h("h1", null, "Recorded Stream"),
            h("video", { id: "recorded", muted: true, ref: function (node) { return (_this.videoRef = node); } }),
            h("div", null,
                h("button", { id: "record", onClick: this.toggleRecording },
                    this.state.isRecording && h("span", null, "Stop Recording"),
                    !this.state.isRecording && (h("span", null, "Start Recording"))))));
    };
    Recorder.defaultProps = {
        video: true,
        audio: true
    };
    return Recorder;
}(Component));
export { Recorder };
