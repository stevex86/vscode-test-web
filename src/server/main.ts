/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import createApp from './app';

export interface IConfig {
	readonly extensionPaths: string[] | undefined;
	readonly extensionIds: GalleryExtensionInfo[] | undefined;
	readonly extensionDevelopmentPath: string | undefined;
	readonly extensionTestsPath: string | undefined;
	readonly build: Sources | StaticLocation | CDN;
	readonly folderUri: string | undefined;
	readonly folderMountPath: string | undefined;
	readonly printServerLog: boolean;
	readonly coi: boolean;
	readonly esm: boolean;
}

export interface GalleryExtensionInfo {
	readonly id: string;
	readonly preRelease?: boolean;
}

export interface Sources {
	readonly type: 'sources';
	readonly location: string;
}

interface StaticBase {
	readonly type: 'static';
	readonly quality: 'stable' | 'insider';
	readonly version: string;
}
export interface StaticLocation extends StaticBase {
	readonly location: string;
}
export interface StaticZip extends StaticBase {
	readonly zip: Buffer;
}
export type Static = StaticLocation | StaticZip;

export interface CDN {
	readonly type: 'cdn';
	readonly uri: string;
}

export interface IServer {
	close(): void;
}

export async function runServer(host: string, port: number | undefined, config: IConfig): Promise<IServer> {
	const app = await createApp(config);
	try {
		const server = app.listen(port, host);
		console.log(`Listening on http://${host}:${port}`);
		return server;
	} catch (e) {
		console.error(`Failed to listen to port ${port} on host ${host}`, e);
		throw e;
	}
}
