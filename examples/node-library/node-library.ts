/**
 * Example: Copy files and bump version
 */

import { NgPackagerHooksContext, HookRegistry } from "ng-cli-packager-tasks";
import { NodeLib } from "ng-cli-packager-tasks/dist/tasks/node-lib";

module.exports = function (
  ctx: NgPackagerHooksContext,
  registry: HookRegistry
) {
  registry.register(NodeLib);
};
