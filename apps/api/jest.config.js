/** Unit tests live beside the code as *.spec.ts; run with `pnpm test`. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/**/*.spec.ts'],
  moduleNameMapper: {
    '^@my-cura/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
    '^@my-cura/shared-utils$': '<rootDir>/../../packages/shared-utils/src/index.ts',
  },
  transform: { '^.+\\.ts$': ['ts-jest', { isolatedModules: true }] },
};
