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
exports.ConfigService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class ConfigService {
    constructor() {
        this.defaultBackendUrl = 'http://localhost:3456';
        this.defaultBackendPort = 3456;
        this.configDir = path.join(os.homedir(), '.magents');
        this.configFile = path.join(this.configDir, 'config.json');
    }
    async getBackendConfig() {
        // Check environment variables first
        if (process.env.MAGENTS_BACKEND_URL) {
            const url = new URL(process.env.MAGENTS_BACKEND_URL);
            return {
                backendUrl: process.env.MAGENTS_BACKEND_URL,
                backendPort: parseInt(url.port) || this.defaultBackendPort
            };
        }
        // Check config file
        if (fs.existsSync(this.configFile)) {
            try {
                const config = JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
                if (config.backendUrl) {
                    return {
                        backendUrl: config.backendUrl,
                        backendPort: config.backendPort || this.defaultBackendPort
                    };
                }
            }
            catch (error) {
                // Fall through to defaults
            }
        }
        // Return defaults
        return {
            backendUrl: this.defaultBackendUrl,
            backendPort: this.defaultBackendPort
        };
    }
    async saveBackendConfig(config) {
        // Ensure config directory exists
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
        let existingConfig = {};
        if (fs.existsSync(this.configFile)) {
            try {
                existingConfig = JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
            }
            catch (error) {
                // Ignore parsing errors
            }
        }
        const newConfig = {
            ...existingConfig,
            ...config
        };
        fs.writeFileSync(this.configFile, JSON.stringify(newConfig, null, 2));
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=ConfigService.js.map