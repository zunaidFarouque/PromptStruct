export function sanitizeElementContent(content: string | undefined | null): string {
    if (!content) {
        return '';
    }

    const normalized = content.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const result: string[] = [];
    let previousBlank = false;

    for (const rawLine of lines) {
        const line = rawLine.replace(/\s+$/g, '');
        const isBlank = line.trim().length === 0;

        if (isBlank) {
            if (!previousBlank && result.length > 0) {
                result.push('');
                previousBlank = true;
            }
            continue;
        }

        result.push(line);
        previousBlank = false;
    }

    while (result.length > 0 && result[result.length - 1].trim().length === 0) {
        result.pop();
    }

    return result.join('\n');
}

