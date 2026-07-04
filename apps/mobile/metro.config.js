// Metro config for a pnpm monorepo: watch the workspace root and resolve
// modules from both the app's and the root node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// shared-utils' index pulls in Node-only modules (crypto, tax engines);
// always bundle the browser-safe entry on native.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@my-cura/shared-utils') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(workspaceRoot, 'packages/shared-utils/src/browser.ts'),
    };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
