// Field-guide chapter clips (Higgsfield "macro to world" loops), encoded into public/media/field-guide:
// <id>.mp4 (H.264), <id>.jpg (poster) and, when it came out smaller, <id>.webm. A chapter shows its clip
// only once it is listed here, so the page never points at a file that does not exist.
export const FIELD_CLIPS: Record<string, { webm: boolean }> = {
    retrieval: { webm: true },
};
