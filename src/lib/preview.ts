/** Reserved helper used only for the admin preview. Not a real LINE account. */
export const PREVIEW_HELPER_ID = "user_preview";
export const PREVIEW_HELPER_NAME = "預覽小幫手";

export function isPreviewHelperId(id: string) {
  return id === PREVIEW_HELPER_ID;
}
