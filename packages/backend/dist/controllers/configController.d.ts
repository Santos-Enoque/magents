import { MagentsConfig } from '@magents/shared';
export declare const configController: {
    getConfig(): Promise<MagentsConfig>;
    updateConfig(updates: Partial<MagentsConfig>): Promise<MagentsConfig>;
    resetConfig(): Promise<MagentsConfig>;
};
//# sourceMappingURL=configController.d.ts.map