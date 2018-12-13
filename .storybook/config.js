import { configure, addDecorator } from '@storybook/react';

// function loadStories() {
//     require('../stories/index.js');
//     // You can require as many stories as you need.
// }


// automatically import all files ending in *.stories.js
const req = require.context("../src", true, /.stories.js$/);
function loadStories() {
    req.keys().forEach(filename => req(filename));
}

addDecorator(story => (
    <div
        style={{
            marginLeft: "50px",
            marginRight: "50px",
            marginTop: "50px"
        }}
        >
        {story()}
    </div>
));

configure(loadStories, module);
