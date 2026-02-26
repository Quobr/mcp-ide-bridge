// 4-character alphanumeric sync code generator
// Excludes I, O, 0, 1 for readability
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateSyncCode(): string {
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return code;
}
