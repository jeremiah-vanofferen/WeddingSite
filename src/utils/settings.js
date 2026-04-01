import { DEFAULT_SETTINGS } from './constants';

export function mergeSettings(currentSettings, incomingSettings) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
    ...incomingSettings,
  };

  merged.showCountdown = merged.showCountdown === true || merged.showCountdown === 'true';
  merged.allowRsvp = merged.allowRsvp === true || merged.allowRsvp === 'true';

  return merged;
}

export function mergeWeddingDetails(currentDetails, incomingSettings) {
  return {
    ...currentDetails,
    ...(incomingSettings.weddingDate && { date: incomingSettings.weddingDate }),
    ...(incomingSettings.weddingTime && { time: incomingSettings.weddingTime }),
    ...(incomingSettings.weddingTimeZone && { timeZone: incomingSettings.weddingTimeZone }),
    ...(incomingSettings.weddingLocation && { location: incomingSettings.weddingLocation }),
    ...(incomingSettings.weddingAddress && { address: incomingSettings.weddingAddress }),
    ...(incomingSettings.weddingDescription && { description: incomingSettings.weddingDescription }),
    ...('registryUrl' in incomingSettings && { registryUrl: incomingSettings.registryUrl || '' }),
  };
}