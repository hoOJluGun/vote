// Mock for node-fetch
const mockFetch = jest.fn();

export default mockFetch;

// Mock the named exports
export const Request = jest.fn();
export const Response = jest.fn();
export const Headers = jest.fn();