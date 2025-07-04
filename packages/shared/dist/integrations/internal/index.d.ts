import { TaskIntegrationFactory } from '../TaskIntegrationFactory';
import { InternalTaskIntegration } from './InternalTaskIntegration';
export declare class InternalTaskIntegrationFactory implements TaskIntegrationFactory {
    type: string;
    create(configuration?: any): Promise<InternalTaskIntegration>;
}
export { InternalTaskIntegration };
/**
 * Register the internal task integration
 */
export declare function registerInternalTaskIntegration(): void;
//# sourceMappingURL=index.d.ts.map