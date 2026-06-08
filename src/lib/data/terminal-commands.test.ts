import { describe, expect, it } from 'vitest';

import { executeCommand } from './terminal-commands';

describe('executeCommand', () => {
  it('returns help output for the help command', () => {
    const result = executeCommand('help');

    expect(result.isError).toBeUndefined();
    expect(result.output).toContain('Available commands:');
    expect(result.output).toContain('projects --ml');
  });

  it('passes arguments to filtered project commands', () => {
    const result = executeCommand('projects --functional');

    expect(result.isError).toBeUndefined();
    expect(result.output).toContain('Projects (functional):');
    expect(result.output).toContain('hs-faust');
    expect(result.output).not.toContain('OS-nixCfg');
  });

  it('reports unknown commands as errors', () => {
    const result = executeCommand('does-not-exist');

    expect(result.isError).toBe(true);
    expect(result.output).toContain('Command not found: does-not-exist');
  });

  it('uses default text for cowsay without arguments', () => {
    const result = executeCommand('cowsay');

    expect(result.output).toContain('< Hello from Divit! >');
    expect(result.output).toContain('^__^');
  });
});
