// Add any global test setup here

// Import jest-dom extensions
import "@testing-library/jest-dom";

// React 18 DOM setup for testing
beforeAll(() => {
  // Create a div element for React to mount into
  const div = document.createElement('div');
  div.id = 'root';
  document.body.appendChild(div);
  
  // Mock ResizeObserver which is needed for React 18 components
  if (!global.ResizeObserver) {
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  }
  
  // Mock DOM methods that React 18 might need
  if (!global.IntersectionObserver) {
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  }
});

afterAll(() => {
  // Clean up the DOM
  const root = document.getElementById('root');
  if (root) {
    document.body.removeChild(root);
  }
});

// Polyfill BroadcastChannel
if (typeof global.BroadcastChannel === "undefined") {
  global.BroadcastChannel = class {
    constructor() {
      this._listeners = new Set();
    }
    postMessage() {}
    addEventListener(type, listener) {
      this._listeners.add(listener);
    }
    removeEventListener(type, listener) {
      this._listeners.delete(listener);
    }
    close() {
      this._listeners.clear();
    }
  };
}

// Polyfill TextEncoder and TextDecoder using Node.js util module
const { TextEncoder, TextDecoder } = require("util");
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder;
}

// Mock NextRequest and NextResponse for API testing
jest.mock("next/server", () => ({
  NextRequest: class {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new Map(Object.entries(options.headers || {}));
      this._body = options.body;
    }

    async json() {
      if (this._body) {
        try {
          return JSON.parse(this._body);
        } catch (error) {
          throw new Error("Invalid JSON");
        }
      }
      return {};
    }
  },
  NextResponse: {
    json: jest.fn((data, options = {}) => ({
      status: options.status || 200,
      headers: new Map(),
      json: jest.fn().mockResolvedValue(data)
    }))
  }
}));

// Create reusable mock functions
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockForward = jest.fn();
const mockRefresh = jest.fn();
const mockPrefetch = jest.fn();

// Mock next/router
jest.mock("next/router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
    back: mockBack,
    pathname: "/",
    query: {},
  }),
}));

// Mock next/navigation with jest.fn() to allow test-specific overrides
const mockUseRouter = jest.fn();
const mockUseParams = jest.fn();
const mockUsePathname = jest.fn();
const mockUseSearchParams = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: mockUseRouter,
  useParams: mockUseParams,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}));

// Set default implementations
mockUseRouter.mockReturnValue({
  push: mockPush,
  replace: mockReplace,
  back: mockBack,
  forward: mockForward,
  refresh: mockRefresh,
  prefetch: mockPrefetch,
});
mockUseParams.mockReturnValue({});
mockUsePathname.mockReturnValue("/");
mockUseSearchParams.mockReturnValue(new URLSearchParams());

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ""} />;
  },
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock global Request and Response for Next.js API tests
global.Request = jest.fn().mockImplementation((url, options) => ({
  url,
  method: options?.method || 'GET',
  headers: new Map(),
  json: jest.fn().mockResolvedValue({}),
}));

global.Response = jest.fn().mockImplementation((body, options) => ({
  status: options?.status || 200,
  json: jest.fn().mockResolvedValue(body ? JSON.parse(body) : {}),
}));

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();

  // Reset to default implementations
  mockUseRouter.mockReturnValue({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    forward: mockForward,
    refresh: mockRefresh,
    prefetch: mockPrefetch,
  });
  mockUseParams.mockReturnValue({});
  mockUsePathname.mockReturnValue("/");
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
});

// Export mock functions so tests can access them
global.mockNavigationFunctions = {
  mockPush,
  mockReplace,
  mockBack,
  mockForward,
  mockRefresh,
  mockPrefetch,
  mockUseRouter,
  mockUseParams,
  mockUsePathname,
  mockUseSearchParams,
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
