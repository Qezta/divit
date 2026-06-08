import { describe, expect, it } from 'vitest';

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
