import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// jsdom does not implement scrollIntoView, but Mantine's combobox calls it
// on every highlight move — without this, any test that arrow-keys through
// a dropdown throws, which makes keyboard interaction untestable across the
// whole Select* family.
Element.prototype.scrollIntoView = jest.fn();

// Mock getComputedStyle for Mantine
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (element: Element) => {
  const style = originalGetComputedStyle(element);
  return {
    ...style,
    getPropertyValue: (prop: string) => {
      if (prop.startsWith('--mantine')) {
        return '';
      }
      return style.getPropertyValue(prop);
    },
  };
};
