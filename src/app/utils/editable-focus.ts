const EDITABLE_SELECTOR = 'input:not([type="hidden"]), textarea, select, [contenteditable="true"]';

const isEditableTarget = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLElement && target.matches(EDITABLE_SELECTOR);

const getActiveEditableInside = (root: HTMLElement | null) => {
  const activeElement = document.activeElement;

  return root?.contains(activeElement) && isEditableTarget(activeElement)
    ? activeElement
    : null;
};

export const blurActiveEditableInside = (root: HTMLElement | null) => {
  getActiveEditableInside(root)?.blur();
};
