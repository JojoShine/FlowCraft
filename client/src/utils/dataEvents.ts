const EVENT_NAME = 'flowcraft:data-changed';

export type DataType = 'tasks' | 'artifacts' | 'projects';

export function notifyDataChange(type: DataType) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { type } }));
}

export function onDataChange(handler: (type: DataType) => void) {
  const listener = (e: Event) => {
    handler((e as CustomEvent).detail.type);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
