import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['test/**/*.integration.test.ts'],setupFiles:['./test/setup.ts'],fileParallelism:false,testTimeout:30000}});
