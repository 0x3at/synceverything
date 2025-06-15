export interface IGist {
	url: string;
	forksUrl: string;
	commitsUrl: string;
	id: string;
	nodeId: string;
	gitPullUrl: string;
	gitPushUrl: string;
	htmlUrl: string;
	files: IProfiles;
	public: boolean;
	createdAt: string;
	updatedAt: string;
	description?: string;
	comments: number;
	user?: IOwner;
	commentsEnabled: boolean;
	commentsUrl: string;
	owner: IOwner;
	truncated: boolean;
}

export interface IOwner {
	login: string;
	id: number;
	nodeId: string;
	avatarUrl: string;
	gravatarId: string;
	url: string;
	htmlUrl: string;
	followersUrl: string;
	followingUrl: string;
	gistsUrl: string;
	starredUrl: string;
	subscriptionsUrl: string;
	organizationsUrl: string;
	reposUrl: string;
	eventsUrl: string;
	receivedEventsUrl: string;
	type: string;
	userViewType: string;
	siteAdmin: boolean;
}

export interface IFiles {
	filename: string;
	type: string;
	language: string;
	raw_url: string;
	size: number;
	truncated: boolean;
	content: string;
	encoding?: string;
}

export interface IProfiles {
	[key: string]: IFiles;
}

export interface IProfile {
	profileName: string;
	settings: string | ISettings;
	extensions: string[];
	keybindings: string[] | any[];
}

export interface ISettings {
	[key: string]: any;
}
export interface IIgnored {
	settings: () => Promise<string[]>;
	keybindings: () => Promise<{ key: string; command: string }[]>;
	extensions: () => Promise<string[]>;
	update: (
		settings: string[],
		extensions: string[],
		keybindings: { key: string; command: string }[]
	) => Promise<void>;
}

export interface IIgnoreList {
	settings: string[];
	keybindings: { key: string; command: string }[];
	extensions: string[];
}
export interface IGistCreateRequest {
	description: string;
	files: {
		[filename: string]: {
			content: string | IProfile;
		};
	};
	public?: boolean;
}

export interface IGistUpdateRequest {
	description?: string;
	files: {
		[filename: string]: {
			content: string | IProfile | null;
		};
	};
}
