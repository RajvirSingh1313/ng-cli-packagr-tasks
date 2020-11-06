import { switchMap, map } from 'rxjs/operators';

import { resolve, normalize, virtualFs, JsonParseMode, parseJson, JsonObject, experimental, schema } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { NgPackagrBuilderOptions } from '@angular-devkit/build-angular';

import { BuilderContext } from '@angular-devkit/architect';
import { TransformProvider } from 'ng-packagr/lib/graph/transform.di';
import { EntryPointNode } from 'ng-packagr/lib/ng-package/nodes';
import { INIT_TS_CONFIG_TRANSFORM } from 'ng-packagr/lib/ng-package/entry-point/init-tsconfig.di';
import { ANALYSE_SOURCES_TRANSFORM } from 'ng-packagr/lib/ng-package/entry-point/analyse-sources.di';
import { ENTRY_POINT_TRANSFORM } from 'ng-packagr/lib/ng-package/entry-point/entry-point.di';
import { COMPILE_NGC_TRANSFORM } from 'ng-packagr/lib/ng-package/entry-point/compile-ngc.di';
import { WRITE_BUNDLES_TRANSFORM } from 'ng-packagr/lib/ng-package/entry-point/write-bundles.di';
import { WRITE_PACKAGE_TRANSFORM } from 'ng-packagr/lib/ng-package/entry-point/write-package.di';

import { NgPackagerHooksContext } from './hooks';
import {
  NgPackagerHooks,
  NgPackagrBuilderTaskOptions,
  NgPackagrBuilderTaskSchema,
  TaskPhases,
  NormalizedNgPackagerHooks,
  NormalizedTaskPhases
} from './hooks';
import { JobMetadata } from './job';

export const TRANSFORM_PROVIDER_MAP: Record<keyof NgPackagerHooks, TransformProvider> = {
  initTsConfig: INIT_TS_CONFIG_TRANSFORM,
  analyseSources: ANALYSE_SOURCES_TRANSFORM,
  entryPoint: ENTRY_POINT_TRANSFORM,
  compileNgc: COMPILE_NGC_TRANSFORM,
  writeBundles: WRITE_BUNDLES_TRANSFORM,
  writePackage: WRITE_PACKAGE_TRANSFORM
}

export const HOOK_PHASES = ['before', 'replace', 'after'] as Array<keyof TaskPhases>;

export function normalizeHooks(hooks: NgPackagerHooks): NormalizedNgPackagerHooks {
  const hookNames: Array<keyof NgPackagerHooks> = Object.keys(TRANSFORM_PROVIDER_MAP) as any;

  for (const key of hookNames) {
    if (hooks[key]) {
      hooks[key] = normalizeTaskPhases(hooks[key]) as any;
    }
  }

  return hooks as NormalizedNgPackagerHooks;
}

export function normalizeTaskPhases(taskPhases: TaskPhases<any>): NormalizedTaskPhases {
  for (const phase of HOOK_PHASES) {
    const taskOrTasksLike = taskPhases[phase];
    if (taskOrTasksLike) {
      taskPhases[phase] = Array.isArray(taskOrTasksLike)
        ? taskOrTasksLike
        : [ taskOrTasksLike ]
      ;
    }
  }
  return taskPhases as NormalizedTaskPhases;
}

export function getTaskDataInput<T>(jobMeta: JobMetadata, tasks: NgPackagrBuilderTaskOptions<NgPackagrBuilderTaskSchema>) {
  const data = tasks.data || {};
  return { [jobMeta.selector]: data[jobMeta.selector] };
}

export async function validateTypedTasks(jobs: JobMetadata[], context: NgPackagerHooksContext) {
  const tasks: NgPackagrBuilderTaskOptions<NgPackagrBuilderTaskSchema> = context.options.tasks;
  const allHooksPromises: Promise<any>[] = [];

  const promises = jobs.map( taskMeta => {
    return context.workspace.host.read(normalize(taskMeta.schema))
      .pipe(
        map(buffer => virtualFs.fileBufferToString(buffer)),
        map(str => parseJson(str, JsonParseMode.Loose) as {} as JsonObject),
        switchMap( jsonSchema => {
          return context.workspace.validateAgainstSchema<any>(getTaskDataInput(taskMeta, tasks), jsonSchema);
        })
      )
      .toPromise();
  });

  allHooksPromises.push(...promises);

  await Promise.all(allHooksPromises);
}

export interface EntryPointStorage { }

// Used to mimic the `data` object in `EntryPointNode` so we can bind things to an entry point through the pipes
// external to ng-packager.
export const ENTRY_POINT_STORAGE = {
  ENTRY_POINT_DATA: new WeakMap<EntryPointNode, EntryPointStorage>(),
  get(node: EntryPointNode): EntryPointStorage | undefined {
    return this.ENTRY_POINT_DATA.get(node);
  },
  merge(node: EntryPointNode, data: Partial<EntryPointStorage>): void {
    const currentData = this.ENTRY_POINT_DATA.get(node) || {} as any;
    Object.assign(currentData, data);
    this.ENTRY_POINT_DATA.set(node, currentData);
  },
  delete(node: EntryPointNode): boolean {
    return this.ENTRY_POINT_DATA.delete(node);
  }
}

export async function createHooksContext(options: NgPackagrBuilderOptions, context: BuilderContext, host: virtualFs.Host<{}> = new NodeJsSyncHost()): Promise<NgPackagerHooksContext> {
  const registry = new schema.CoreSchemaRegistry();
  registry.addPostTransform(schema.transforms.addUndefinedDefaults);

  const workspace = await experimental.workspace.Workspace.fromPath(
    host,
    normalize(context.workspaceRoot),
    registry,
  );

  const projectName = context.target ? context.target.project : workspace.getDefaultProjectName();

  if (!projectName) {
    throw new Error('Must either have a target from the context or a default project.');
  }

  const projectRoot = resolve(workspace.root, normalize(workspace.getProject(projectName).root));
  const projectSourceRoot = workspace.getProject(projectName).sourceRoot;
  const sourceRoot = projectSourceRoot
    ? resolve(workspace.root, normalize(projectSourceRoot))
    : undefined
  ;

  return {
    logger: context.logger,
    root: workspace.root,
    projectRoot,
    sourceRoot,
    builderContext: context,
    options,
    workspace,
  };
}