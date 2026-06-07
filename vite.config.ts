import { sveltekit } from '@sveltejs/kit/vite';

export default {
  plugins: await sveltekit(),
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}']
  }
};
