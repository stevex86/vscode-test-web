/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as mime from "mime-types";
import JSZip from "jszip";
import { downloadVSCodeZip, readFileInRepo } from './download';
import { Workbench } from './workbench';
import Bun from "bun";

async function rewriteURL(elem: HTMLRewriterTypes.Element, property: string, serverBundle: JSZip) {
    const url = elem.getAttribute(property);
    if (url) {
        const src = new URL(url);
        if (src.protocol == "server:") {
            const file = serverBundle.file(src.pathname.slice(1))
            if (file) {
                elem.setAttribute(property,`data:${mime.lookup(file.name)};base64,${await file.async("base64")}`);
            } else {
                elem.remove()
            }
        }
    }
}

function rewriteHTML(html: string, serverBundle: JSZip) {
    const rewriter = new HTMLRewriter().on("*[src]", {
        async element(elem) {
            await rewriteURL(elem, "src", serverBundle);
        }
    }).on("*[href]", {
        async element(elem) {
            await rewriteURL(elem, "href", serverBundle);
        }
    });
    return rewriter.transform(html)
}
async function build() {
    const serverBundle = new JSZip();

    const vsCodeZip = await downloadVSCodeZip(path.resolve(process.cwd(), '.vscode-test-web'), "stable", undefined);

    const vsCodeZipFolder = serverBundle.folder("static/");
    if (vsCodeZipFolder) {
        console.log("Adding to bundle");
        await vsCodeZipFolder.loadAsync(vsCodeZip.zip, {
            createFolders: true,
        });
    }

    console.log("Creating workbench")
    const wb = new Workbench("server://vscode/static/vscode-web", false, false, [], [], {
        webEndpointUrlTemplate: `server://{{uuid}}.vscode/static/vscode-web`,
        webviewContentExternalBaseUrlTemplate: `server://{{uuid}}.vscode/static/vscode-web/out/vs/workbench/contrib/webview/browser/pre/`
    });
    console.log("Rendering pages")
    serverBundle.file("index.html", rewriteHTML(await wb.render({}), serverBundle));
    serverBundle.file("callback.html", rewriteHTML(await wb.renderCallback(), serverBundle));
    console.log("Packaging")
    const serverString = await serverBundle.generateAsync({
        type: "base64",
        compression: "DEFLATE",
        compressionOptions: {
            level: 9
        }
    })
    const navigate = await readFileInRepo("views/navigate.html");
    const values = {
        SERVER_BUNDLE: serverString
    }
    Bun.write(
        "./navigator.html",
        navigate.replace(/\{\{([^}]+)\}\}/g, (_, key) => values[key] ?? "undefined")
    )
}

build()