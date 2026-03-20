export function formatParticipantIdentifier(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value.split('@')[0];
}

interface ParticipantIdentityLike {
  name?: string | null;
  username?: string | null;
  email?: string | null;
}

function normalizeValue(value: string | null | undefined) {
  return value?.trim() || '';
}

export function getParticipantPrimaryLabel(identity: ParticipantIdentityLike) {
  const name = normalizeValue(identity.name);
  if (name) {
    return name;
  }

  const username = formatParticipantIdentifier(identity.username);
  if (username) {
    return username;
  }

  return formatParticipantIdentifier(identity.email);
}

export function getParticipantSecondaryLabel(identity: ParticipantIdentityLike) {
  const name = normalizeValue(identity.name).toLowerCase();
  const username = formatParticipantIdentifier(identity.username);
  const email = formatParticipantIdentifier(identity.email);

  if (username && username.toLowerCase() !== name) {
    return username;
  }

  if (email && email.toLowerCase() !== username.toLowerCase()) {
    return email;
  }

  return '';
}
