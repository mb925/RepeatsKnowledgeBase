import {PluginSpec} from './Spec';
import {applyTransforms, getSuperpositionData, fetch} from './Process';
import {superimposeByIndices} from './Comparison/RmsdTransformByIndices';

export async function process() {
  const pluginSuperposed = LiteMol.Plugin.create({
    target: '#superposed',
    viewportBackground: '#fff',
    layoutState: {
      hideControls: true,
      isExpanded: false
    },
    customSpecification: PluginSpec
  });


  const ids = (document.getElementById('pdbIDs') as HTMLInputElement).value.split(',').map(id => id.trim());

  pluginSuperposed.clear();


  // wrap the process in a task to show progress in the build-in UI
  const task = LiteMol.Bootstrap.Task.create('Transforms', 'Normal', async ctx => {
    await ctx.updateProgress('Downloading data...');
    await fetch(pluginSuperposed, ids);
    await ctx.updateProgress('Creating superposition data...');
    const data = getSuperpositionData(pluginSuperposed);
    await ctx.updateProgress('Finding transforms...');
    const transforms = superimposeByIndices(data);
    await ctx.updateProgress('Finishing...');
    applyTransforms(pluginSuperposed, data, transforms);
  });

  task.run(pluginSuperposed.context);
}


