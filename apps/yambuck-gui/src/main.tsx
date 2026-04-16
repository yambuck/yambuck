import { render } from "preact";
import App from "./App";
import { initDesignTokens } from "./theme/initTokens";

initDesignTokens();

render(<App />, document.getElementById("root")!);
