/**
 * Timestamp Manager - Handles internal conflict resolution for section syncing
 * Uses timestamps to determine which version of a section is most recent
 */

export interface TimestampData {
	[key: string]: number; // "SectionName:lineNumber" => timestamp in milliseconds
}

/**
 * Generates a key for storing a section's timestamp
 * Key format: "SectionName:lineNumber"
 */
export function generateSectionKey(sectionName: string, lineNumber: number): string {
	return `${sectionName}:${lineNumber}`;
}

/**
 * Extracts line numbers for all instances of a section in the document
 */
export function getInstanceLineNumbers(lines: string[], sectionName: string): number[] {
	const lineNumbers: number[] = [];
	const regex = new RegExp(`^::${sectionName}(\\*)?(\\s*\\|[^|]+\\|)?(\\s+\\[.*?\\])?$`);
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line && regex.test(line)) {
			lineNumbers.push(i);
		}
	}
	return lineNumbers;
}

/**
 * Gets the current timestamp for a section instance
 */
export function getInstanceTimestamp(
	timestamps: TimestampData,
	sectionName: string,
	lineNumber: number
): number | null {
	const key = generateSectionKey(sectionName, lineNumber);
	return timestamps[key] || null;
}

/**
 * Updates or sets a timestamp for a section instance
 */
export function setInstanceTimestamp(
	timestamps: TimestampData,
	sectionName: string,
	lineNumber: number,
	timestamp: number = Date.now()
): TimestampData {
	const key = generateSectionKey(sectionName, lineNumber);
	return {
		...timestamps,
		[key]: timestamp,
	};
}

/**
 * Finds which instance of a section is the most recent
 * Returns the line number of the most recent instance, or null if no timestamps exist
 */
export function findMostRecentInstance(
	timestamps: TimestampData,
	sectionName: string,
	lineNumbers: number[]
): number | null {
	let mostRecentLine: number | null = null;
	let mostRecentTime = 0;

	for (const lineNum of lineNumbers) {
		const key = generateSectionKey(sectionName, lineNum);
		const timestamp = timestamps[key];

		// Only consider instances that have timestamps (have content)
		if (timestamp && timestamp > mostRecentTime) {
			mostRecentTime = timestamp;
			mostRecentLine = lineNum;
		}
	}

	return mostRecentLine;
}

/**
 * Determines if a section should be synced based on timestamps
 * Returns true if the modified section is newer than others, or if it's the first one with content
 */
export function shouldSyncSection(
	timestamps: TimestampData,
	sectionName: string,
	modifiedLineNumber: number,
	otherLineNumbers: number[]
): boolean {
	const modifiedKey = generateSectionKey(sectionName, modifiedLineNumber);
	const modifiedTimestamp = timestamps[modifiedKey];

	// If modified section has no timestamp yet, it's new content being added
	if (!modifiedTimestamp) {
		return true; // Sync immediately for new content
	}

	// Check if any other instance is newer
	for (const lineNum of otherLineNumbers) {
		if (lineNum === modifiedLineNumber) continue;

		const key = generateSectionKey(sectionName, lineNum);
		const timestamp = timestamps[key];

		// If other instance has a newer timestamp, don't sync
		if (timestamp && timestamp > modifiedTimestamp) {
			return false;
		}
	}

	return true; // Modified is newer or equal, proceed with sync
}

/**
 * Syncs timestamps across all instances when one is modified
 * Updates all instances to have the same timestamp as the most recent
 */
export function syncTimestamps(
	timestamps: TimestampData,
	sectionName: string,
	modifiedLineNumber: number,
	allLineNumbers: number[],
	newTimestamp: number = Date.now()
): TimestampData {
	let result = { ...timestamps };

	// Set the modified instance to the new timestamp
	result = setInstanceTimestamp(result, sectionName, modifiedLineNumber, newTimestamp);

	// Update all other instances to the same timestamp
	for (const lineNum of allLineNumbers) {
		if (lineNum !== modifiedLineNumber) {
			result = setInstanceTimestamp(result, sectionName, lineNum, newTimestamp);
		}
	}

	return result;
}

/**
 * When a new section is populated from an existing one,
 * give it the timestamp of the source section
 */
export function copyTimestampToNewInstance(
	timestamps: TimestampData,
	sectionName: string,
	sourceLineNumber: number,
	targetLineNumber: number
): TimestampData {
	const sourceKey = generateSectionKey(sectionName, sourceLineNumber);
	const sourceTimestamp = timestamps[sourceKey];

	if (sourceTimestamp) {
		return setInstanceTimestamp(timestamps, sectionName, targetLineNumber, sourceTimestamp);
	}

	return timestamps;
}

/**
 * Cleans up timestamps for sections that no longer exist in the document
 */
export function cleanupTimestamps(
	timestamps: TimestampData,
	lines: string[]
): TimestampData {
	const result = { ...timestamps };

	// Find all current sections in the document
	const currentSections = new Map<string, number[]>();
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line) {
			const match = line.match(/^::(\w+)(\*)?(\s*\|[^|]+\|)?(\s+\[.*?\])?$/);
			if (match && match[1]) {
				const sectionName = match[1];
				if (!currentSections.has(sectionName)) {
					currentSections.set(sectionName, []);
				}
				currentSections.get(sectionName)!.push(i);
			}
		}
	}

	// Remove timestamps for sections that no longer exist
	for (const key in result) {
		const parts = key.split(':');
		const sectionName = parts[0];
		const lineNumStr = parts[1];

		if (sectionName && lineNumStr) {
			const lineNum = parseInt(lineNumStr, 10);
			const lineNumbers = currentSections.get(sectionName) || [];
			if (!lineNumbers.includes(lineNum)) {
				delete result[key];
			}
		}
	}

	return result;
}
