interface BackendConfig {
    backendUrl: string;
    backendPort: number;
}
export declare class ConfigService {
    private configDir;
    private configFile;
    private defaultBackendUrl;
    private defaultBackendPort;
    constructor();
    getBackendConfig(): Promise<BackendConfig>;
    saveBackendConfig(config: Partial<BackendConfig>): Promise<void>;
}
export {};
//# sourceMappingURL=ConfigService.d.ts.map