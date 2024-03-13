"use strict";
// Assuming this is in your 'operations.ts' file
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenCount = void 0;
const lite_1 = require("tiktoken/lite");
const cl100k_base = __importStar(require("tiktoken/encoders/cl100k_base.json"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
function getTokenCount(text) {
    console.log("getting token count...");
    try {
        const encoding = new lite_1.Tiktoken(cl100k_base.bpe_ranks, cl100k_base.special_tokens, cl100k_base.pat_str);
        const tokens = encoding.encode(text);
        encoding.free();
        console.log(`Token count: ${tokens.length}`);
        return tokens.length;
    }
    catch (error) {
        const message = error instanceof Error ? error.stack || error.message : "An unknown error occurred";
        console.error('Error in getTokenCount:', message);
        // Log the error to a file on the desktop
        const desktopDir = path.join(os.homedir(), 'Desktop');
        const errorFilePath = path.join(desktopDir, 'token_count_error.log');
        const errorMessage = `Error in getTokenCount: ${message}\n`;
        fs.appendFileSync(errorFilePath, errorMessage);
        return 0;
    }
}
exports.getTokenCount = getTokenCount;
//# sourceMappingURL=tokenUtils.js.map