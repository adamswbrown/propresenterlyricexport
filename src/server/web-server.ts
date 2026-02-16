#!/usr/bin/env node
/**
 * Standalone web server entry point for pkg executable.
 * Usage: ./pp-web-server (with env vars set)
 *
 * Forces node-fetch as the global fetch implementation.
 * Node 18's experimental fetch doesn't work reliably inside
 * pkg's snapshot filesystem, so we always override it.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeFetch = require('node-fetch');
(globalThis as any).fetch = nodeFetch;
(globalThis as any).Headers = nodeFetch.Headers;
(globalThis as any).Request = nodeFetch.Request;
(globalThis as any).Response = nodeFetch.Response;

import { startServer } from './index';

startServer();
