"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalTaskIntegration = exports.InternalTaskIntegrationFactory = void 0;
exports.registerInternalTaskIntegration = registerInternalTaskIntegration;
const InternalTaskIntegration_1 = require("./InternalTaskIntegration");
Object.defineProperty(exports, "InternalTaskIntegration", { enumerable: true, get: function () { return InternalTaskIntegration_1.InternalTaskIntegration; } });
class InternalTaskIntegrationFactory {
    constructor() {
        this.type = 'internal';
    }
    async create(configuration) {
        const integration = new InternalTaskIntegration_1.InternalTaskIntegration();
        await integration.initialize(configuration);
        return integration;
    }
}
exports.InternalTaskIntegrationFactory = InternalTaskIntegrationFactory;
/**
 * Register the internal task integration
 */
function registerInternalTaskIntegration() {
    // This will be called from the backend server initialization
    // when the internal task system feature is enabled
    // Dynamic import to avoid circular dependencies
    Promise.resolve().then(() => __importStar(require('../TaskIntegrationFactory'))).then(({ taskIntegrationManager }) => {
        Promise.resolve().then(() => __importStar(require('../../config/features'))).then(({ featureFlags }) => {
            if (featureFlags.isEnabled('internalTaskSystem')) {
                const factory = new InternalTaskIntegrationFactory();
                taskIntegrationManager.getRegistry().register('internal', factory);
                // Initialize the integration
                taskIntegrationManager.addIntegration({
                    type: 'internal',
                    name: 'Internal Task System',
                    enabled: true,
                    configuration: {},
                    capabilities: {
                        canCreate: true,
                        canUpdate: true,
                        canDelete: true,
                        canAssign: true,
                        supportsSubtasks: true,
                        supportsDependencies: true,
                        supportsSearch: true,
                        supportsPagination: true,
                        supportsRealTimeUpdates: false
                    }
                }).then(() => {
                    console.log('Internal task integration registered successfully');
                }).catch(error => {
                    console.warn('Failed to register internal task integration:', error);
                });
            }
        });
    });
}
//# sourceMappingURL=index.js.map