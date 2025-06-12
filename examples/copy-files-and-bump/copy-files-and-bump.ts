/**
 * Example: Copy files and bump version
 */

import {
  NgPackagerHooks,
  NgPackagerHooksContext,
  HookRegistry,
} from "ng-cli-packager-tasks";
import { CopyFile } from "ng-cli-packager-tasks/dist/tasks/copy-file";
import { Bump } from "ng-cli-packager-tasks/dist/tasks/bump";

module.exports = function (
  ctx: NgPackagerHooksContext,
  registry: HookRegistry
) {
  registry.register(CopyFile).register(Bump);
};
