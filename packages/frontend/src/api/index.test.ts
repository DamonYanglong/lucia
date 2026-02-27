import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildSpanTree,
  flattenSpanTree,
  formatDuration,
  formatDate,
  type Span,
  type SpanNode,
} from './index';

// Test fixtures
const mockSpans: Span[] = [
  {
    timestamp: '2024-01-01T00:00:00.000Z',
    traceId: 'trace-1',
    spanId: 'span-1',
    parentSpanId: null,
    spanName: 'HTTP GET /api/users',
    spanKind: 'SERVER',
    serviceName: 'user-service',
    duration: 100000000,
    statusCode: 'Ok',
    statusMessage: '',
    spanAttributes: {},
    resourceAttributes: {},
    events: [],
    links: [],
  },
  {
    timestamp: '2024-01-01T00:00:00.010Z',
    traceId: 'trace-1',
    spanId: 'span-2',
    parentSpanId: 'span-1',
    spanName: 'DB Query',
    spanKind: 'CLIENT',
    serviceName: 'user-service',
    duration: 50000000,
    statusCode: 'Ok',
    statusMessage: '',
    spanAttributes: {},
    resourceAttributes: {},
    events: [],
    links: [],
  },
  {
    timestamp: '2024-01-01T00:00:00.060Z',
    traceId: 'trace-1',
    spanId: 'span-3',
    parentSpanId: 'span-1',
    spanName: 'Cache Lookup',
    spanKind: 'CLIENT',
    serviceName: 'user-service',
    duration: 10000000,
    statusCode: 'Ok',
    statusMessage: '',
    spanAttributes: {},
    resourceAttributes: {},
    events: [],
    links: [],
  },
  {
    timestamp: '2024-01-01T00:00:00.020Z',
    traceId: 'trace-1',
    spanId: 'span-4',
    parentSpanId: 'span-2',
    spanName: 'DB Connection',
    spanKind: 'CLIENT',
    serviceName: 'user-service',
    duration: 5000000,
    statusCode: 'Ok',
    statusMessage: '',
    spanAttributes: {},
    resourceAttributes: {},
    events: [],
    links: [],
  },
];

describe('API Utility Functions', () => {
  describe('formatDuration', () => {
    it('should format nanoseconds', () => {
      expect(formatDuration(500)).toBe('500 ns');
      expect(formatDuration(999)).toBe('999 ns');
    });

    it('should format microseconds', () => {
      expect(formatDuration(1000)).toBe('1.00 µs');
      expect(formatDuration(500000)).toBe('500.00 µs');
    });

    it('should format milliseconds', () => {
      expect(formatDuration(1000000)).toBe('1.00 ms');
      expect(formatDuration(500000000)).toBe('500.00 ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(1000000000)).toBe('1.00 s');
      expect(formatDuration(3000000000)).toBe('3.00 s');
    });
  });

  describe('formatDate', () => {
    it('should format ISO string to locale string', () => {
      const isoString = '2024-01-01T12:30:45.000Z';
      const result = formatDate(isoString);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle different timezones', () => {
      const isoString = '2024-06-15T18:00:00.000Z';
      const result = formatDate(isoString);
      
      expect(result).toBeTruthy();
    });
  });
});

describe('Span Tree Building', () => {
  describe('buildSpanTree', () => {
    it('should return empty array for empty spans', () => {
      const result = buildSpanTree([]);
      expect(result).toEqual([]);
    });

    it('should build tree with single root span', () => {
      const singleSpan = [mockSpans[0]];
      const result = buildSpanTree(singleSpan);

      expect(result).toHaveLength(1);
      expect(result[0].spanId).toBe('span-1');
      expect(result[0].depth).toBe(0);
      expect(result[0].children).toHaveLength(0);
    });

    it('should build tree with children', () => {
      const spans = [mockSpans[0], mockSpans[1], mockSpans[2]];
      const result = buildSpanTree(spans);

      expect(result).toHaveLength(1);
      expect(result[0].spanId).toBe('span-1');
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children.map(c => c.spanId)).toContain('span-2');
      expect(result[0].children.map(c => c.spanId)).toContain('span-3');
    });

    it('should set correct depth for nested spans', () => {
      const result = buildSpanTree(mockSpans);

      // Root span depth = 0
      expect(result[0].depth).toBe(0);
      
      // First level children depth = 1
      const child1 = result[0].children.find(c => c.spanId === 'span-2');
      expect(child1?.depth).toBe(1);
      
      // Second level children depth = 2
      const grandchild = child1?.children.find(c => c.spanId === 'span-4');
      expect(grandchild?.depth).toBe(2);
    });

    it('should calculate relative start time', () => {
      const result = buildSpanTree(mockSpans);

      // Root span should start at 0
      expect(result[0].startTime).toBe(0);
      
      // Children should have positive relative start time
      result[0].children.forEach(child => {
        expect(child.startTime).toBeGreaterThan(0);
      });
    });

    it('should handle multiple root spans', () => {
      const multiRoot: Span[] = [
        { ...mockSpans[0], spanId: 'root-1', parentSpanId: null },
        { ...mockSpans[0], spanId: 'root-2', parentSpanId: null },
      ];

      const result = buildSpanTree(multiRoot);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.spanId)).toContain('root-1');
      expect(result.map(r => r.spanId)).toContain('root-2');
    });

    it('should handle orphan spans (parent not found)', () => {
      const orphan: Span = {
        ...mockSpans[0],
        spanId: 'orphan',
        parentSpanId: 'non-existent-parent',
      };

      const result = buildSpanTree([orphan]);

      // Orphan should become a root
      expect(result).toHaveLength(1);
      expect(result[0].spanId).toBe('orphan');
    });

    it('should sort children by start time', () => {
      const spans = [
        mockSpans[0], // root
        { ...mockSpans[1], timestamp: '2024-01-01T00:00:00.060Z' }, // later
        { ...mockSpans[2], timestamp: '2024-01-01T00:00:00.010Z' }, // earlier
      ];

      const result = buildSpanTree(spans);

      expect(result[0].children[0].spanId).toBe('span-3'); // earlier first
      expect(result[0].children[1].spanId).toBe('span-2'); // later second
    });
  });

  describe('flattenSpanTree', () => {
    it('should return empty array for empty input', () => {
      expect(flattenSpanTree([])).toEqual([]);
    });

    it('should flatten single node', () => {
      const nodes: SpanNode[] = [{
        ...mockSpans[0],
        children: [],
        depth: 0,
        startTime: 0,
      }];

      const result = flattenSpanTree(nodes);

      expect(result).toHaveLength(1);
      expect(result[0].spanId).toBe('span-1');
    });

    it('should flatten tree in depth-first order', () => {
      const tree: SpanNode[] = [{
        ...mockSpans[0],
        children: [
          {
            ...mockSpans[1],
            children: [
              {
                ...mockSpans[3],
                children: [],
                depth: 2,
                startTime: 20,
              },
            ],
            depth: 1,
            startTime: 10,
          },
          {
            ...mockSpans[2],
            children: [],
            depth: 1,
            startTime: 60,
          },
        ],
        depth: 0,
        startTime: 0,
      }];

      const result = flattenSpanTree(tree);

      expect(result).toHaveLength(4);
      expect(result.map(r => r.spanId)).toEqual(['span-1', 'span-2', 'span-4', 'span-3']);
    });

    it('should preserve depth information', () => {
      const tree = buildSpanTree(mockSpans);
      const flat = flattenSpanTree(tree);

      const depths = flat.map(f => f.depth);
      expect(depths).toContain(0);
      expect(depths).toContain(1);
      expect(depths).toContain(2);
    });
  });
});

// Note: API functions (getServices, getTraces, etc.) require fetch mock setup
// Integration tests would cover the actual API calls
// The utility functions above are tested in this file
