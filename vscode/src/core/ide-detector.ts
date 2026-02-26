import * as vscode from 'vscode';

export function detectIDE(): string {
    const appName = vscode.env.appName.toLowerCase();
    if (appName.includes('cursor')) return 'cursor';
    if (appName.includes('windsurf')) return 'windsurf';
    if (appName.includes('antigravity') || process.env.ANTIGRAVITY_ENV) return 'antigravity';
    if (appName.includes('kiro') || process.env.KIRO_ENV) return 'kiro';
    return 'vscode';
}
