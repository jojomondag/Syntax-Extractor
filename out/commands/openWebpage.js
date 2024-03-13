"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOpenWebpage = void 0;
const __1 = require("..");
function handleOpenWebpage() {
    __1.vscode.env.openExternal(__1.vscode.Uri.parse('https://chat.openai.com/'));
}
exports.handleOpenWebpage = handleOpenWebpage;
//# sourceMappingURL=openWebpage.js.map