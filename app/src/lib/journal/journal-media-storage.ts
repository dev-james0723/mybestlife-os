export const JOURNAL_MEDIA_BUCKET = "journal-media";

export function journalIllustrationPath(userId: string, entryId: string): string {
  return `${userId}/${entryId}/illustration.png`;
}

export function journalAudioPath(userId: string, entryId: string, ext: "mp3" | "wav" = "mp3"): string {
  return `${userId}/${entryId}/audio.${ext}`;
}

export function journalMediaPublicUrl(
  supabase: { storage: { from: (bucket: string) => { getPublicUrl: (path: string) => { data: { publicUrl: string } } } } },
  storagePath: string,
): string {
  const { data } = supabase.storage.from(JOURNAL_MEDIA_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
