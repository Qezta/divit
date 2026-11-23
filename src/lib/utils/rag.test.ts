import { describe, expect, it } from 'vitest';

import { knowledgeBase } from '../data/knowledge-base';
import { getAllContext, retrieveContext } from './rag';

describe('retrieveContext', () => {
  it('returns relevant context for a project query', () => {
    const context = retrieveContext('tell me about the nixos configuration project', 3);

    expect(context).toContain('### OS-nixCfg: Multi-Platform NixOS Configuration');
    expect(context).toContain('### Who is Divit Mittal');
  });

  it('keeps the identity chunk when topK is smaller than the best matches', () => {
    const context = retrieveContext('computer vision transformer image fusion huggingface model', 2);

    expect(context).toContain('### Who is Divit Mittal');
    expect(context.split('\n\n---\n\n')).toHaveLength(2);
  });
});

describe('getAllContext', () => {
  it('formats every knowledge chunk as prompt context', () => {
    const context = getAllContext();

    expect(context).toContain('### Who is Divit Mittal');
    expect(context).toContain('### Education');
    expect(context).toContain('\n\n---\n\n');
  });
});

describe('retrieveContext edge cases', () => {
  const sections = (context: string) => context.split('\n\n---\n\n');

  it('returns exactly topK chunks', () => {
    for (const topK of [1, 3, 4, 6]) {
      expect(sections(retrieveContext('haskell nix', topK))).toHaveLength(topK);
    }
  });

  it('caps at the knowledge base size when topK is larger', () => {
    expect(sections(retrieveContext('anything', 1000))).toHaveLength(knowledgeBase.length);
  });

  it('still answers queries with no matching terms', () => {
    const context = retrieveContext('zzzz qqqq');

    expect(sections(context)).toHaveLength(4);
    expect(context).toContain('### Who is Divit Mittal');
  });

  it('is case-insensitive and ignores punctuation', () => {
    expect(retrieveContext('HASKELL, Nix!?')).toBe(retrieveContext('haskell nix'));
  });

  it('is deterministic', () => {
    expect(retrieveContext('autonomous driving carla')).toBe(
      retrieveContext('autonomous driving carla')
    );
  });

  it('ranks the chunk a query is clearly about first', () => {
    const first = sections(retrieveContext('CARLA autonomous driving simulation'))[0];

    expect(first).toMatch(/^### .*CARLA/);
  });

  it('never duplicates a chunk', () => {
    const titles = sections(retrieveContext('who is divit about identity', 4)).map(
      (s) => s.split('\n')[0]
    );

    expect(new Set(titles).size).toBe(titles.length);
  });
});
