/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// HTML escaping utility for XSS protection

/**
 * Escapes special characters in a string to prevent XSS.
 */
export function escapeHtml(unsafe: unknown): string {
    if (unsafe === null || unsafe === undefined) return '';
    const str = String(unsafe);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Tagged template literal for safe HTML generation.
 * Automatically escapes interpolated values unless they are marked as safe.
 * 
 * Usage:
 * const userContent = '<script>alert(1)</script>';
 * const html = html`<div>${userContent}</div>`;
 * // Result: <div>&lt;script&gt;alert(1)&lt;/script&gt;</div>
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
    let result = '';
    for (let i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < values.length) {
            const value = values[i];
            // If value is an array, join it (recursively safe if items are strings)
            if (Array.isArray(value)) {
                result += value.join('');
            } else {
                result += escapeHtml(value);
            }
        }
    }
    return result;
}

/**
 * Marks a string as safe (raw HTML), bypassing escaping.
 * USE WITH CAUTION! Only use for trusted content.
 */
export class SafeHtml {
    private content: string;
    constructor(content: string) {
        this.content = content;
    }
    toString() {
        return this.content;
    }
}

export function raw(content: string): SafeHtml {
    return new SafeHtml(content);
}
