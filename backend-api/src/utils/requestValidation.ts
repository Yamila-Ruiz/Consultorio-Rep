export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const isNonEmptyString = (value: unknown, maxLength: number): value is string =>
    typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;

export const isOptionalString = (value: unknown, maxLength: number): value is string | undefined =>
    value === undefined || (typeof value === 'string' && value.trim().length <= maxLength);

export const isOptionalNullableString = (value: unknown, maxLength: number): value is string | null | undefined =>
    value === undefined || value === null || (typeof value === 'string' && value.trim().length <= maxLength);

export const isPositiveInteger = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

export const isNonNegativeInteger = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export const isAssignedTherapist = (patientTherapistId: number, slotTherapistId: number): boolean =>
    Number.isSafeInteger(patientTherapistId) &&
    patientTherapistId > 0 &&
    Number.isSafeInteger(slotTherapistId) &&
    slotTherapistId > 0 &&
    patientTherapistId === slotTherapistId;

export const parsePathId = (value: unknown): number | null => {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
};
