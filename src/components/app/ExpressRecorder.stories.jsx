import { h } from "preact";
import { storiesOf } from "@storybook/react";
import { ExpressRecorder } from "./ExpressRecorder";

storiesOf("Main App", module).add("widget default", () => {
    return (
        <div>
            <ExpressRecorder
                ks={
                    "djJ8MjMyNjgyMXwOp0MjNVPV81WTsVIZx6E0Ni1gunBPTqFviwysIuW3CS6GsyBfh7sgFktui6ZTmH3SRMo65gAnwgJj_Elyo7vgtqulaMoH7-s8FQ4nq_SirNNGxCPqad69Hv71aFP1zrXw1xeL4y0Wo_DMEGbdqSnfm_rHKNZJvOHwYeRcR2CvKA=="
                }
                app={"kms_client"}
                serviceUrl={"https://www.kaltura.com"}
            />
        </div>
    );
});
