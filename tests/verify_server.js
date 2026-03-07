import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "../build/index.js");

console.log(`Starting server at ${serverPath}...`);

const child = spawn("node", [serverPath]);

let output = "";
child.stderr.on("data", (data) => {
    console.error(`Server Error: ${data}`);
});

child.stdout.on("data", (data) => {
    output += data.toString();
    try {
        const response = JSON.parse(output);
        console.log("Received Response:", JSON.stringify(response, null, 2));
        if (response.result && response.result.tools) {
            console.log("Verification Successful: Tools found.");
            process.exit(0);
        }
    } catch (e) {
        // Partial JSON, wait for more data
    }
});

// Send ListTools request
const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
};

console.log("Sending ListTools request...");
child.stdin.write(JSON.stringify(request) + "\n");

setTimeout(() => {
    console.error("Verification timeout.");
    child.kill();
    process.exit(1);
}, 5000);
