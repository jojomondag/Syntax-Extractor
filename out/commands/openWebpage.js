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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOpenWebpage = void 0;
const vscode = __importStar(require("vscode"));
// This will store our opened URLs
let openedUrls = new Set();
function handleOpenWebpage() {
    const url = 'https://chat.openai.com/'; // Specify your URL here
    // Check if the URL is already opened
    if (openedUrls.has(url)) {
        vscode.window.showInformationMessage('This URL is already opened, attempting to focus...');
    }
    else {
        openedUrls.add(url);
    }
    // Try to open or focus the URL
    vscode.env.openExternal(vscode.Uri.parse(url));
}
exports.handleOpenWebpage = handleOpenWebpage;
//# sourceMappingURL=openWebpage.js.map