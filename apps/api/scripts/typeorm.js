// TypeORM CLI wrapper: registers ts-node (transpile-only) then delegates to
// the CLI, resolving typeorm wherever the package manager put it.
require('ts-node').register({ transpileOnly: true });
require('typeorm/cli');
