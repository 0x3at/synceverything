import axios, { AxiosError } from 'axios';
import { authentication, AuthenticationSession, window } from 'vscode';

import {
	IGist,
	IGistCreateRequest,
	IGistUpdateRequest,
	IProfile
} from '../models/interfaces';

// Constants
export const MasterDescription = 'SyncEverything';
export const BaseUrl = 'https://api.github.com/gists';

// Helper function to create headers
const createHeaders = (accessToken: string) => ({
	headers: {
		Authorization: `Bearer ${accessToken}`,
		Accept: 'application/vnd.github.v3+json',
		'User-Agent': 'SyncEverything-VSCode-Extension'
	}
});

// Enhanced error handling
const handleGistError = (error: any, operation: string): never => {
	let message = `Failed to ${operation}`;

	if (axios.isAxiosError(error)) {
		const axiosError = error as AxiosError;

		if (axiosError.response) {
			const status = axiosError.response.status;
			const data = axiosError.response.data as any;

			switch (status) {
				case 401:
					message = `Authentication failed during ${operation}. Please check your GitHub token.`;
					break;
				case 403:
					message = `Access forbidden during ${operation}. Check your GitHub permissions.`;
					break;
				case 404:
					message = `Resource not found during ${operation}. The gist may have been deleted.`;
					break;
				case 422:
					message = `Invalid data during ${operation}: ${
						data?.message || 'Unknown validation error'
					}`;
					break;
				case 429:
					message = `Rate limit exceeded during ${operation}. Please try again later.`;
					break;
				default:
					message = `GitHub API error during ${operation}: ${
						data?.message || axiosError.message
					}`;
			}
		} else if (axiosError.request) {
			message = `Network error during ${operation}. Please check your internet connection.`;
		}
	}

	window.showErrorMessage(`SyncEverything: ${message}`);
	throw new Error(message);
};

// Authentication with retry logic
export const getSession = async (
	retryCount = 0
): Promise<AuthenticationSession> => {
	try {
		const session = await authentication.getSession('github', ['gist'], {
			createIfNone: true
		});

		if (!session) {
			throw new Error('No authentication session available');
		}

		return session;
	} catch (error) {
		if (retryCount < 2) {
			console.log(`Authentication retry ${retryCount + 1}/2`);
			return getSession(retryCount + 1);
		}

		window.showErrorMessage(
			`SyncEverything: Authentication failed. Please ensure you're signed in to GitHub.`
		);
		throw error;
	}
};

// Enhanced gist operations with better error handling
export const getAllGists = async (): Promise<IGist[]> => {
	try {
		const session = await getSession();
		const response = await axios.get(
			BaseUrl,
			createHeaders(session.accessToken)
		);
		return response.data as IGist[];
	} catch (error) {
		throw handleGistError(error, 'fetch gists');
	}
};

export const getGist = async (gistId: string): Promise<IGist> => {
	try {
		if (!gistId) {
			throw new Error('Gist ID is required');
		}

		const session = await getSession();
		const response = await axios.get(
			`${BaseUrl}/${gistId}`,
			createHeaders(session.accessToken)
		);
		return response.data as IGist;
	} catch (error) {
		throw handleGistError(error, `fetch gist ${gistId}`);
	}
};

export const createMasterGist = async (profile: IProfile): Promise<IGist> => {
	try {
		const session = await getSession();

		const gistData: IGistCreateRequest = {
			description: MasterDescription,
			public: false,
			files: {
				[`${profile.profileName}.json`]: {
					content: JSON.stringify(profile, null, 2)
				}
			}
		};

		const response = await axios.post(
			BaseUrl,
			gistData,
			createHeaders(session.accessToken)
		);
		return response.data as IGist;
	} catch (error) {
		throw handleGistError(error, 'create master gist');
	}
};

export const updateMasterGist = async (
	masterId: string,
	profile: IProfile
): Promise<IGist> => {
	try {
		if (!masterId) {
			throw new Error('Master gist ID is required');
		}

		const session = await getSession();
		const url = `${BaseUrl}/${masterId}`;

		const gistData: IGistUpdateRequest = {
			files: {
				[`${profile.profileName}.json`]: {
					content: JSON.stringify(profile, null, 2)
				}
			}
		};

		const response = await axios.patch(
			url,
			gistData,
			createHeaders(session.accessToken)
		);
		return response.data as IGist;
	} catch (error) {
		throw handleGistError(error, `update profile ${profile.profileName}`);
	}
};

export const deleteProfile = async (
	masterId: string,
	profile: IProfile
): Promise<void> => {
	try {
		if (!masterId) {
			throw new Error('Master gist ID is required');
		}

		const session = await getSession();
		const url = `${BaseUrl}/${masterId}`;

		const gistData: IGistUpdateRequest = {
			files: {
				[`${profile.profileName}.json`]: {
					content: `` // This removes the file from the gist
				}
			}
		};

		await axios.patch(url, gistData, createHeaders(session.accessToken));
	} catch (error) {
		throw handleGistError(error, `delete profile ${profile.profileName}`);
	}
};

export const getRawProfile = async (rawUrl: string): Promise<IProfile> => {
	try {
		if (!rawUrl) {
			throw new Error('Raw URL is required');
		}

		const session = await getSession();
		const response = await axios.get(
			rawUrl,
			createHeaders(session.accessToken)
		);

		// Handle both string and object responses
		const data =
			typeof response.data === 'string'
				? JSON.parse(response.data)
				: response.data;

		return data as IProfile;
	} catch (error) {
		throw handleGistError(error, 'fetch profile content');
	}
};

// Utility functions
export const findGist = (
	list: IGist[],
	description: string
): IGist | undefined => {
	return list.find((gist) => gist.description === description);
};

export const getMasterList = async (): Promise<IGist | undefined> => {
	try {
		const list = await getAllGists();
		return findGist(list, MasterDescription);
	} catch (error) {
		// If we can't get the master list, return undefined instead of throwing
		console.error('Failed to get master list:', error);
		return undefined;
	}
};

// Convenience functions
export const createProfile = async (
	masterId: string,
	profile: IProfile
): Promise<void> => {
	await updateMasterGist(masterId, profile);
};
