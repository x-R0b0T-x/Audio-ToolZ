export const APP_VERSION = '1.8-dev';
export const APP_TITLE = `Audio ToolZ ${APP_VERSION}`;
export function keepVersionTitle(): () => void {
  const set = () => { if (document.title !== APP_TITLE) document.title = APP_TITLE; };
  set();
  const observer = new MutationObserver(set);
  observer.observe(document.querySelector('title') ?? document.head, { subtree: true, childList: true, characterData: true });
  return () => observer.disconnect();
}
