import { describe, expect, it } from 'vitest';

import { commands, executeCommand } from './terminal-commands';

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

describe('command table', () => {
  const helpText = commands.help.execute([]).output;

  it.each(Object.keys(commands))('%s is listed in help', (name) => {
    expect(helpText).toContain(name);
  });

  it.each(Object.keys(commands))('%s runs from the prompt without arguments', (name) => {
    const result = executeCommand(name);

    expect(result.isError).toBeUndefined();
    expect(result.output.length).toBeGreaterThan(0);
  });
});

describe('executeCommand parsing', () => {
  it('ignores surrounding and repeated whitespace', () => {
    expect(executeCommand('   help   ')).toEqual(executeCommand('help'));
    expect(executeCommand('projects    --ml').output).toContain('Projects (ml):');
  });

  it('returns empty output for blank input', () => {
    expect(executeCommand('')).toEqual({ output: '' });
    expect(executeCommand('   \t ')).toEqual({ output: '' });
  });

  it('runs multi-word commands advertised in help', () => {
    const result = executeCommand('sudo rm -rf /');

    expect(result.isError).toBeUndefined();
    expect(result.output).toContain('Nice try!');
  });

  it('is case-sensitive like a real shell', () => {
    expect(executeCommand('HELP').isError).toBe(true);
  });

  it('clear emits the sentinel the terminal component looks for', () => {
    expect(executeCommand('clear').output).toBe('__CLEAR__');
  });
});

describe('projects', () => {
  it.each(['ml', 'infrastructure', 'functional'])('--%s lists only that category', (category) => {
    const output = executeCommand(`projects --${category}`).output;

    expect(output).toContain(`Projects (${category}):`);
    const rows = output.split('\n').filter((line) => line.startsWith('*'));
    expect(rows.length).toBeGreaterThan(0);
  });

  it('rejects unknown categories instead of listing everything', () => {
    const result = executeCommand('projects --bogus');

    expect(result.isError).toBe(true);
    expect(result.output).toContain('No projects found for category: bogus');
    expect(result.output).toContain('Valid categories: ml, infrastructure, functional');
  });

  it('lists every project without a filter', () => {
    const output = executeCommand('projects').output;

    for (const name of ['HybridTransformer-MFIF', 'OS-nixCfg', 'hs-faust', 'kanata-service']) {
      expect(output).toContain(name);
    }
  });
});

describe('skills and cowsay', () => {
  it('--expert shows only the expert summary', () => {
    const expert = executeCommand('skills --expert').output;

    expect(expert).toContain('Expert-Level Skills:');
    expect(expert).not.toContain('Data Engineering:');
  });

  it('cowsay sizes the bubble to the text', () => {
    const output = executeCommand('cowsay moo moo').output;

    expect(output).toContain('< moo moo >');
    expect(output).toContain(` ${'_'.repeat('moo moo'.length + 2)}`);
  });
});
