import axios, { AxiosError } from "axios";
import { AuthenticationSession, authentication } from "vscode";
import {
    IGist,
    IGistCollection,
    IGistCreateRequest,
    IGistUpdateRequest,
    IProfile,
} from "../models/interfaces";
import Logger from "./logger";

export default class GistService {
    public description: string = "SyncEverything";
    public baseUrl: string = "https://api.github.com/gists";
    public masterId?: string;

    private authSession: AuthenticationSession;
    private logger: Logger;

    private constructor(logger: Logger, authSession: AuthenticationSession) {
        this.logger = logger;
        this.authSession = authSession;
    }

    public static async initialize(logger: Logger) {
        try {
            const authSession = await authentication.getSession("github", ["gist"], {
                createIfNone: true,
            });
            return new GistService(logger, authSession);
        } catch (err) {
            logger.error(
                "User rejected request for Github session token.",
                "GistService.create()",
                false,
                err
            );
            return undefined;
        }
    }

    public async getMaster() {
        // Attempt to find by id
        if (this.masterId) {
            const master = await this.getGist(this.masterId);
            if (master) {
                return master;
            }
        }
        // Try to find master list if no ID or gist cannot be found by ID
        const master = (await this.getCollection())?.find(
            (gist) => gist.description == this.description
        );
        if (master) {
            this.masterId = master.id;
        }
        // If master is undefined,
        return master;
    }

    public async createMaster(profile: IProfile): Promise<IGist> {
        try {
            const gistData: IGistCreateRequest = {
                description: this.description,
                public: false,
                files: {
                    [`${profile.profileName}.json`]: {
                        content: JSON.stringify(profile, null, 2),
                    },
                },
            };

            const response = await axios.post(this.baseUrl, gistData, {
                headers: this.createHeaders(),
            });
            return response.data as IGist;
        } catch (err) {
            throw this.handleGistError(
                err,
                `create new gist`,
                "GistService.createMaster"
            );
        }
    }

    public async getProfile(rawUrl: string) {
        try {
            if (!rawUrl) {
                throw new Error("Raw URL is required");
            }

            const response = await axios.get(rawUrl, {
                headers: this.createHeaders(),
            });

            // Handle both string and object responses
            const data =
                typeof response.data === "string"
                    ? JSON.parse(response.data)
                    : response.data;

            return data as IProfile;
        } catch (error) {
            throw this.handleGistError(
                error,
                "fetch profile content",
                "GistService.getFullProfile"
            );
        }
    }

    public async createProfile(profile: IProfile): Promise<IGist> {
        try {
            const gistData: IGistUpdateRequest = {
                files: {
                    [`${profile.profileName}.json`]: {
                        content: JSON.stringify(profile, null, 2),
                    },
                },
            };

            const response = await axios.patch(
                `${this.baseUrl}/${this.masterId}`,
                gistData,
                { headers: this.createHeaders() }
            );
            return response.data as IGist;
        } catch (error) {
            throw this.handleGistError(
                error,
                `update/create profile ${profile.profileName}`,
                "GistService.createProfile"
            );
        }
    }

    public async deleteProfile(profileName: string): Promise<void> {
        try {
            const gistData: IGistUpdateRequest = {
                files: {
                    [`${profileName}.json`]: {
                        content: ``, // This removes the file from the gist
                    },
                },
            };

            await axios.patch(`${this.baseUrl}/${this.masterId}`, gistData, {
                headers: this.createHeaders(),
            });
        } catch (error) {
            throw this.handleGistError(
                error,
                `delete profile ${profileName}`,
                "GistService.deleteProfile"
            );
        }
    }

    private async getCollection() {
        try {
            const response = await axios.get(this.baseUrl, {
                headers: this.createHeaders(),
            });
            return response.data as IGistCollection;
        } catch (err) {
            throw this.handleGistError(
                err,
                `fetching all gists`,
                "GistService.getCollection"
            );
        }
    }

    public async getGist(gistId: string) {
        try {
            const response = await axios.get(`${this.baseUrl}/${gistId}`, {
                headers: this.createHeaders(),
            });
            return response.data as IGist;
        } catch (err) {
            throw this.handleGistError(
                err,
                `fetch gist ${gistId}`,
                "GistService.getGist"
            );
        }
    }

    private createHeaders() {
        return {
            Authorization: `Bearer ${this.authSession.accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "SyncEverything-VSCode-Extension",
        };
    }

    // Enhanced error handling
    private handleGistError(
        error: any,
        operation: string,
        origin: string
    ): never {
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
                        message = `Invalid data during ${operation}: ${data?.message || "Unknown validation error"
                            }`;
                        break;
                    case 429:
                        message = `Rate limit exceeded during ${operation}. Please try again later.`;
                        break;
                    default:
                        message = `GitHub API error during ${operation}: ${data?.message || axiosError.message
                            }`;
                }
            } else if (axiosError.request) {
                message = `Network error during ${operation}. Please check your internet connection.`;
            }
        }
        this.logger.debugObject(error, origin);
        this.logger.error(message, origin, true, error);
        throw new Error(message);
    }
}
