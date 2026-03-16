export function formatParticipantIdentifier(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value.split('@')[0];
}
