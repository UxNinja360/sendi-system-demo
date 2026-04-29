export const APP_TOP_BAR_ACTION_EVENT = 'sendi:top-bar-action';

export type AppTopBarAction =
  | 'create-delivery'
  | 'create-courier'
  | 'create-restaurant'
  | 'export-deliveries';

export const emitAppTopBarAction = (action: AppTopBarAction) => {
  window.dispatchEvent(
    new CustomEvent<AppTopBarAction>(APP_TOP_BAR_ACTION_EVENT, { detail: action }),
  );
};

export const addAppTopBarActionListener = (
  action: AppTopBarAction,
  handler: () => void,
) => {
  const listener = (event: Event) => {
    if ((event as CustomEvent<AppTopBarAction>).detail === action) {
      handler();
    }
  };

  window.addEventListener(APP_TOP_BAR_ACTION_EVENT, listener);
  return () => window.removeEventListener(APP_TOP_BAR_ACTION_EVENT, listener);
};
