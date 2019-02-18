import { h } from "preact";
import { storiesOf } from "@storybook/react";
import { ExpressRecorder } from "./expressRecorder";

storiesOf("Main App", module).add("widget default", () => {
    return (
        <div>
            <ExpressRecorder
               ks={"djJ8MjQ4Mzg0MXwFX0AgrmUwhGdtU7R9u2xnSaKZNf3drr6sOfsYBR_x4y1gCSF7-MZnUmPE0m_rGxe_321u9LNVLFX5OMqOhvdWcGm53V80wT0KDONPaXxl5w=="}
				app={"local"}
                serviceUrl={"https://www.kaltura.com"}
				partnerId={2483841}
				uiConfId={43735261}
				playerUrl={"https://www.kaltura.com"}
            />
        </div>
    );
});

