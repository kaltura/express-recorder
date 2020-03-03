import { h, render } from "preact";
//import render from "preact-render-to-string";
import { CountdownTimer } from "./CountdownTimer";

describe("Hello logic", () => {
    it("should be able to run tests", () => {
        expect(1 + 2).toEqual(3);
    });
});

describe("Hello Snapshot", () => {
    it("should render header with content", () => {
        //const tree = render(<CountdownTimer initialValue={0} onCountdownComplete={() => {}}/>);
        //expect(tree).toMatchSnapshot();
    });
});

console.log("I (test) render");
